export type ClipboardContentType = 'text' | 'url' | 'html' | 'image';

export interface ClipboardContent {
  type: ClipboardContentType;
  data: string;
  preview?: string;
  size?: number;
}

export interface IncomingClipboard {
  id: string;
  contentType: ClipboardContentType;
  data: string;
  senderId: string;
  senderName: string;
  timestamp: number;
}
