import React from 'react';
import { FileText, Link2, Image, Code2 } from 'lucide-react';
import type { ClipboardContent } from '../types/clipboard';

interface ClipboardPreviewProps {
  content: ClipboardContent;
  compact?: boolean;
}

export default function ClipboardPreview({ content, compact = false }: ClipboardPreviewProps) {
  const maxLength = compact ? 100 : 300;

  switch (content.type) {
    case 'text':
      return (
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
            <FileText size={18} className="text-blue-500" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-blue-500 mb-1">
              Text
            </span>
            <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap break-words line-clamp-4">
              {content.data.length > maxLength
                ? content.data.slice(0, maxLength) + '...'
                : content.data}
            </p>
            {!compact && (
              <p className="text-xs text-gray-400 mt-1">
                {content.data.length} characters · {content.data.split(/\s+/).length} words
              </p>
            )}
          </div>
        </div>
      );

    case 'url':
      return (
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
            <Link2 size={18} className="text-violet-500" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-violet-500 mb-1">
              URL
            </span>
            <a
              href={content.data}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary-500 hover:text-primary-400 underline decoration-primary-300/50 hover:decoration-primary-400 break-all transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {content.data}
            </a>
          </div>
        </div>
      );

    case 'image':
      return (
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
            <Image size={18} className="text-emerald-500" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-emerald-500 mb-1">
              Image
            </span>
            <img
              src={content.data}
              alt="Clipboard image"
              className="mt-1 max-h-32 rounded-lg border border-gray-200 dark:border-white/10 object-contain"
            />
          </div>
        </div>
      );

    case 'html':
      return (
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
            <Code2 size={18} className="text-orange-500" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-orange-500 mb-1">
              Rich Text
            </span>
            <div
              className="text-sm text-gray-700 dark:text-gray-200 prose prose-sm dark:prose-invert max-w-none line-clamp-4"
              dangerouslySetInnerHTML={{
                __html: content.data.length > maxLength
                  ? content.data.slice(0, maxLength) + '...'
                  : content.data,
              }}
            />
            {content.preview && !compact && (
              <p className="text-xs text-gray-400 mt-1 truncate">
                {content.preview}
              </p>
            )}
          </div>
        </div>
      );

    default:
      return null;
  }
}
