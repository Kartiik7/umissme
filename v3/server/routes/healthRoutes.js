import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

function getDatabaseState() {
  const state = mongoose.connection.readyState;

  switch (state) {
    case 1:
      return 'connected';
    case 2:
      return 'connecting';
    case 3:
      return 'disconnecting';
    default:
      return 'disconnected';
  }
}

router.get('/', (_req, res) => {
  const dbState = getDatabaseState();
  const isHealthy = dbState === 'connected' || dbState === 'connecting';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    service: 'pinglet-server',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: dbState,
  });
});

// Alias path for explicit health checkup calls.
router.get('/checkup', (_req, res) => {
  const dbState = getDatabaseState();
  const isHealthy = dbState === 'connected' || dbState === 'connecting';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    check: 'health-checkup',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: dbState,
  });
});

export default router;
