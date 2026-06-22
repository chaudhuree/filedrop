export interface RoomDevice {
    id: string;
    name: string;
    deviceType: 'desktop' | 'tablet' | 'phone';
    browser: string;
    os: string;
    colorHash: string;
    roomId: string;
    joinedAt: number;
}
export interface Room {
    id: string;
    devices: Map<string, RoomDevice>;
}
//# sourceMappingURL=types.d.ts.map