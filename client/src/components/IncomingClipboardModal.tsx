import React from 'react';
import { Copy, ExternalLink, X, Download, Image as ImageIcon } from 'lucide-react';
import DeviceAvatar from './DeviceAvatar';
import ClipboardPreview from './ClipboardPreview';
import { useClipboardStore } from '../stores/useClipboardStore';
import { useDeviceStore } from '../stores/useDeviceStore';
import { useToastStore } from '../stores/useToastStore';
import { copyText, copyImage, copyHtml, base64ToBlob, downloadBlob, supportsImageClipboard } from '../services/clipboard';
import type { IncomingClipboard } from '../types/clipboard';

export default function IncomingClipboardModal() {
  const { incomingClipboard, removeIncoming } = useClipboardStore();
  const peers = useDeviceStore((s) => s.peers);
  const addToast = useToastStore((s) => s.addToast);

  if (incomingClipboard.length === 0) return null;

  const item = incomingClipboard[0]; // Show one at a time
  const peer = peers.get(item.senderId);

  const handleCopyText = async () => {
    const success = await copyText(item.data);
    if (success) {
      localStorage.setItem('localdrop-last-sent-clipboard', item.data);
      addToast({ type: 'success', title: 'Copied to clipboard' });
    } else {
      addToast({ type: 'error', title: 'Failed to copy' });
    }
    removeIncoming(item.id);
  };

  const handleCopyUrl = async () => {
    const success = await copyText(item.data);
    if (success) {
      localStorage.setItem('localdrop-last-sent-clipboard', item.data);
      addToast({ type: 'success', title: 'URL copied to clipboard' });
    }
    removeIncoming(item.id);
  };

  const handleOpenUrl = () => {
    window.open(item.data, '_blank', 'noopener,noreferrer');
    removeIncoming(item.id);
  };

  const handleCopyImage = async () => {
    const blob = base64ToBlob(item.data);
    const success = await copyImage(blob);
    if (success) {
      localStorage.setItem('localdrop-last-sent-clipboard', item.data);
      addToast({ type: 'success', title: 'Image copied to clipboard' });
    } else {
      addToast({ type: 'warning', title: 'Image clipboard not supported', message: 'Download the image instead' });
    }
    removeIncoming(item.id);
  };

  const handleDownloadImage = () => {
    const blob = base64ToBlob(item.data);
    downloadBlob(blob, `localdrop-image-${Date.now()}.png`);
    addToast({ type: 'success', title: 'Image downloaded' });
    removeIncoming(item.id);
  };

  const handleCopyHtml = async () => {
    const plainText = new DOMParser()
      .parseFromString(item.data, 'text/html')
      .body.textContent || '';
    const success = await copyHtml(item.data, plainText);
    if (success) {
      localStorage.setItem('localdrop-last-sent-clipboard', item.data);
      addToast({ type: 'success', title: 'Rich text copied to clipboard' });
    }
    removeIncoming(item.id);
  };

  const handleDecline = () => {
    removeIncoming(item.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fade-in" id="incoming-clipboard-modal">
      <div className="glass-card rounded-2xl w-full max-w-sm p-6 animate-scale-in">
        {/* Sender info */}
        <div className="flex flex-col items-center mb-5">
          {peer && (
            <DeviceAvatar
              deviceType={peer.deviceType}
              colorHash={peer.colorHash}
              name={peer.name}
              size="lg"
              avatar={peer.avatar}
            />
          )}
          <p className="mt-3 font-semibold text-gray-800 dark:text-gray-100">
            {item.senderName || peer?.name || 'Unknown'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            shared clipboard content
          </p>
        </div>

        {/* Content preview */}
        <div className="p-4 rounded-xl bg-white/50 dark:bg-white/5 mb-5 max-h-48 overflow-y-auto">
          <ClipboardPreview
            content={{
              type: item.contentType,
              data: item.data,
            }}
          />
        </div>

        {/* Actions based on content type */}
        <div className="flex flex-col gap-2">
          {item.contentType === 'text' && (
            <>
              <button onClick={handleCopyText} className="btn-primary">
                <Copy size={16} /> Copy to Clipboard
              </button>
              <button onClick={handleDecline} className="btn-secondary">
                <X size={16} /> Decline
              </button>
            </>
          )}

          {item.contentType === 'url' && (
            <>
              <button onClick={handleCopyUrl} className="btn-primary">
                <Copy size={16} /> Copy URL
              </button>
              <button onClick={handleOpenUrl} className="btn-accent">
                <ExternalLink size={16} /> Open URL
              </button>
              <button onClick={handleDecline} className="btn-secondary">
                <X size={16} /> Decline
              </button>
            </>
          )}

          {item.contentType === 'image' && (
            <>
              {supportsImageClipboard() && (
                <button onClick={handleCopyImage} className="btn-primary">
                  <ImageIcon size={16} /> Copy Image to Clipboard
                </button>
              )}
              <button onClick={handleDownloadImage} className="btn-accent">
                <Download size={16} /> Download Image
              </button>
              <button onClick={handleDecline} className="btn-secondary">
                <X size={16} /> Decline
              </button>
            </>
          )}

          {item.contentType === 'html' && (
            <>
              <button onClick={handleCopyHtml} className="btn-primary">
                <Copy size={16} /> Copy Rich Text
              </button>
              <button onClick={handleDecline} className="btn-secondary">
                <X size={16} /> Decline
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`
        .btn-primary {
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          padding: 0.625rem 1rem; border-radius: 0.75rem;
          font-size: 0.875rem; font-weight: 600;
          color: white;
          background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
          transition: all 0.2s;
        }
        .btn-primary:hover {
          box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
          transform: translateY(-1px);
        }
        .btn-accent {
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          padding: 0.625rem 1rem; border-radius: 0.75rem;
          font-size: 0.875rem; font-weight: 600;
          color: white;
          background: linear-gradient(135deg, var(--color-accent-500), var(--color-accent-600));
          transition: all 0.2s;
        }
        .btn-accent:hover { transform: translateY(-1px); }
        .btn-secondary {
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          padding: 0.625rem 1rem; border-radius: 0.75rem;
          font-size: 0.875rem; font-weight: 500;
          color: #6b7280; transition: all 0.2s;
        }
        .dark .btn-secondary { color: #9ca3af; }
        .btn-secondary:hover { background: rgba(0,0,0,0.05); }
        .dark .btn-secondary:hover { background: rgba(255,255,255,0.05); }
      `}</style>
    </div>
  );
}
