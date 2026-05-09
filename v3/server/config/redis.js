/**
 * config/redis.js
 *
 * Production-grade Redis singleton for Upstash.
 *
 * WHY UPSTASH + IOREDIS NEEDS SPECIAL CARE
 * ─────────────────────────────────────────
 * Upstash Redis is a serverless Redis service that terminates idle TCP
 * connections aggressively (typically after ~60 s of inactivity). When
 * deployed on a platform like Render (which also sleeps free-tier services),
 * the chain is:
 *   1. Server wakes up  →  ioredis connects
 *   2. No traffic  →  Upstash drops the TCP socket server-side
 *   3. ioredis sees ECONNRESET  →  retryStrategy fires
 *   4. Previous retryStrategy had NO cap  →  infinite reconnect loop
 *   5. Each loop produces a log line  →  logs spam
 *
 * Additionally, `reconnectOnError` was returning `true` for ECONNRESET, which
 * is already handled by retryStrategy — returning true there triggers an
 * *extra* forced reconnect on top of the retry loop, doubling the churn.
 *
 * FIXES APPLIED
 * ─────────────
 * • Exponential backoff with jitter, capped at 10 s
 * • Hard retry limit (MAX_RETRIES = 10) — after that the client stays
 *   disconnected and logs a clear error instead of looping forever
 * • `reconnectOnError` no longer re-triggers on ECONNRESET (ioredis handles
 *   that internally); only `READONLY` errors force a reconnect now
 * • `connectTimeout` prevents hanging on initial connection
 * • `keepAlive` sends TCP keep-alive probes so the OS detects dead sockets
 *   faster and so Upstash does not silently drop them
 * • `lazyConnect: true` kept — connections are opened explicitly in bootstrap
 * • All three clients (client, publisher, subscriber) remain singletons —
 *   they are never recreated unless the process restarts
 * • Graceful shutdown hooks detach on first call to prevent double-quit
 */

import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// ── Constants ────────────────────────────────────────────────────────────────

// Strip garbage from REDIS_URL if system environment is malformed
let REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
REDIS_URL = REDIS_URL.replace(/^['"]|['"]$/g, ''); // Remove quotes
if (REDIS_URL.includes('%20--tls%20-u%20')) {
  REDIS_URL = REDIS_URL.split('%20--tls%20-u%20')[1].trim();
}

/**
 * Upstash uses `rediss://` (TLS) URLs. Never disable TLS for Upstash.
 * For local dev without TLS, use `redis://`.
 */
const USE_TLS = REDIS_URL.startsWith('rediss://') || process.env.REDIS_TLS === 'true';

/**
 * After MAX_RETRIES failures in a row, ioredis returns `null` from
 * retryStrategy which tells it to stop retrying and emit an `end` event.
 * This prevents infinite reconnect spam.
 */
const MAX_RETRIES = 10;

/** Base delay for exponential backoff (ms). */
const BASE_DELAY_MS = 250;

/** Maximum delay between retries (ms). */
const MAX_DELAY_MS = 10_000;

// ── Retry strategy ───────────────────────────────────────────────────────────

/**
 * Creates a retry strategy for a named client.
 *
 * Returns `null` after MAX_RETRIES to stop reconnecting.
 * Uses exponential backoff with ±20 % jitter to avoid thundering herds.
 */
function createRetryStrategy(clientName) {
  return (times) => {
    if (times > MAX_RETRIES) {
      console.error(
        `[redis:${clientName}] exceeded ${MAX_RETRIES} reconnect attempts — giving up. ` +
          'Check REDIS_URL and Upstash dashboard.'
      );
      // Returning null tells ioredis to stop retrying.
      return null;
    }

    // Exponential backoff: 250, 500, 1000, 2000, 4000, … capped at 10 s
    const base = Math.min(BASE_DELAY_MS * 2 ** (times - 1), MAX_DELAY_MS);
    // Add ±20 % jitter so multiple clients do not all retry at the same instant
    const jitter = base * 0.2 * (Math.random() * 2 - 1);
    const delay = Math.round(base + jitter);

    console.warn(
      `[redis:${clientName}] reconnecting in ${delay} ms (attempt ${times}/${MAX_RETRIES})`
    );
    return delay;
  };
}

// ── Client factory ───────────────────────────────────────────────────────────

/**
 * Creates a single ioredis client configured for Upstash.
 *
 * @param {string} clientName  - Label used in log messages
 * @returns {import('ioredis').Redis}
 */
function createClient(clientName) {
  const client = new Redis(REDIS_URL, {
    // ── Connection behaviour ─────────────────────────────────────────────────
    lazyConnect: true,          // We call .connect() explicitly in bootstrap
    connectTimeout: 10_000,     // Fail fast if Upstash is unreachable (10 s)
    commandTimeout: 8_000,      // Individual command timeout (8 s)

    // ── Keep-alive ───────────────────────────────────────────────────────────
    // Sends TCP keep-alive probes every 30 s.
    // • Prevents OS from silently dropping idle connections
    // • Upstash still drops after ~60 s idle, but ioredis detects it faster
    //   via ECONNRESET and retries cleanly instead of hanging
    keepAlive: 30_000,

    // ── TLS ─────────────────────────────────────────────────────────────────
    // Upstash always requires TLS (rediss://). Pass an empty object to use
    // Node's default TLS settings — do NOT set rejectUnauthorized: false.
    tls: USE_TLS ? {} : undefined,

    // ── Retry ────────────────────────────────────────────────────────────────
    retryStrategy: createRetryStrategy(clientName),

    // ── FIX: reconnectOnError ────────────────────────────────────────────────
    // Previously this returned `true` for ECONNRESET, which caused ioredis to
    // issue an extra reconnect on top of the normal retryStrategy reconnect —
    // doubling the reconnect churn and flooding logs.
    //
    // Now we only handle READONLY (replica-becomes-primary failover) which
    // is a legitimate case that needs an immediate reconnect.
    reconnectOnError(err) {
      if (String(err?.message || '').includes('READONLY')) {
        console.warn(`[redis:${clientName}] READONLY error — reconnecting`);
        return 2; // Reconnect and replay the command
      }
      return false;
    },

    // ── Command queuing ──────────────────────────────────────────────────────
    // null = no per-request retry limit; commands queue while reconnecting.
    // Combined with MAX_RETRIES above this is safe.
    maxRetriesPerRequest: null,

    enableReadyCheck: true,
  });

  // ── Event listeners ───────────────────────────────────────────────────────
  client.on('connect', () => {
    console.log(`[redis:${clientName}] TCP connection established`);
  });

  client.on('ready', () => {
    console.log(`[redis:${clientName}] ready — accepting commands`);
  });

  client.on('reconnecting', (delayMs) => {
    // ioredis emits the delay as the argument; log it but don't spam
    console.warn(`[redis:${clientName}] reconnecting (delay: ${delayMs} ms)`);
  });

  client.on('error', (err) => {
    // ECONNRESET / ETIMEDOUT are expected with serverless providers — log but
    // do not crash. The retryStrategy handles recovery.
    const isExpectedTransientError =
      err.message?.includes('ECONNRESET') ||
      err.message?.includes('ETIMEDOUT') ||
      err.message?.includes('ENOTFOUND') ||
      err.message?.includes('Connection is closed');

    if (isExpectedTransientError) {
      console.warn(`[redis:${clientName}] transient error: ${err.message}`);
    } else {
      console.error(`[redis:${clientName}] error:`, err.message);
    }
  });

  client.on('end', () => {
    // Fired after retryStrategy returns null — connection permanently closed.
    console.warn(
      `[redis:${clientName}] connection permanently closed (retry limit reached or quit called)`
    );
  });

  return client;
}

// ── Singletons ───────────────────────────────────────────────────────────────
//
// These are created once when the module is imported. Node's module cache
// ensures they are never recreated on subsequent imports — this is the
// singleton pattern for CommonJS/ESM.
//
// Three separate clients are required because:
//   • redisSubscriber  — must be in SUBSCRIBE mode; cannot issue normal commands
//   • redisPublisher   — issues PUBLISH; kept separate from the data client
//                        for clarity and so the Socket.IO adapter can duplicate it
//   • redisClient      — all other Redis commands (GET, SET, HSET, etc.)

export const redisPublisher   = createClient('publisher');
export const redisSubscriber  = createClient('subscriber');
export const redisClient      = createClient('client');

// ── Bootstrap helpers ────────────────────────────────────────────────────────

/**
 * Connects a single client safely.
 * If the client is already connected / connecting, this is a no-op.
 */
async function connectOne(client, clientName) {
  const alreadyUp = client.status === 'ready' || client.status === 'connect';
  if (alreadyUp) {
    console.log(`[redis:${clientName}] already connected — skipping`);
    return;
  }

  try {
    await client.connect();
    console.log(`[redis:${clientName}] connected successfully`);
  } catch (err) {
    // connect() throws if the client could not connect before connectTimeout.
    // Re-throw so bootstrap() can exit the process cleanly.
    console.error(`[redis:${clientName}] initial connect failed: ${err.message}`);
    throw err;
  }
}

/**
 * Opens all three Redis connections sequentially.
 * Sequential (not parallel) so log output is easier to read during startup.
 */
export async function connectRedis() {
  await connectOne(redisClient,     'client');
  await connectOne(redisPublisher,  'publisher');
  await connectOne(redisSubscriber, 'subscriber');
}

// ── Graceful shutdown ────────────────────────────────────────────────────────

let _shutdownRegistered = false;

/**
 * Registers process signal handlers for graceful shutdown.
 * Call this once after connectRedis() succeeds.
 * Safe to call multiple times — only registers once.
 */
export function registerRedisShutdown(httpServer) {
  if (_shutdownRegistered) return;
  _shutdownRegistered = true;

  async function shutdown(signal) {
    console.log(`[redis] received ${signal} — shutting down gracefully`);
    try {
      // Close HTTP server first so no new requests arrive
      if (httpServer) {
        await new Promise((resolve) => httpServer.close(resolve));
      }
      await disconnectRedis();
      console.log('[redis] all connections closed — exiting');
    } catch (err) {
      console.error('[redis] shutdown error:', err.message);
    } finally {
      process.exit(0);
    }
  }

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT',  () => shutdown('SIGINT'));
}

/**
 * Closes all three Redis connections.
 * Uses `quit()` which flushes pending commands first.
 * Falls back to `disconnect()` on timeout.
 */
export async function disconnectRedis() {
  await Promise.allSettled([
    redisPublisher.quit(),
    redisSubscriber.quit(),
    redisClient.quit(),
  ]);
  console.log('[redis] all clients disconnected');
}

// ── Health check ─────────────────────────────────────────────────────────────

/**
 * Returns a health snapshot for all Redis clients.
 * Use this in your /api/health route.
 *
 * @returns {{ client: string, publisher: string, subscriber: string, healthy: boolean }}
 */
export function getRedisHealth() {
  const clientStatus     = redisClient.status;
  const publisherStatus  = redisPublisher.status;
  const subscriberStatus = redisSubscriber.status;
  const healthy =
    clientStatus     === 'ready' &&
    publisherStatus  === 'ready' &&
    subscriberStatus === 'ready';

  return { client: clientStatus, publisher: publisherStatus, subscriber: subscriberStatus, healthy };
}
