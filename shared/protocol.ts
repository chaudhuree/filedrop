// ─── Signaling Messages (via Socket.IO) ─────────────────────────────────────

export interface DeviceInfo {
  id: string;
  name: string;
  deviceType: 'desktop' | 'tablet' | 'phone';
  browser: string;
  os: string;
  colorHash: string;
}

export interface JoinRoomPayload {
  device: DeviceInfo;
}

export interface SignalPayload {
  from: string;
  to: string;
  data: RTCOfferAnswer | RTCIceCandidatePayload;
}

export interface RTCOfferAnswer {
  type: 'offer' | 'answer';
  sdp: string;
}

export interface RTCIceCandidatePayload {
  type: 'ice-candidate';
  candidate: {
    candidate: string;
    sdpMid: string | null;
    sdpMLineIndex: number | null;
    usernameFragment: string | null;
  };
}

// ─── DataChannel Messages (P2P) ─────────────────────────────────────────────

export type DataChannelMessage =
  | FileRequestMessage
  | FileResponseMessage
  | FileChunkMessage
  | FileCompleteMessage
  | FileCancelMessage
  | ClipboardMessage
  | ClipboardAckMessage
  | KeyExchangeMessage;

export interface FileRequestMessage {
  type: 'file-request';
  transferId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  totalChunks: number;
}

export interface FileResponseMessage {
  type: 'file-response';
  transferId: string;
  accepted: boolean;
}

export interface FileChunkMessage {
  type: 'file-chunk';
  transferId: string;
  chunkIndex: number;
  data: string; // base64 encoded
}

export interface FileCompleteMessage {
  type: 'file-complete';
  transferId: string;
  hash: string;
}

export interface FileCancelMessage {
  type: 'file-cancel';
  transferId: string;
}

export type ClipboardContentType = 'text' | 'url' | 'html' | 'image';

export interface ClipboardMessage {
  type: 'clipboard-data';
  contentType: ClipboardContentType;
  data: string; // text/url/html as string, image as base64
  senderName: string;
  senderId: string;
}

export interface ClipboardAckMessage {
  type: 'clipboard-ack';
  senderId: string;
}

export interface KeyExchangeMessage {
  type: 'key-exchange';
  publicKey: string;
}

// ─── Socket.IO Events ───────────────────────────────────────────────────────

export interface ServerToClientEvents {
  'peer-joined': (device: DeviceInfo) => void;
  'peer-left': (peerId: string) => void;
  'peers-list': (peers: DeviceInfo[]) => void;
  'signal': (payload: SignalPayload) => void;
}

export interface ClientToServerEvents {
  'join-room': (payload: JoinRoomPayload) => void;
  'signal': (payload: SignalPayload) => void;
  'leave-room': () => void;
}

// ─── Transfer Types ──────────────────────────────────────────────────────────

export type TransferStatus =
  | 'pending'
  | 'awaiting-response'
  | 'transferring'
  | 'completed'
  | 'cancelled'
  | 'failed';

export type TransferDirection = 'incoming' | 'outgoing';

export interface Transfer {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  peerId: string;
  peerName: string;
  direction: TransferDirection;
  status: TransferStatus;
  progress: number; // 0-100
  speed: number; // bytes per second
  eta: number; // seconds remaining
  bytesTransferred: number;
  startTime: number;
  endTime?: number;
}

export interface ClipboardTransfer {
  id: string;
  contentType: ClipboardContentType;
  data: string;
  senderId: string;
  senderName: string;
  timestamp: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const CHUNK_SIZE = 64 * 1024; // 64KB
export const MAX_MESSAGE_SIZE = 256 * 1024; // 256KB
export const DATACHANNEL_LABEL = 'localdrop';
export const DEFAULT_STUN_SERVERS = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
];
