import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const USE_TLS = REDIS_URL.startsWith('rediss://') || process.env.REDIS_TLS === 'true';

function createRetryStrategy(clientName) {
  return (times) => {
    const delay = Math.min(times * 500, 5000);
    console.warn(`[redis:${clientName}] reconnecting in ${delay}ms (attempt ${times})`);
    return delay;
  };
}

function createClient(clientName) {
  const client = new Redis(REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    tls: USE_TLS ? {} : undefined,
    retryStrategy: createRetryStrategy(clientName),
    reconnectOnError(err) {
      const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
      if (targetErrors.some((code) => String(err?.message || '').includes(code))) {
        console.warn(`[redis:${clientName}] reconnectOnError: ${err.message}`);
        return true;
      }
      return false;
    },
  });

  client.on('connect', () => {
    console.log(`[redis:${clientName}] connected`);
  });

  client.on('ready', () => {
    console.log(`[redis:${clientName}] ready`);
  });

  client.on('reconnecting', () => {
    console.warn(`[redis:${clientName}] reconnecting`);
  });

  client.on('error', (error) => {
    console.error(`[redis:${clientName}] error:`, error.message);
  });

  client.on('end', () => {
    console.warn(`[redis:${clientName}] connection ended`);
  });

  return client;
}

export const redisPublisher = createClient('publisher');
export const redisSubscriber = createClient('subscriber');
export const redisClient = createClient('client');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForClientReady(client, clientName) {
  while (true) {
    try {
      if (client.status === 'ready' || client.status === 'connect') {
        return;
      }

      await client.connect();
      return;
    } catch (error) {
      console.error(`[redis:${clientName}] connect failed: ${error.message}`);
      await sleep(1000);
    }
  }
}

export async function connectRedis() {
  await Promise.all([
    waitForClientReady(redisPublisher, 'publisher'),
    waitForClientReady(redisSubscriber, 'subscriber'),
    waitForClientReady(redisClient, 'client'),
  ]);
}

export async function disconnectRedis() {
  await Promise.allSettled([
    redisPublisher.quit(),
    redisSubscriber.quit(),
    redisClient.quit(),
  ]);
}
