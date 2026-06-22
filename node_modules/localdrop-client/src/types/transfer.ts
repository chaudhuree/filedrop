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
  progress: number;
  speed: number;
  eta: number;
  bytesTransferred: number;
  startTime: number;
  endTime?: number;
}

export interface FileRequest {
  transferId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  peerId: string;
  peerName: string;
  timestamp: number;
}
