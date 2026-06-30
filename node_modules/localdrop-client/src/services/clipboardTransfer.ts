import { webrtcService } from './webrtc';
import { socketService } from './socket';
import type { ClipboardContentType } from '../types/clipboard';

/** Maximum payload size (in characters) for WebSocket relay fallback (512 KB) */
const MAX_RELAY_SIZE = 512 * 1024;

export type IncomingClipboardCallback = (
  senderId: string,
  senderName: string,
  contentType: ClipboardContentType,
  data: string
) => void;

interface PendingTransfer {
  transferId: string;
  contentType: string;
  totalChunks: number;
  senderName: string;
  senderId: string;
  chunks: Map<number, string>;
  started: boolean;
  ended: boolean;
}

class ClipboardTransferService {
  private onIncomingCallback: IncomingClipboardCallback | null = null;
  private pendingTransfers: Map<string, PendingTransfer> = new Map();

  onIncoming(cb: IncomingClipboardCallback): void {
    this.onIncomingCallback = cb;
  }

  /**
   * Handle DataChannel messages related to clipboard (WebRTC path)
   */
  handleMessage(peerId: string, message: unknown): boolean {
    if (typeof message !== 'object' || message === null) return false;
    const msg = message as Record<string, unknown>;
    const type = msg.type as string;

    if (type === 'clipboard-data') {
      this.onIncomingCallback?.(
        msg.senderId as string,
        msg.senderName as string,
        msg.contentType as ClipboardContentType,
        msg.data as string
      );
      return true;
    }

    if (type === 'start' || type === 'clipboard-start') {
      const transferId = msg.transferId as string;
      const existing = this.pendingTransfers.get(transferId);
      if (existing) {
        existing.contentType = msg.contentType as string;
        existing.totalChunks = msg.totalChunks as number;
        existing.senderName = msg.senderName as string;
        existing.senderId = msg.senderId as string;
        existing.started = true;
        this.tryComplete(transferId);
      } else {
        this.pendingTransfers.set(transferId, {
          transferId,
          contentType: msg.contentType as string || 'text',
          totalChunks: msg.totalChunks as number || 1,
          senderName: msg.senderName as string || '',
          senderId: msg.senderId as string || '',
          chunks: new Map(),
          started: true,
          ended: false,
        });
      }
      return true;
    }

    if (type === 'chunk' || type === 'clipboard-chunk') {
      const transferId = msg.transferId as string;
      const chunkIndex = msg.chunkIndex as number;
      const data = msg.data as string;

      let transfer = this.pendingTransfers.get(transferId);
      if (!transfer) {
        transfer = {
          transferId,
          contentType: 'text',
          totalChunks: 1,
          senderName: '',
          senderId: '',
          chunks: new Map(),
          started: false,
          ended: false,
        };
        this.pendingTransfers.set(transferId, transfer);
      }
      transfer.chunks.set(chunkIndex, data);
      this.tryComplete(transferId);
      return true;
    }

    if (type === 'end' || type === 'clipboard-end') {
      const transferId = msg.transferId as string;
      let transfer = this.pendingTransfers.get(transferId);
      if (!transfer) {
        transfer = {
          transferId,
          contentType: 'text',
          totalChunks: 1,
          senderName: '',
          senderId: '',
          chunks: new Map(),
          started: false,
          ended: false,
        };
        this.pendingTransfers.set(transferId, transfer);
      }
      transfer.ended = true;
      this.tryComplete(transferId);
      return true;
    }

    return false;
  }

  private tryComplete(transferId: string): void {
    const transfer = this.pendingTransfers.get(transferId);
    if (!transfer) return;

    if (transfer.ended && transfer.started && transfer.chunks.size > 0) {
      const fullData = Array.from({ length: transfer.totalChunks }, (_, i) => 
        transfer.chunks.get(i) || ''
      ).join();
      
      this.onIncomingCallback?.(
        transfer.senderId,
        transfer.senderName,
        transfer.contentType as ClipboardContentType,
        fullData
      );
      this.pendingTransfers.delete(transferId);
    }
  }

  /**
   * Handle incoming clipboard data received via WebSocket relay
   */
  handleRelayMessage(payload: {
    senderId: string;
    senderName: string;
    contentType: string;
    data: string;
  }): void {
    this.onIncomingCallback?.(
      payload.senderId,
      payload.senderName,
      payload.contentType as ClipboardContentType,
      payload.data
    );
  }

  /**
   * Send clipboard content to a peer.
   * Tries WebRTC DataChannel first; falls back to WebSocket relay if WebRTC fails.
   */
  async sendClipboard(
    peerId: string,
    contentType: ClipboardContentType,
    data: string,
    senderName: string,
    senderId: string
  ): Promise<boolean> {
    // Try WebRTC first (peer-to-peer, encrypted)
    const dc = await webrtcService.connectToPeer(peerId);

    if (dc) {
      const sent = webrtcService.sendToPeer(peerId, {
        type: 'clipboard-data',
        contentType,
        data,
        senderName,
        senderId,
      });
      if (sent) {
        console.log(`[ClipboardTransfer] Sent via WebRTC to ${peerId}`);
        return true;
      }
    }

    // Fallback: WebSocket relay via the server
    console.log(`[ClipboardTransfer] WebRTC failed for ${peerId}, falling back to WebSocket relay`);

    // Size guard: don't relay payloads that are too large
    if (data.length > MAX_RELAY_SIZE) {
      console.warn(`[ClipboardTransfer] Payload too large for relay (${data.length} chars), aborting`);
      return false;
    }

    // Check that we're actually connected to the socket
    if (!socketService.connected) {
      console.error('[ClipboardTransfer] WebSocket not connected, cannot relay');
      return false;
    }

    socketService.sendClipboardRelay({
      to: peerId,
      contentType,
      data,
      senderName,
      senderId,
    });

    console.log(`[ClipboardTransfer] Sent via WebSocket relay to ${peerId}`);
    return true;
  }
}

export const clipboardTransferService = new ClipboardTransferService();
