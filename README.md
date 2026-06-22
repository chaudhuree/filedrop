# 🚀 LocalDrop

**Self-hosted local network file & clipboard sharing** — like AirDrop, but for every device with a browser.

Share files and clipboard content instantly between devices on the same WiFi/LAN network. No accounts, no cloud, no installation — just open a browser.

## ✨ Features

- **🔍 Auto-Discovery** — Devices on the same network find each other automatically
- **📁 File Transfer** — Drag & drop or file picker, supports multi-GB files
- **📋 Clipboard Sharing** — Share text, URLs, images, and rich text between devices
- **🔒 End-to-End Encrypted** — All transfers are peer-to-peer via WebRTC
- **📱 Cross-Platform** — Works on macOS, Windows, Linux, iOS, iPadOS, Android
- **🌙 Dark Mode** — Beautiful dark and light themes
- **📲 QR Code** — Scan to join from mobile devices instantly
- **💾 PWA Support** — Install as a native-like app
- **⚡ Peer-to-Peer** — Files go directly between devices, never through the server
- **🔔 Notifications** — Browser notifications for incoming transfers

## 🏗️ Architecture

```
┌─────────────┐    WebSocket     ┌─────────────┐
│  Device A   │◄──(signaling)──►│   Server    │
│  (Browser)  │                  │  (Node.js)  │
└──────┬──────┘                  └──────┬──────┘
       │                                │
       │  WebRTC DataChannel (P2P)     │
       │  ◄──────────────────────►     │
       │                                │
┌──────┴──────┐    WebSocket     ┌──────┴──────┐
│  Device B   │◄──(signaling)──►│   Server    │
│  (Browser)  │                  │  (Node.js)  │
└─────────────┘                  └─────────────┘
```

The server **only** handles signaling (device discovery + WebRTC negotiation). All file and clipboard data flows directly between devices.

## 🚀 Quick Start

### Using npm

```bash
# Install dependencies
npm install

# Start development mode (both server + client)
npm run dev
```

Open `http://localhost:5173` in your browser. Open the same URL on another device connected to the same network.

### Using Docker

```bash
# Build and run
docker compose up -d

# Or build manually
docker build -t localdrop .
docker run -p 3000:3000 localdrop
```

Open `http://<your-ip>:3000` on any device.

### Production Build

```bash
# Build everything
npm run build

# Start production server
npm start
```

## ⚙️ Configuration

Copy `.env.example` to `.env` and configure:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `STUN_SERVERS` | `stun:stun.l.google.com:19302` | STUN servers (comma-separated) |
| `TURN_SERVER` | *(empty)* | Optional TURN server URL |
| `TURN_USERNAME` | *(empty)* | TURN server username |
| `TURN_PASSWORD` | *(empty)* | TURN server password |

## 📁 Project Structure

```
localdrop/
├── server/              # Node.js + Express + Socket.IO
│   └── src/
│       ├── index.ts     # Entry point
│       ├── signaling.ts # WebRTC signaling relay
│       ├── rooms.ts     # IP-based room management
│       └── devices.ts   # Device name/type detection
├── client/              # React + TypeScript + Vite + Tailwind
│   └── src/
│       ├── components/  # UI components
│       ├── services/    # Socket.IO, WebRTC, transfer, clipboard
│       ├── stores/      # Zustand state management
│       ├── hooks/       # Custom React hooks
│       └── utils/       # Utilities
├── shared/              # Shared protocol types
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## 🌐 Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| File Transfer | ✅ | ✅ | ✅ | ✅ |
| Text Clipboard | ✅ | ✅ | ✅ | ✅ |
| Image Clipboard | ✅ | ⚠️* | ✅ | ✅ |
| URL Clipboard | ✅ | ✅ | ✅ | ✅ |
| WebRTC P2P | ✅ | ✅ | ✅ | ✅ |
| Notifications | ✅ | ✅ | ✅ | ✅ |

*\* Firefox has limited `navigator.clipboard.write()` support for images. Falls back to download.*

## 🔒 Security

- **No server storage** — The server never sees or stores your data
- **P2P transfers** — Files go directly between browsers via WebRTC
- **DTLS encryption** — WebRTC provides built-in transport encryption
- **E2E encryption** — Additional AES-256-GCM encryption layer
- **Ephemeral** — Clipboard data is never persisted after transfer
- **Input validation** — All incoming messages are validated
- **Size limits** — Maximum message sizes enforced

## 📄 License

MIT
