"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const signaling_1 = require("./signaling");
const rooms_1 = require("./rooms");
// Resolve paths that work in both dev (tsx: __dirname=server/src) and prod (node: __dirname=server/dist)
const serverRoot = path_1.default.resolve(__dirname, '..');
const projectRoot = path_1.default.resolve(serverRoot, '..');
dotenv_1.default.config({ path: path_1.default.join(projectRoot, '.env') });
const PORT = parseInt(process.env.PORT || '3000', 10);
const CLIENT_DIST = path_1.default.join(projectRoot, 'client', 'dist');
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
// ── CORS ────────────────────────────────────────────────────────────────────
app.use((0, cors_1.default)({
    origin: process.env.NODE_ENV === 'production' ? false : '*',
}));
// ── Socket.IO ───────────────────────────────────────────────────────────────
const io = new socket_io_1.Server(httpServer, {
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
    const stats = (0, rooms_1.getRoomStats)();
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
app.use(express_1.default.static(CLIENT_DIST));
app.get('*', (_req, res) => {
    res.sendFile(path_1.default.join(CLIENT_DIST, 'index.html'));
});
// ── Signaling Setup ─────────────────────────────────────────────────────────
(0, signaling_1.setupSignaling)(io);
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
//# sourceMappingURL=index.js.map