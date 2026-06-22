"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSignaling = setupSignaling;
const devices_1 = require("./devices");
const rooms_1 = require("./rooms");
const socketToDevice = new Map();
const AVAILABLE_AVATARS = [
    'https://res.cloudinary.com/djftsbsuu/image/upload/v1782120125/female_one_kovlkz.png',
    'https://res.cloudinary.com/djftsbsuu/image/upload/v1782120125/female_two_ttbjn8.png',
    'https://res.cloudinary.com/djftsbsuu/image/upload/v1782120125/female_three_jkw6mb.png',
    'https://res.cloudinary.com/djftsbsuu/image/upload/v1782120125/male_one_imn8ct.png',
    'https://res.cloudinary.com/djftsbsuu/image/upload/v1782120125/male_two_h6jdvb.png',
    'https://res.cloudinary.com/djftsbsuu/image/upload/v1782120125/male_three_bfensg.png',
];
function setupSignaling(io) {
    io.on('connection', (socket) => {
        const userAgent = socket.handshake.headers['user-agent'] || '';
        const ip = (0, rooms_1.getClientIP)(socket.handshake.address, socket.handshake.headers['x-forwarded-for']);
        const roomId = (0, rooms_1.getRoomIdFromIP)(ip);
        console.log(`[Signaling] New connection: ${socket.id} from ${ip} → ${roomId}`);
        // ── Join Room ──────────────────────────────────────────────────────────
        socket.on('join-room', (payload) => {
            const { device } = payload;
            // Find unused avatar in the current room
            const existingPeers = (0, rooms_1.getRoomPeers)(roomId);
            const usedAvatars = new Set(existingPeers.map((p) => p.avatar).filter(Boolean));
            let assignedAvatar = device.avatar || '';
            if (!assignedAvatar) {
                for (const avatar of AVAILABLE_AVATARS) {
                    if (!usedAvatars.has(avatar)) {
                        assignedAvatar = avatar;
                        break;
                    }
                }
                // Fallback: If more than 6 devices, pick one based on ID hash
                if (!assignedAvatar) {
                    const devId = device.id || socket.id;
                    let hash = 0;
                    for (let i = 0; i < devId.length; i++) {
                        hash = devId.charCodeAt(i) + ((hash << 5) - hash);
                    }
                    const index = Math.abs(hash) % AVAILABLE_AVATARS.length;
                    assignedAvatar = AVAILABLE_AVATARS[index];
                }
            }
            // Generate server-side defaults if client didn't provide them
            const roomDevice = {
                id: device.id || socket.id,
                name: device.name || (0, devices_1.generateDeviceName)(),
                deviceType: device.deviceType || (0, devices_1.detectDeviceType)(userAgent),
                browser: device.browser || (0, devices_1.detectBrowser)(userAgent),
                os: device.os || (0, devices_1.detectOS)(userAgent),
                colorHash: device.colorHash || (0, devices_1.generateColorHash)(device.id || socket.id),
                roomId,
                joinedAt: Date.now(),
                avatar: assignedAvatar,
            };
            // Track socket → device mapping
            socketToDevice.set(socket.id, { deviceId: roomDevice.id, roomId });
            // Add to room
            (0, rooms_1.addDeviceToRoom)(roomId, roomDevice);
            socket.join(roomId);
            // Send the resolved device info back to the joining client
            socket.emit('device-info', peerToDeviceInfo(roomDevice));
            // Send current peers list to the new device
            const peers = (0, rooms_1.getRoomPeers)(roomId, roomDevice.id);
            socket.emit('peers-list', peers.map(peerToDeviceInfo));
            // Notify other devices in the room
            socket.to(roomId).emit('peer-joined', peerToDeviceInfo(roomDevice));
            console.log(`[Signaling] Device "${roomDevice.name}" (${roomDevice.id}) joined ${roomId}`);
        });
        // ── Update Device Name ───────────────────────────────────────────────────
        socket.on('update-name', (payload) => {
            const mapping = socketToDevice.get(socket.id);
            if (!mapping)
                return;
            const { deviceId, roomId } = mapping;
            const room = (0, rooms_1.getOrCreateRoom)(roomId);
            const device = room.devices.get(deviceId);
            if (device) {
                device.name = payload.name;
                // Notify other devices in the room
                socket.to(roomId).emit('peer-updated', peerToDeviceInfo(device));
                console.log(`[Signaling] Device "${device.id}" updated name to "${payload.name}"`);
            }
        });
        // ── Update Device Avatar ─────────────────────────────────────────────────
        socket.on('update-avatar', (payload) => {
            const mapping = socketToDevice.get(socket.id);
            if (!mapping)
                return;
            const { deviceId, roomId } = mapping;
            const room = (0, rooms_1.getOrCreateRoom)(roomId);
            const device = room.devices.get(deviceId);
            if (device) {
                device.avatar = payload.avatar;
                // Notify other devices in the room
                socket.to(roomId).emit('peer-updated', peerToDeviceInfo(device));
                console.log(`[Signaling] Device "${device.id}" updated avatar to "${payload.avatar}"`);
            }
        });
        // ── WebRTC Signaling Relay ─────────────────────────────────────────────
        socket.on('signal', (payload) => {
            const { to, from, data } = payload;
            // Find the target socket
            const targetSocketId = findSocketByDeviceId(to);
            if (targetSocketId) {
                io.to(targetSocketId).emit('signal', { from, to, data });
            }
        });
        // ── Leave Room ─────────────────────────────────────────────────────────
        socket.on('leave-room', () => {
            handleDisconnect(socket, io);
        });
        // ── Disconnect ─────────────────────────────────────────────────────────
        socket.on('disconnect', (reason) => {
            console.log(`[Signaling] Disconnected: ${socket.id} (${reason})`);
            handleDisconnect(socket, io);
        });
    });
}
function handleDisconnect(socket, io) {
    const mapping = socketToDevice.get(socket.id);
    if (!mapping)
        return;
    const { deviceId, roomId } = mapping;
    (0, rooms_1.removeDeviceFromRoom)(roomId, deviceId);
    socketToDevice.delete(socket.id);
    // Notify remaining peers
    socket.to(roomId).emit('peer-left', deviceId);
    socket.leave(roomId);
    console.log(`[Signaling] Device ${deviceId} left ${roomId}`);
}
function findSocketByDeviceId(deviceId) {
    for (const [socketId, mapping] of socketToDevice) {
        if (mapping.deviceId === deviceId) {
            return socketId;
        }
    }
    return null;
}
function peerToDeviceInfo(device) {
    return {
        id: device.id,
        name: device.name,
        deviceType: device.deviceType,
        browser: device.browser,
        os: device.os,
        colorHash: device.colorHash,
        avatar: device.avatar,
    };
}
//# sourceMappingURL=signaling.js.map