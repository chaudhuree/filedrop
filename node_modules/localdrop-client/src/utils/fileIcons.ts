import {
  FileText,
  Image,
  Film,
  Music,
  Archive,
  Code,
  File,
  FileSpreadsheet,
  Presentation,
  type LucideIcon,
} from 'lucide-react';

interface FileIconInfo {
  icon: LucideIcon;
  color: string;
}

const mimeToIcon: Record<string, FileIconInfo> = {
  'image': { icon: Image, color: '#10b981' },
  'video': { icon: Film, color: '#8b5cf6' },
  'audio': { icon: Music, color: '#f59e0b' },
  'text': { icon: FileText, color: '#3b82f6' },
  'application/pdf': { icon: FileText, color: '#ef4444' },
  'application/zip': { icon: Archive, color: '#6b7280' },
  'application/x-rar': { icon: Archive, color: '#6b7280' },
  'application/gzip': { icon: Archive, color: '#6b7280' },
  'application/json': { icon: Code, color: '#f59e0b' },
  'application/javascript': { icon: Code, color: '#f59e0b' },
  'text/html': { icon: Code, color: '#ef4444' },
  'text/css': { icon: Code, color: '#3b82f6' },
  'application/vnd.ms-excel': { icon: FileSpreadsheet, color: '#10b981' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: FileSpreadsheet, color: '#10b981' },
  'application/vnd.ms-powerpoint': { icon: Presentation, color: '#ef4444' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { icon: Presentation, color: '#ef4444' },
};

export function getFileIcon(mimeType: string): FileIconInfo {
  // Check exact match first
  if (mimeToIcon[mimeType]) return mimeToIcon[mimeType];

  // Check prefix match
  const prefix = mimeType.split('/')[0];
  if (mimeToIcon[prefix]) return mimeToIcon[prefix];

  return { icon: File, color: '#6b7280' };
}
