import { webrtcService } from './webrtc';
import { CHUNK_SIZE } from '../utils/constants';

export type TransferProgressCallback = (
  transferId: string,
  bytesTransferred: number,
  totalBytes: number,
  speed: number
) => void;

export type TransferCompleteCallback = (transferId: string) => void;
export type TransferErrorCallback = (transferId: string, error: string) => void;
export type IncomingFileCallback = (
  peerId: string,
  peerName: string,
  transferId: string,
  fileName: string,
  fileSize: number,
  fileType: string
) => void;

interface OutgoingTransfer {
  file: File;
  peerId: string;
  transferId: string;
  offset: number;
  cancelled: boolean;
}

interface IncomingTransfer {
  fileName: string;
  fileSize: number;
  fileType: string;
  chunks: ArrayBuffer[];
  bytesReceived: number;
  cancelled: boolean;
}

class FileTransferService {
  private outgoing: Map<string, OutgoingTransfer> = new Map();
  private incoming: Map<string, IncomingTransfer> = new Map();

  private onProgressCallback: TransferProgressCallback | null = null;
  private onCompleteCallback: TransferCompleteCallback | null = null;
  private onErrorCallback: TransferErrorCallback | null = null;
  private onIncomingFileCallback: IncomingFileCallback | null = null;

  private speedSamples: Map<string, { timestamp: number; bytes: number }[]> = new Map();

  onProgress(cb: TransferProgressCallback): void { this.onProgressCallback = cb; }
  onComplete(cb: TransferCompleteCallback): void { this.onCompleteCallback = cb; }
  onError(cb: TransferErrorCallback): void { this.onErrorCallback = cb; }
  onIncomingFile(cb: IncomingFileCallback): void { this.onIncomingFileCallback = cb; }

  /**
   * Handle incoming DataChannel messages related to file transfer
   */
  handleMessage(peerId: string, message: unknown): boolean {
    if (typeof message !== 'object' || message === null) return false;
    const msg = message as Record<string, unknown>;

    switch (msg.type) {
      case 'file-request':
        this.handleFileRequest(peerId, msg);
        return true;
      case 'file-response':
        this.handleFileResponse(msg);
        return true;
      case 'file-chunk':
        this.handleFileChunk(msg);
        return true;
      case 'file-complete':
        this.handleFileComplete(msg);
        return true;
      case 'file-cancel':
        this.handleFileCancel(msg);
        return true;
      default:
        return false;
    }
  }

  /**
   * Send a file to a peer
   */
  async sendFile(peerId: string, peerName: string, file: File): Promise<string> {
    // Ensure WebRTC connection
    const dc = await webrtcService.connectToPeer(peerId);
    if (!dc) {
      throw new Error('Failed to establish peer connection');
    }

    const transferId = `tf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.outgoing.set(transferId, {
      file,
      peerId,
      transferId,
      offset: 0,
      cancelled: false,
    });

    // Send file request
    webrtcService.sendToPeer(peerId, {
      type: 'file-request',
      transferId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || 'application/octet-stream',
      totalChunks: Math.ceil(file.size / CHUNK_SIZE),
    });

    return transferId;
  }

  /**
   * Accept an incoming file request
   */
  acceptFile(transferId: string, peerId: string): void {
    webrtcService.sendToPeer(peerId, {
      type: 'file-response',
      transferId,
      accepted: true,
    });
  }

  /**
   * Decline an incoming file request
   */
  declineFile(transferId: string, peerId: string): void {
    webrtcService.sendToPeer(peerId, {
      type: 'file-response',
      transferId,
      accepted: false,
    });
    this.incoming.delete(transferId);
  }

  /**
   * Cancel an active transfer
   */
  cancelTransfer(transferId: string, peerId: string): void {
    const outgoing = this.outgoing.get(transferId);
    if (outgoing) {
      outgoing.cancelled = true;
      this.outgoing.delete(transferId);
    }

    const incoming = this.incoming.get(transferId);
    if (incoming) {
      incoming.cancelled = true;
      this.incoming.delete(transferId);
    }

    webrtcService.sendToPeer(peerId, {
      type: 'file-cancel',
      transferId,
    });
  }

  // ── Private Handlers ───────────────────────────────────────────────────

  private handleFileRequest(peerId: string, msg: Record<string, unknown>): void {
    const transferId = msg.transferId as string;
    const fileName = msg.fileName as string;
    const fileSize = msg.fileSize as number;
    const fileType = msg.fileType as string;

    // Prepare incoming transfer state
    this.incoming.set(transferId, {
      fileName,
      fileSize,
      fileType,
      chunks: [],
      bytesReceived: 0,
      cancelled: false,
    });

    // Notify UI — the receiver name is derived from the peer
    this.onIncomingFileCallback?.(
      peerId,
      '', // Will be resolved in the store
      transferId,
      fileName,
      fileSize,
      fileType
    );
  }

  private handleFileResponse(msg: Record<string, unknown>): void {
    const transferId = msg.transferId as string;
    const accepted = msg.accepted as boolean;

    if (accepted) {
      // Start sending chunks
      this.sendChunks(transferId);
    } else {
      this.outgoing.delete(transferId);
      this.onErrorCallback?.(transferId, 'Transfer declined by receiver');
    }
  }

  private async sendChunks(transferId: string): Promise<void> {
    const transfer = this.outgoing.get(transferId);
    if (!transfer || transfer.cancelled) return;

    const { file, peerId } = transfer;
    let offset = transfer.offset;
    let lastSpeedCheck = Date.now();
    let bytesSinceLastCheck = 0;

    while (offset < file.size && !transfer.cancelled) {
      // Flow control: wait for buffer to drain
      const buffered = webrtcService.getBufferedAmount(peerId);
      if (buffered > 1024 * 1024) {
        await new Promise((r) => setTimeout(r, 50));
        continue;
      }

      const end = Math.min(offset + CHUNK_SIZE, file.size);
      const chunk = file.slice(offset, end);
      const arrayBuffer = await chunk.arrayBuffer();

      // Send as binary with a header
      const header = JSON.stringify({
        type: 'file-chunk',
        transferId,
        chunkIndex: Math.floor(offset / CHUNK_SIZE),
        offset,
        size: arrayBuffer.byteLength,
      });

      webrtcService.sendToPeer(peerId, {
        type: 'file-chunk',
        transferId,
        chunkIndex: Math.floor(offset / CHUNK_SIZE),
        data: arrayBufferToBase64(arrayBuffer),
      });

      offset += arrayBuffer.byteLength;
      transfer.offset = offset;
      bytesSinceLastCheck += arrayBuffer.byteLength;

      // Calculate speed every 500ms
      const now = Date.now();
      const elapsed = now - lastSpeedCheck;
      if (elapsed >= 500) {
        const speed = (bytesSinceLastCheck / elapsed) * 1000;
        this.onProgressCallback?.(transferId, offset, file.size, speed);
        lastSpeedCheck = now;
        bytesSinceLastCheck = 0;
      }

      // Yield to event loop periodically
      if (offset % (CHUNK_SIZE * 16) === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    if (!transfer.cancelled && offset >= file.size) {
      // Send completion message
      webrtcService.sendToPeer(peerId, {
        type: 'file-complete',
        transferId,
        hash: '', // Could compute SHA-256 here
      });
      this.onCompleteCallback?.(transferId);
      this.outgoing.delete(transferId);
    }
  }

  private handleFileChunk(msg: Record<string, unknown>): void {
    const transferId = msg.transferId as string;
    const transfer = this.incoming.get(transferId);
    if (!transfer || transfer.cancelled) return;

    const data = msg.data as string;
    const chunk = base64ToArrayBuffer(data);

    transfer.chunks.push(chunk);
    transfer.bytesReceived += chunk.byteLength;

    // Calculate speed
    const speed = this.calculateSpeed(transferId, chunk.byteLength);
    this.onProgressCallback?.(transferId, transfer.bytesReceived, transfer.fileSize, speed);
  }

  private handleFileComplete(msg: Record<string, unknown>): void {
    const transferId = msg.transferId as string;
    const transfer = this.incoming.get(transferId);
    if (!transfer) return;

    // Assemble the file
    const blob = new Blob(transfer.chunks, { type: transfer.fileType });
    downloadBlob(blob, transfer.fileName);

    this.onCompleteCallback?.(transferId);
    this.incoming.delete(transferId);
    this.speedSamples.delete(transferId);
  }

  private handleFileCancel(msg: Record<string, unknown>): void {
    const transferId = msg.transferId as string;

    const outgoing = this.outgoing.get(transferId);
    if (outgoing) {
      outgoing.cancelled = true;
      this.outgoing.delete(transferId);
    }

    const incoming = this.incoming.get(transferId);
    if (incoming) {
      incoming.cancelled = true;
      this.incoming.delete(transferId);
    }

    this.onErrorCallback?.(transferId, 'Transfer cancelled by peer');
  }

  private calculateSpeed(transferId: string, bytes: number): number {
    if (!this.speedSamples.has(transferId)) {
      this.speedSamples.set(transferId, []);
    }
    const samples = this.speedSamples.get(transferId)!;
    const now = Date.now();
    samples.push({ timestamp: now, bytes });

    // Keep last 2 seconds of samples
    const cutoff = now - 2000;
    while (samples.length > 0 && samples[0].timestamp < cutoff) {
      samples.shift();
    }

    if (samples.length < 2) return 0;

    const totalBytes = samples.reduce((sum, s) => sum + s.bytes, 0);
    const elapsed = (samples[samples.length - 1].timestamp - samples[0].timestamp) / 1000;
    return elapsed > 0 ? totalBytes / elapsed : 0;
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export const fileTransferService = new FileTransferService();
