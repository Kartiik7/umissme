import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import connectDB from './config/db.js';
import { connectRedis, disconnectRedis, redisPublisher, redisSubscriber, redisClient } from './config/redis.js';
import spaceRoutes from './routes/spaceRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import { REDIS_KEYS } from './pubsub/channels.js';
import { startPubSub } from './pubsub/subscriber.js';
import { setupSocket } from './socket/socket.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_DIST_PATH = path.resolve(__dirname, '../client/dist');
const HAS_CLIENT_DIST = fs.existsSync(CLIENT_DIST_PATH);

function buildAllowedOrigins() {
  const raw = process.env.CLIENT_URL || '';
  const fromEnv = raw
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.startsWith('http'))
    .map((v) => v.replace(/\/+$/, ''));

  // Always allow common local dev ports so websocket handshakes remain stable
  // when Vite falls back from 5173 to 5174.
  const defaults = ['http://localhost:5173', 'http://localhost:5174'];
  return [...new Set([...fromEnv, ...defaults.map((v) => v.replace(/\/+$/, ''))])];
}

const ALLOWED_ORIGINS = buildAllowedOrigins();

function normalizeOrigin(origin) {
  if (!origin) return '';
  return String(origin).trim().replace(/\/+$/, '');
}

function isAllowedOrigin(origin) {
  if (!origin) return true;
  const normalized = normalizeOrigin(origin);
  if (ALLOWED_ORIGINS.includes('*')) return true;
  return ALLOWED_ORIGINS.includes(normalized);
}

// Middleware
app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser tools (e.g. curl, Postman) with no Origin header.
      if (isAllowedOrigin(origin)) return callback(null, true);
      console.warn('[cors] rejected origin:', origin);
      // Reject gracefully — do NOT throw an Error or nodemon will crash.
      return callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use('/api/spaces', spaceRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/health', healthRoutes);

if (HAS_CLIENT_DIST) {
  // Serve built frontend when available (single-host deployment).
  app.use(
    express.static(CLIENT_DIST_PATH, {
      index: false,
      setHeaders(res, resourcePath) {
        if (resourcePath.endsWith('.js') || resourcePath.endsWith('.mjs')) {
          res.setHeader('Content-Type', 'text/javascript; charset=UTF-8');
        }
        if (resourcePath.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css; charset=UTF-8');
        }
        if (resourcePath.endsWith('.wasm')) {
          res.setHeader('Content-Type', 'application/wasm');
        }
      },
    })
  );

  // Optional: quiet browser favicon.ico probes when only favicon.svg exists.
  app.get('/favicon.ico', (_req, res) => {
    res.status(204).end();
  });

  // SPA fallback for non-API routes.
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    return res.sendFile(path.join(CLIENT_DIST_PATH, 'index.html'));
  });
}

// ── Socket.IO ────────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) return callback(null, true);
      console.warn('[socket-cors] rejected origin:', origin);
      return callback(null, false);
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});
app.set('io', io);

const redisAdapterPub = redisClient.duplicate();
const redisAdapterSub = redisClient.duplicate();

async function clearStalePresenceKeys() {
  await redisClient.del(REDIS_KEYS.ONLINE_USERS, REDIS_KEYS.ONLINE_USERS_HASH, REDIS_KEYS.USER_SOCKET_COUNT_HASH);

  let cursor = '0';
  do {
    const [nextCursor, keys] = await redisClient.scan(cursor, 'MATCH', `${REDIS_KEYS.USER_SOCKETS_PREFIX}*`, 'COUNT', 200);
    cursor = nextCursor;
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } while (cursor !== '0');

  cursor = '0';
  do {
    const [nextCursor, keys] = await redisClient.scan(cursor, 'MATCH', `${REDIS_KEYS.SOCKET_USER_PREFIX}*`, 'COUNT', 200);
    cursor = nextCursor;
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } while (cursor !== '0');
}

async function bootstrap() {
  await connectDB();
  await connectRedis();
  await Promise.all([redisAdapterPub.connect(), redisAdapterSub.connect()]);
  app.set('redisPublisher', redisPublisher);
  app.set('redisClient', redisClient);

  io.adapter(createAdapter(redisAdapterPub, redisAdapterSub));
  await clearStalePresenceKeys();

  await startPubSub({
    io,
    redisPublisher,
    redisSubscriber,
    redisClient,
  });

  setupSocket({
    io,
    redisPublisher,
    redisClient,
  });

  httpServer.listen(PORT, () => {
    console.log(`pinglet server running on port ${PORT}`);
  });
}

bootstrap().catch(async (error) => {
  console.error('server bootstrap failed:', error.message);
  await Promise.allSettled([redisAdapterPub.quit(), redisAdapterSub.quit()]);
  await disconnectRedis();
  process.exit(1);
});

const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
if (RENDER_URL) {
  setInterval(() => {
    fetch(`${RENDER_URL}/api/health`).catch(() => {});
  }, 10 * 60 * 1000);
}
