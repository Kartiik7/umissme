import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import connectDB from './config/db.js';
import CoupleSpace from './models/CoupleSpace.js';
import Message from './models/Message.js';
import spaceRoutes from './routes/spaceRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import healthRoutes from './routes/healthRoutes.js';

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
    .filter((v) => v.startsWith('http'));

  // Always allow common local dev ports so websocket handshakes remain stable
  // when Vite falls back from 5173 to 5174.
  const defaults = ['http://localhost:5173', 'http://localhost:5174'];
  return [...new Set([...fromEnv, ...defaults])];
}

const ALLOWED_ORIGINS = buildAllowedOrigins();

// Connect to MongoDB
connectDB();

// Middleware
app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser tools (e.g. curl, Postman) with no Origin header.
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
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
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});
app.set('io', io);

// In-memory presence: socketId → { userName, spaceId, lastSeen }
const onlineUsers = {};

function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

async function canJoinSpaceRoom(spaceId, userName) {
  const trimmedSpaceId = String(spaceId || '').trim();
  const trimmedUserName = String(userName || '').trim();

  if (!trimmedSpaceId || !trimmedUserName) {
    return false;
  }

  if (!mongoose.Types.ObjectId.isValid(trimmedSpaceId)) {
    return false;
  }

  const space = await CoupleSpace.findById(trimmedSpaceId)
    .select('friendOneName friendTwoName')
    .lean();

  if (!space) {
    return false;
  }

  const normalizedUserName = normalizeName(trimmedUserName);
  return [space.friendOneName, space.friendTwoName]
    .map((memberName) => normalizeName(memberName))
    .includes(normalizedUserName);
}

async function getPresenceSnapshot(spaceId, excludeUserName) {
  const [space, roomOnline] = await Promise.all([
    CoupleSpace.findById(spaceId)
      .select('friendOneName friendTwoName friendOneLastSeenAt friendTwoLastSeenAt')
      .lean(),
    Promise.resolve(
      [...new Set(
        Object.values(onlineUsers)
          .filter((user) => user.spaceId === spaceId && normalizeName(user.userName) !== normalizeName(excludeUserName))
          .map((user) => user.userName)
      )]
    ),
  ]);

  if (!space) {
    return { online: roomOnline, lastSeen: [] };
  }

  const lastSeen = [
    { userName: space.friendOneName, lastSeen: space.friendOneLastSeenAt },
    { userName: space.friendTwoName, lastSeen: space.friendTwoLastSeenAt },
  ]
    .filter((entry) => normalizeName(entry.userName) !== normalizeName(excludeUserName))
    .map((entry) => ({
      userName: entry.userName,
      lastSeen: entry.lastSeen ? new Date(entry.lastSeen).toISOString() : null,
    }));

  return { online: roomOnline, lastSeen };
}

async function persistLastSeen(spaceId, userName, lastSeenAt) {
  const space = await CoupleSpace.findById(spaceId)
    .select('friendOneName friendTwoName');

  if (!space) return;

  const normalizedUser = normalizeName(userName);
  const update =
    normalizedUser === normalizeName(space.friendOneName)
      ? { friendOneLastSeenAt: lastSeenAt }
      : normalizedUser === normalizeName(space.friendTwoName)
        ? { friendTwoLastSeenAt: lastSeenAt }
        : null;

  if (!update) return;
  await CoupleSpace.findByIdAndUpdate(spaceId, { $set: update });
}

io.on('connection', (socket) => {
  function resolveAuthorizedEventContext(payloadSpaceId, payloadUserName) {
    const socketUser = onlineUsers[socket.id];
    if (!socketUser) return null;

    const requestedSpaceId = String(payloadSpaceId || '').trim();
    const requestedUserName = String(payloadUserName || '').trim();

    if (!requestedSpaceId || !requestedUserName) {
      return null;
    }

    if (!mongoose.Types.ObjectId.isValid(requestedSpaceId)) {
      return null;
    }

    if (requestedSpaceId !== socketUser.spaceId) {
      return null;
    }

    if (normalizeName(requestedUserName) !== normalizeName(socketUser.userName)) {
      return null;
    }

    if (!socket.rooms.has(socketUser.spaceId)) {
      return null;
    }

    return {
      spaceId: socketUser.spaceId,
      userName: socketUser.userName,
    };
  }

  // User joins their space room
  socket.on('join-space', async ({ spaceId, userName }) => {
    let validUser = false;
    try {
      validUser = await canJoinSpaceRoom(spaceId, userName);
    } catch (_error) {
      socket.emit('join-error', { message: 'Join failed. Please retry.' });
      return;
    }

    if (!validUser) {
      socket.emit('join-error', { message: 'Unauthorized room join.' });
      return;
    }

    // Disconnect previous session
    const normalizedName = normalizeName(userName);
    for (const [id, user] of Object.entries(onlineUsers)) {
      if (user.spaceId === spaceId && normalizeName(user.userName) === normalizedName) {
        if (id !== socket.id) {
          io.to(id).emit('session-kicked');
          io.sockets.sockets.get(id)?.disconnect(true);
          delete onlineUsers[id];
        }
      }
    }

    socket.join(spaceId);
    onlineUsers[socket.id] = { userName, spaceId, lastSeen: new Date() };
    socket.emit('joined-space', { spaceId, userName });

    // Tell everyone else in the room this user is online
    socket.to(spaceId).emit('user-online', { userName });

    // Send the joining user the current online members in that room plus stored last-seen data
    const snapshot = await getPresenceSnapshot(spaceId, userName);
    socket.emit('presence-state', snapshot);

    // Keep all clients in the room in sync to avoid stale presence state after reconnects.
    const roomSnapshot = await getPresenceSnapshot(spaceId, '');
    io.to(spaceId).emit('presence-state', roomSnapshot);

    // Mark partner's pending messages as delivered when this user connects.
    const deliveredAt = new Date();
    await Message.updateMany(
      {
        spaceId,
        sender: { $ne: userName },
        delivered: false,
      },
      {
        delivered: true,
        deliveredAt,
      }
    );

    io.to(spaceId).emit('message-delivered', {
      receiver: userName,
      deliveredAt: deliveredAt.toISOString(),
    });
  });

  // Typing events — forwarded to the rest of the room
  socket.on('typing', ({ spaceId, userName }) => {
    const authorized = resolveAuthorizedEventContext(spaceId, userName);
    if (!authorized) return;

    socket.to(authorized.spaceId).emit('user-typing', {
      userName: authorized.userName,
    });
  });

  socket.on('stop-typing', ({ spaceId, userName }) => {
    const authorized = resolveAuthorizedEventContext(spaceId, userName);
    if (!authorized) return;

    socket.to(authorized.spaceId).emit('user-stop-typing', {
      userName: authorized.userName,
    });
  });

  // Message updates — prompt room peers to refresh messages list
  socket.on('message-sent', ({ spaceId, userName, message }) => {
    const authorized = resolveAuthorizedEventContext(spaceId, userName);
    if (!authorized) return;

    if (message) {
      socket.to(authorized.spaceId).emit('message-created', {
        message,
      });
    }

    socket.to(authorized.spaceId).emit('messages-updated', {
      sender: authorized.userName,
    });
  });

  // Read receipts — notify the room that a user has read messages
  socket.on('mark-seen', ({ spaceId, reader }) => {
    const authorized = resolveAuthorizedEventContext(spaceId, reader);
    if (!authorized) return;

    // Broadcast to everyone in the room (including sender so their own ticks update)
    io.to(authorized.spaceId).emit('messages-read', {
      reader: authorized.userName,
    });
  });

  // Disconnect — record last seen and notify room
  socket.on('disconnect', async () => {
    const user = onlineUsers[socket.id];
    if (!user) return;
    const lastSeen = new Date();
    const { userName, spaceId } = user;
    delete onlineUsers[socket.id];

    const stillOnlineElsewhere = Object.values(onlineUsers).some(
      (entry) => entry.spaceId === spaceId && normalizeName(entry.userName) === normalizeName(userName)
    );

    if (stillOnlineElsewhere) return;

    await persistLastSeen(spaceId, userName, lastSeen);
    io.to(spaceId).emit('user-last-seen', {
      userName,
      lastSeen: lastSeen.toISOString(),
    });
  });
});

httpServer.listen(PORT, () => {
  console.log(`pinglet server running on port ${PORT}`);
});

const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
if (RENDER_URL) {
  setInterval(() => {
    fetch(`${RENDER_URL}/api/health`).catch(() => {});
  }, 10 * 60 * 1000);
}
