import { webrtcService } from './webrtc';
import type { ClipboardContentType } from '../types/clipboard';

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
   * Handle DataChannel messages related to clipboard
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
   * Send clipboard content to a peer
   */
  async sendClipboard(
    peerId: string,
    contentType: ClipboardContentType,
    data: string,
    senderName: string,
    senderId: string
  ): Promise<boolean> {
    // Ensure connection
    const dc = await webrtcService.connectToPeer(peerId);
    if (!dc) return false;

    return webrtcService.sendToPeer(peerId, {
      type: 'clipboard-data',
      contentType,
      data,
      senderName,
      senderId,
    });
  }
}

export const clipboardTransferService = new ClipboardTransferService();
