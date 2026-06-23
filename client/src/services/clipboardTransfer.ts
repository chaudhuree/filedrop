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

class ClipboardTransferService {
  private onIncomingCallback: IncomingClipboardCallback | null = null;

  onIncoming(cb: IncomingClipboardCallback): void {
    this.onIncomingCallback = cb;
  }

  /**
   * Handle DataChannel messages related to clipboard (WebRTC path)
   */
  handleMessage(peerId: string, message: unknown): boolean {
    if (typeof message !== 'object' || message === null) return false;
    const msg = message as Record<string, unknown>;

    if (msg.type === 'clipboard-data') {
      this.onIncomingCallback?.(
        msg.senderId as string,
        msg.senderName as string,
        msg.contentType as ClipboardContentType,
        msg.data as string
      );
      return true;
    }

    return false;
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

