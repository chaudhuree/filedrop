import React, { useCallback } from 'react';
import { X, Send, ClipboardPaste, Trash2 } from 'lucide-react';
import ClipboardPreview from './ClipboardPreview';
import { useClipboardStore } from '../stores/useClipboardStore';
import { useDeviceStore } from '../stores/useDeviceStore';
import { useClipboardPaste } from '../hooks/useClipboardPaste';
import { clipboardTransferService } from '../services/clipboardTransfer';
import { useToastStore } from '../stores/useToastStore';
import { detectClipboardContentType } from '../services/clipboard';

export default function ClipboardSharePanel() {
  const {
    panelOpen,
    setPanel,
    currentContent,
    setContent,
    autoSend,
    autoAccept,
    setAutoSend,
    setAutoAccept,
  } = useClipboardStore();
  const { myDevice, selectedPeers, peers } = useDeviceStore();
  const addToast = useToastStore((s) => s.addToast);

  useClipboardPaste(panelOpen);

  const handleToggleAutoSend = async (checked: boolean) => {
    if (checked) {
      try {
        await navigator.clipboard.readText();
        setAutoSend(true);
        addToast({
          type: 'success',
          title: 'Auto-Send Enabled',
          message: 'Clipboard will automatically sync when you focus the window.',
        });
      } catch (err) {
        addToast({
          type: 'error',
          title: 'Permission Denied',
          message: 'Clipboard read permission is required for Auto-Send.',
        });
        setAutoSend(false);
      }
    } else {
      setAutoSend(false);
    }
  };

  const handleSend = useCallback(async () => {
    if (!currentContent || !myDevice || selectedPeers.size === 0) return;

    let successCount = 0;
    const totalCount = selectedPeers.size;

    for (const peerId of selectedPeers) {
      const success = await clipboardTransferService.sendClipboard(
        peerId,
        currentContent.type,
        currentContent.data,
        myDevice.name,
        myDevice.id
      );
      if (success) successCount++;
    }

    if (successCount === totalCount) {
      addToast({
        type: 'success',
        title: 'Clipboard sent',
        message: `Sent to ${successCount} device${successCount > 1 ? 's' : ''}`,
      });
      setContent(null);
    } else if (successCount > 0) {
      addToast({
        type: 'warning',
        title: 'Partially sent',
        message: `Sent to ${successCount} of ${totalCount} devices. Some devices may be unreachable.`,
      });
      setContent(null);
    } else {
      addToast({
        type: 'error',
        title: 'Failed to send',
        message: 'Could not reach any selected device. Make sure they are still connected.',
      });
    }
  }, [currentContent, myDevice, selectedPeers, addToast, setContent]);

  if (!panelOpen) return null;

  const selectedCount = selectedPeers.size;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center modal-backdrop animate-fade-in" id="clipboard-panel">
      <div className="glass-card rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md sm:mx-4 animate-slide-up max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200/50 dark:border-white/5">
          <div className="flex items-center gap-2">
            <ClipboardPaste size={18} className="text-primary-500" />
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">Clipboard Share</h3>
          </div>
          <button
            onClick={() => setPanel(false)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Paste Zone */}
        <div className="p-5 overflow-y-auto max-h-[calc(85vh-60px)]">
          <div
            className={`
              relative min-h-[120px] rounded-xl border-2 border-dashed p-4
              transition-all duration-200
              ${currentContent && currentContent.type !== 'text' && currentContent.type !== 'url'
                ? 'border-primary-300 dark:border-primary-600 bg-primary-50/50 dark:bg-primary-500/5'
                : 'border-gray-300 dark:border-gray-600 focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-500/50 bg-white/50 dark:bg-white/5'
              }
            `}
          >
            {!currentContent || currentContent.type === 'text' || currentContent.type === 'url' ? (
              <div className="flex flex-col h-full gap-2">
                <textarea
                  placeholder="Type or paste text, URLs here..."
                  className="w-full min-h-[120px] bg-transparent border-0 outline-none resize-none text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  value={currentContent?.data || ''}
                  onChange={(e) => {
                    const text = e.target.value;
                    if (text.trim()) {
                      const contentType = detectClipboardContentType(text);
                      setContent({ type: contentType, data: text });
                    } else {
                      setContent(null);
                    }
                  }}
                  autoFocus
                />
                
                {/* File/Image selection fallback */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200/50 dark:border-white/5">
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    Or paste an image or click to browse
                  </span>
                  <label className="text-xs font-semibold text-primary-500 hover:text-primary-400 cursor-pointer transition-colors">
                    Browse Image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            setContent({
                              type: 'image',
                              data: reader.result as string,
                              size: file.size,
                            });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className="relative">
                <ClipboardPreview content={currentContent} />
                <button
                  onClick={() => setContent(null)}
                  className="absolute top-0 right-0 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                >
                  <Trash2 size={14} className="text-gray-400" />
                </button>
              </div>
            )}
          </div>

          {/* Selected devices info */}
          {selectedCount > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
              Sending to {selectedCount} selected device{selectedCount > 1 ? 's' : ''}:
              {' '}
              {Array.from(selectedPeers)
                .map((id) => peers.get(id)?.name)
                .filter(Boolean)
                .join(', ')}
            </p>
          )}

          {selectedCount === 0 && currentContent && (
            <p className="text-xs text-amber-500 dark:text-amber-400 mt-3">
              ⚠ Select one or more devices first
            </p>
          )}

          {/* Sync Settings Options */}
          <div className="mt-5 pt-4 border-t border-gray-200/50 dark:border-white/5 space-y-4">
            <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Sync Options</h4>
            
            <div className="flex items-center justify-between gap-4">
              <div>
                <label htmlFor="auto-send-toggle" className="text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                  Auto-Send on Focus
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">Syncs local clipboard when you focus this tab</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  id="auto-send-toggle"
                  type="checkbox"
                  checked={autoSend}
                  onChange={(e) => handleToggleAutoSend(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <label htmlFor="auto-accept-toggle" className="text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                  Auto-Accept Clipboard
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">Copies incoming shares directly to clipboard</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  id="auto-accept-toggle"
                  type="checkbox"
                  checked={autoAccept}
                  onChange={(e) => setAutoAccept(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!currentContent || selectedCount === 0}
            className={`
              mt-5 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
              text-sm font-semibold transition-all duration-200
              ${currentContent && selectedCount > 0
                ? 'text-white bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-md shadow-primary-500/30 hover:shadow-lg hover:shadow-primary-500/40 active:scale-[0.98]'
                : 'text-gray-400 bg-gray-100 dark:bg-white/5 cursor-not-allowed'
              }
            `}
          >
            <Send size={16} />
            Send Clipboard
          </button>
        </div>
      </div>
    </div>
  );
}
