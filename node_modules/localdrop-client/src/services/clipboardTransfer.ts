import { webrtcService } from './webrtc';
import { socketService } from './socket';
import type { ClipboardContentType } from '../types/clipboard';

const CHUNK_SIZE_CHARS = 64 * 1024; // 64KB characters chunk size

export type IncomingClipboardCallback = (
  senderId: string,
  senderName: string,
  contentType: ClipboardContentType,
  data: string
) => void;

interface IncomingClipboardTransfer {
  transferId: string;
  senderId: string;
  senderName: string;
  contentType: ClipboardContentType;
  totalChunks: number;
  chunks: string[];
  chunksReceived: number;
}

class ClipboardTransferService {
  private onIncomingCallback: IncomingClipboardCallback | null = null;
  private incomingTransfers: Map<string, IncomingClipboardTransfer> = new Map();

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
      // Legacy unchunked path for backward compatibility
      this.onIncomingCallback?.(
        msg.senderId as string,
        msg.senderName as string,
        msg.contentType as ClipboardContentType,
        msg.data as string
      );
      return true;
    }

    if (msg.type === 'clipboard-start') {
      this.handleChunkStart(
        msg.transferId as string,
        msg.senderId as string,
        msg.senderName as string,
        msg.contentType as ClipboardContentType,
        msg.totalChunks as number
      );
      return true;
    }

    if (msg.type === 'clipboard-chunk') {
      this.handleChunkData(
        msg.transferId as string,
        msg.chunkIndex as number,
        msg.data as string
      );
      return true;
    }

    if (msg.type === 'clipboard-end') {
      this.handleChunkEnd(msg.transferId as string);
      return true;
    }

    return false;
  }

  /**
   * Handle incoming clipboard data received via WebSocket relay (fallback path)
   */
  handleRelayMessage(payload: {
    senderId: string;
    senderName: string;
    contentType: string;
    data: string;
  }): void {
    if (payload.contentType === 'chunked-clipboard') {
      try {
        const chunkMsg = JSON.parse(payload.data);
        if (chunkMsg.type === 'start') {
          this.handleChunkStart(
            chunkMsg.transferId,
            chunkMsg.senderId,
            chunkMsg.senderName,
            chunkMsg.contentType,
            chunkMsg.totalChunks
          );
        } else if (chunkMsg.type === 'chunk') {
          this.handleChunkData(
            chunkMsg.transferId,
            chunkMsg.chunkIndex,
            chunkMsg.data
          );
        } else if (chunkMsg.type === 'end') {
          this.handleChunkEnd(chunkMsg.transferId);
        }
      } catch (err) {
        console.error('[ClipboardTransfer] Failed to parse relayed chunk:', err);
      }
      return;
    }

    // Legacy unchunked relay path
    this.onIncomingCallback?.(
      payload.senderId,
      payload.senderName,
      payload.contentType as ClipboardContentType,
      payload.data
    );
  }

  /**
   * Send clipboard content to a peer.
   * Chunks large payloads and sends via WebRTC DataChannel first.
   * Falls back to WebSocket relay if WebRTC fails or is unavailable.
   */
  async sendClipboard(
    peerId: string,
    contentType: ClipboardContentType,
    data: string,
    senderName: string,
    senderId: string
  ): Promise<boolean> {
    const transferId = `cb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const totalChunks = Math.ceil(data.length / CHUNK_SIZE_CHARS);

    // Try WebRTC first (peer-to-peer, encrypted)
    const dc = await webrtcService.connectToPeer(peerId);

    if (dc) {
      try {
        console.log(`[ClipboardTransfer] Initiating WebRTC chunked transfer for ${peerId} (${totalChunks} chunks)`);
        
        // Send start message
        let sent = webrtcService.sendToPeer(peerId, {
          type: 'clipboard-start',
          transferId,
          contentType,
          totalChunks,
          senderName,
          senderId,
        });
        if (!sent) throw new Error('Failed to send start message');

        // Send chunks
        for (let i = 0; i < totalChunks; i++) {
          // Flow control: wait for WebRTC buffer to drain
          while (webrtcService.getBufferedAmount(peerId) > 128 * 1024) {
            await new Promise((resolve) => setTimeout(resolve, 50));
          }

          const startIdx = i * CHUNK_SIZE_CHARS;
          const chunkData = data.substring(startIdx, startIdx + CHUNK_SIZE_CHARS);

          sent = webrtcService.sendToPeer(peerId, {
            type: 'clipboard-chunk',
            transferId,
            chunkIndex: i,
            data: chunkData,
          });
          if (!sent) throw new Error(`Failed to send chunk ${i}`);
        }

        // Send end message
        sent = webrtcService.sendToPeer(peerId, {
          type: 'clipboard-end',
          transferId,
        });
        if (!sent) throw new Error('Failed to send end message');

        console.log(`[ClipboardTransfer] Sent via WebRTC to ${peerId}`);
        return true;
      } catch (err: any) {
        console.warn(`[ClipboardTransfer] WebRTC chunked transfer failed for ${peerId}: ${err.message}. Falling back to WebSocket relay.`);
      }
    }

    // Fallback: WebSocket relay via the server
    console.log(`[ClipboardTransfer] WebRTC failed for ${peerId}, falling back to WebSocket relay`);

    if (!socketService.connected) {
      console.error('[ClipboardTransfer] WebSocket not connected, cannot relay');
      return false;
    }

    try {
      // Send start message via relay
      socketService.sendClipboardRelay({
        to: peerId,
        contentType: 'chunked-clipboard',
        data: JSON.stringify({
          type: 'start',
          transferId,
          contentType,
          totalChunks,
          senderName,
          senderId,
        }),
        senderName,
        senderId,
      });

      // Send chunks via relay
      for (let i = 0; i < totalChunks; i++) {
        const startIdx = i * CHUNK_SIZE_CHARS;
        const chunkData = data.substring(startIdx, startIdx + CHUNK_SIZE_CHARS);

        socketService.sendClipboardRelay({
          to: peerId,
          contentType: 'chunked-clipboard',
          data: JSON.stringify({
            type: 'chunk',
            transferId,
            chunkIndex: i,
            data: chunkData,
          }),
          senderName,
          senderId,
        });

        // Yield execution briefly every few chunks to prevent blocking event loop and network congestion
        if (i % 8 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }

      // Send end message via relay
      socketService.sendClipboardRelay({
        to: peerId,
        contentType: 'chunked-clipboard',
        data: JSON.stringify({
          type: 'end',
          transferId,
        }),
        senderName,
        senderId,
      });

      console.log(`[ClipboardTransfer] Sent via WebSocket relay to ${peerId}`);
      return true;
    } catch (err: any) {
      console.error('[ClipboardTransfer] WebSocket relay failed:', err);
      return false;
    }
  }

  private handleChunkStart(
    transferId: string,
    senderId: string,
    senderName: string,
    contentType: ClipboardContentType,
    totalChunks: number
  ) {
    this.incomingTransfers.set(transferId, {
      transferId,
      senderId,
      senderName,
      contentType,
      totalChunks,
      chunks: new Array(totalChunks),
      chunksReceived: 0,
    });
  }

  private handleChunkData(transferId: string, chunkIndex: number, data: string) {
    const transfer = this.incomingTransfers.get(transferId);
    if (!transfer) return;

    if (transfer.chunks[chunkIndex] === undefined) {
      transfer.chunks[chunkIndex] = data;
      transfer.chunksReceived++;
    }
  }

  private handleChunkEnd(transferId: string) {
    const transfer = this.incomingTransfers.get(transferId);
    if (!transfer) return;

    const allReceived = transfer.chunks.every((c) => c !== undefined);
    if (allReceived) {
      const fullData = transfer.chunks.join('');
      this.onIncomingCallback?.(
        transfer.senderId,
        transfer.senderName,
        transfer.contentType,
        fullData
      );
    } else {
      console.error(`[ClipboardTransfer] Transfer ${transferId} completed but some chunks were missing!`);
    }
    this.incomingTransfers.delete(transferId);
  }
}

export const clipboardTransferService = new ClipboardTransferService();

