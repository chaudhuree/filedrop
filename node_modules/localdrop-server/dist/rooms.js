"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClientIP = getClientIP;
exports.getRoomIdFromIP = getRoomIdFromIP;
exports.getOrCreateRoom = getOrCreateRoom;
exports.addDeviceToRoom = addDeviceToRoom;
exports.removeDeviceFromRoom = removeDeviceFromRoom;
exports.getRoomPeers = getRoomPeers;
exports.findDeviceRoom = findDeviceRoom;
exports.getRoomStats = getRoomStats;
const rooms = new Map();
/**
 * Extract the client's IP address, handling reverse proxies
 */
function getClientIP(remoteAddress, forwardedFor) {
    if (forwardedFor) {
        const forwarded = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
        return forwarded.split(',')[0].trim();
    }
    return remoteAddress || '127.0.0.1';
}
/**
 * Generate a room ID from the client's IP subnet.
 * Devices on the same /24 subnet join the same room.
 */
function getRoomIdFromIP(ip) {
    // Handle IPv6-mapped IPv4
    const cleanIP = ip.replace('::ffff:', '');
    // Handle localhost
    if (cleanIP === '127.0.0.1' || cleanIP === '::1' || cleanIP === '1') {
        return 'room-localhost';
    }
    // IPv4: use first 3 octets
    const ipv4Match = cleanIP.match(/^(\d+\.\d+\.\d+)\.\d+$/);
    if (ipv4Match) {
        return `room-${ipv4Match[1].replace(/\./g, '-')}`;
    }
    // IPv6: use first 4 groups
    const ipv6Parts = cleanIP.split(':');
    if (ipv6Parts.length >= 4) {
        return `room-${ipv6Parts.slice(0, 4).join('-')}`;
    }
    // Fallback
    return 'room-default';
}
/**
 * Get or create a room
 */
function getOrCreateRoom(roomId) {
    let room = rooms.get(roomId);
    if (!room) {
        room = { id: roomId, devices: new Map() };
        rooms.set(roomId, room);
    }
    return room;
}
/**
 * Add a device to a room
 */
function addDeviceToRoom(roomId, device) {
    const room = getOrCreateRoom(roomId);
    room.devices.set(device.id, device);
}
/**
 * Remove a device from a room. Cleans up empty rooms.
 */
function removeDeviceFromRoom(roomId, deviceId) {
    const room = rooms.get(roomId);
    if (!room)
        return;
    room.devices.delete(deviceId);
    if (room.devices.size === 0) {
        rooms.delete(roomId);
    }
}
/**
 * Get all devices in a room (excluding a specific device)
 */
function getRoomPeers(roomId, excludeId) {
    const room = rooms.get(roomId);
    if (!room)
        return [];
    const peers = [];
    room.devices.forEach((device) => {
        if (device.id !== excludeId) {
            peers.push(device);
        }
    });
    return peers;
}
/**
 * Find which room a device belongs to
 */
function findDeviceRoom(deviceId) {
    for (const [roomId, room] of rooms) {
        if (room.devices.has(deviceId)) {
            return roomId;
        }
    }
    return null;
}
/**
 * Get room stats
 */
function getRoomStats() {
    let totalDevices = 0;
    rooms.forEach((room) => {
        totalDevices += room.devices.size;
    });
    return { rooms: rooms.size, devices: totalDevices };
}
//# sourceMappingURL=rooms.js.map