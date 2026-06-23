import { Server, Socket } from 'socket.io';
import { RoomDevice } from './types';
import {
  generateDeviceName,
  detectDeviceType,
  detectBrowser,
  detectOS,
  generateColorHash,
} from './devices';
import {
  getClientIP,
  getRoomIdFromIP,
  addDeviceToRoom,
  removeDeviceFromRoom,
  getOrCreateRoom,
  getRoomPeers,
  findDeviceRoom,
} from './rooms';

interface JoinPayload {
  device: {
    id: string;
    name: string;
    deviceType: 'desktop' | 'tablet' | 'phone';
    browser: string;
    os: string;
    colorHash: string;
    avatar?: string;
  };
}

interface SignalPayload {
  from: string;
  to: string;
  data: unknown;
}

const socketToDevice = new Map<string, { deviceId: string; roomId: string }>();

const AVAILABLE_AVATARS = [
  'https://res.cloudinary.com/djftsbsuu/image/upload/v1782120125/female_one_kovlkz.png',
  'https://res.cloudinary.com/djftsbsuu/image/upload/v1782120125/female_two_ttbjn8.png',
  'https://res.cloudinary.com/djftsbsuu/image/upload/v1782120125/female_three_jkw6mb.png',
  'https://res.cloudinary.com/djftsbsuu/image/upload/v1782120125/male_one_imn8ct.png',
  'https://res.cloudinary.com/djftsbsuu/image/upload/v1782120125/male_two_h6jdvb.png',
  'https://res.cloudinary.com/djftsbsuu/image/upload/v1782120125/male_three_bfensg.png',
];

export function setupSignaling(io: Server): void {
  io.on('connection', (socket: Socket) => {
    const userAgent = socket.handshake.headers['user-agent'] || '';
    const ip = getClientIP(
      socket.handshake.address,
      socket.handshake.headers['x-forwarded-for']
    );
    const roomId = getRoomIdFromIP(ip);

    console.log(`[Signaling] New connection: ${socket.id} from ${ip} → ${roomId}`);

    // ── Join Room ──────────────────────────────────────────────────────────
    socket.on('join-room', (payload: JoinPayload) => {
      const { device } = payload;

      // Find unused avatar in the current room
      const existingPeers = getRoomPeers(roomId);
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
      const roomDevice: RoomDevice = {
        id: device.id || socket.id,
        name: device.name || generateDeviceName(),
        deviceType: device.deviceType || detectDeviceType(userAgent),
        browser: device.browser || detectBrowser(userAgent),
        os: device.os || detectOS(userAgent),
        colorHash: device.colorHash || generateColorHash(device.id || socket.id),
        roomId,
        joinedAt: Date.now(),
        avatar: assignedAvatar,
      };

      // Track socket → device mapping
      socketToDevice.set(socket.id, { deviceId: roomDevice.id, roomId });

      // Add to room
      addDeviceToRoom(roomId, roomDevice);
      socket.join(roomId);

      // Send the resolved device info back to the joining client
      socket.emit('device-info', peerToDeviceInfo(roomDevice));

      // Send current peers list to the new device
      const peers = getRoomPeers(roomId, roomDevice.id);
      socket.emit('peers-list', peers.map(peerToDeviceInfo));

      // Notify other devices in the room
      socket.to(roomId).emit('peer-joined', peerToDeviceInfo(roomDevice));

      console.log(`[Signaling] Device "${roomDevice.name}" (${roomDevice.id}) joined ${roomId}`);
    });

    // ── Update Device Name ───────────────────────────────────────────────────
    socket.on('update-name', (payload: { name: string }) => {
      const mapping = socketToDevice.get(socket.id);
      if (!mapping) return;

      const { deviceId, roomId } = mapping;
      const room = getOrCreateRoom(roomId);
      const device = room.devices.get(deviceId);

      if (device) {
        device.name = payload.name;
        // Notify other devices in the room
        socket.to(roomId).emit('peer-updated', peerToDeviceInfo(device));
        console.log(`[Signaling] Device "${device.id}" updated name to "${payload.name}"`);
      }
    });

    // ── Update Device Avatar ─────────────────────────────────────────────────
    socket.on('update-avatar', (payload: { avatar: string }) => {
      const mapping = socketToDevice.get(socket.id);
      if (!mapping) return;

      const { deviceId, roomId } = mapping;
      const room = getOrCreateRoom(roomId);
      const device = room.devices.get(deviceId);

      if (device) {
        device.avatar = payload.avatar;
        // Notify other devices in the room
        socket.to(roomId).emit('peer-updated', peerToDeviceInfo(device));
        console.log(`[Signaling] Device "${device.id}" updated avatar to "${payload.avatar}"`);
      }
    });

    // ── WebRTC Signaling Relay ─────────────────────────────────────────────
    socket.on('signal', (payload: SignalPayload) => {
      const { to, from, data } = payload;

      // Find the target socket
      const targetSocketId = findSocketByDeviceId(to);
      if (targetSocketId) {
        io.to(targetSocketId).emit('signal', { from, to, data });
      }
    });

    // ── Clipboard Relay (WebSocket fallback for when WebRTC fails) ────────
    socket.on('clipboard-relay', (payload: {
      to: string;
      contentType: string;
      data: string;
      senderName: string;
      senderId: string;
    }) => {
      const { to, contentType, data, senderName, senderId } = payload;

      // Size guard: reject payloads over 512 KB to prevent abuse
      if (data.length > 512 * 1024) {
        console.warn(`[Signaling] clipboard-relay rejected: payload too large (${data.length} bytes) from ${senderId}`);
        return;
      }

      const targetSocketId = findSocketByDeviceId(to);
      if (targetSocketId) {
        io.to(targetSocketId).emit('clipboard-relay', {
          contentType,
          data,
          senderName,
          senderId,
        });
        console.log(`[Signaling] Relayed clipboard (${contentType}) from ${senderId} to ${to}`);
      } else {
        console.warn(`[Signaling] clipboard-relay: target device ${to} not found`);
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

function handleDisconnect(socket: Socket, io: Server): void {
  const mapping = socketToDevice.get(socket.id);
  if (!mapping) return;

  const { deviceId, roomId } = mapping;

  removeDeviceFromRoom(roomId, deviceId);
  socketToDevice.delete(socket.id);

  // Notify remaining peers
  socket.to(roomId).emit('peer-left', deviceId);
  socket.leave(roomId);

  console.log(`[Signaling] Device ${deviceId} left ${roomId}`);
}

function findSocketByDeviceId(deviceId: string): string | null {
  for (const [socketId, mapping] of socketToDevice) {
    if (mapping.deviceId === deviceId) {
      return socketId;
    }
  }
  return null;
}

function peerToDeviceInfo(device: RoomDevice) {
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
