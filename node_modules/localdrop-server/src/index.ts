import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { setupSignaling } from './signaling';
import { getRoomStats } from './rooms';

// Resolve paths that work in both dev (tsx: __dirname=server/src) and prod (node: __dirname=server/dist)
const serverRoot = path.resolve(__dirname, '..');
const projectRoot = path.resolve(serverRoot, '..');

dotenv.config({ path: path.join(projectRoot, '.env') });

const PORT = parseInt(process.env.PORT || '3000', 10);
const CLIENT_DIST = path.join(projectRoot, 'client', 'dist');

const app = express();
const httpServer = createServer(app);

// ── CORS ────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : '*',
}));

// ── Socket.IO ───────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : '*',
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 1e6, // 1MB max for signaling messages
  pingTimeout: 30000,
  pingInterval: 10000,
});

// ── API Routes ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  const stats = getRoomStats();
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    ...stats,
  });
});

app.get('/api/config', (_req, res) => {
  res.json({
    stunServers: (process.env.STUN_SERVERS || 'stun:stun.l.google.com:19302')
      .split(',')
      .map((s) => s.trim()),
    turnServer: process.env.TURN_SERVER || null,
    turnUsername: process.env.TURN_USERNAME || null,
    turnPassword: process.env.TURN_PASSWORD || null,
  });
});

// ── Serve Client (Production) ───────────────────────────────────────────────
app.use(express.static(CLIENT_DIST));
app.get('*', (_req, res) => {
  res.sendFile(path.join(CLIENT_DIST, 'index.html'));
});

// ── Signaling Setup ─────────────────────────────────────────────────────────
setupSignaling(io);

// ── Start Server ────────────────────────────────────────────────────────────
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════╗');
  console.log('  ║                                          ║');
  console.log('  ║   🚀  LocalDrop Server Running           ║');
  console.log(`  ║   📡  Port: ${String(PORT).padEnd(28)}║`);
  console.log('  ║                                          ║');
  console.log('  ║   Open on any device in your network:    ║');
  console.log(`  ║   http://localhost:${PORT}                  ║`);
  console.log('  ║                                          ║');
  console.log('  ╚══════════════════════════════════════════╝');
  console.log('');
});

// ── Graceful Shutdown ───────────────────────────────────────────────────────
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down...');
  io.close();
  httpServer.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[Server] SIGINT received, shutting down...');
  io.close();
  httpServer.close(() => {
    process.exit(0);
  });
});
