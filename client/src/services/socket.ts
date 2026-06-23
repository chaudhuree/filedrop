import { io, Socket } from 'socket.io-client';
import type { Device } from '../types/device';

export interface SignalPayload {
  from: string;
  to: string;
  data: unknown;
}

type EventCallback = (...args: unknown[]) => void;

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();

  connect(): Socket {
    if (this.socket?.connected) return this.socket;

    const url = import.meta.env.PROD
      ? (import.meta.env.VITE_WS_URL as string || window.location.origin)
      : '';

    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    this.socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
    });

    // Re-attach stored listeners
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach((cb) => {
        this.socket?.on(event, cb as (...args: unknown[]) => void);
      });
    });

    return this.socket;
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  joinRoom(device: Device): void {
    this.socket?.emit('join-room', { device });
  }

  leaveRoom(): void {
    this.socket?.emit('leave-room');
  }

  sendSignal(payload: SignalPayload): void {
    this.socket?.emit('signal', payload);
  }

  updateName(name: string): void {
    this.socket?.emit('update-name', { name });
  }

  updateAvatar(avatar: string): void {
    this.socket?.emit('update-avatar', { avatar });
  }

  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    this.socket?.on(event, callback);
  }

  off(event: string, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
    this.socket?.off(event, callback);
  }

  /**
   * Send clipboard data via WebSocket relay (fallback when WebRTC fails).
   */
  sendClipboardRelay(payload: {
    to: string;
    contentType: string;
    data: string;
    senderName: string;
    senderId: string;
  }): void {
    this.socket?.emit('clipboard-relay', payload);
  }

  get connected(): boolean {
    return this.socket?.connected ?? false;
  }

  get id(): string | undefined {
    return this.socket?.id;
  }
}

export const socketService = new SocketService();
