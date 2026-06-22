import { Room, RoomDevice } from './types';
/**
 * Extract the client's IP address, handling reverse proxies
 */
export declare function getClientIP(remoteAddress: string | undefined, forwardedFor: string | string[] | undefined): string;
/**
 * Generate a room ID from the client's IP subnet.
 * Devices on the same /24 subnet join the same room.
 */
export declare function getRoomIdFromIP(ip: string): string;
/**
 * Get or create a room
 */
export declare function getOrCreateRoom(roomId: string): Room;
/**
 * Add a device to a room
 */
export declare function addDeviceToRoom(roomId: string, device: RoomDevice): void;
/**
 * Remove a device from a room. Cleans up empty rooms.
 */
export declare function removeDeviceFromRoom(roomId: string, deviceId: string): void;
/**
 * Get all devices in a room (excluding a specific device)
 */
export declare function getRoomPeers(roomId: string, excludeId?: string): RoomDevice[];
/**
 * Find which room a device belongs to
 */
export declare function findDeviceRoom(deviceId: string): string | null;
/**
 * Get room stats
 */
export declare function getRoomStats(): {
    rooms: number;
    devices: number;
};
//# sourceMappingURL=rooms.d.ts.map