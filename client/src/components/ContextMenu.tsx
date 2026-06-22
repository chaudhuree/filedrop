import React, { useEffect, useRef } from 'react';
import { Upload, Clipboard } from 'lucide-react';
import { useDeviceStore } from '../stores/useDeviceStore';
import { useToastStore } from '../stores/useToastStore';
import { clipboardTransferService } from '../services/clipboardTransfer';
import { useClipboardStore } from '../stores/useClipboardStore';
import { detectClipboardContentType } from '../services/clipboard';

interface ContextMenuProps {
  onSendFile: (deviceId: string) => void;
}

export default function ContextMenu({ onSendFile }: ContextMenuProps) {
  const { contextMenu, closeContextMenu, peers, myDevice, selectPeer } = useDeviceStore();
  const setPanel = useClipboardStore((s) => s.setPanel);
  const addToast = useToastStore((s) => s.addToast);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (contextMenu.isOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };

    const handleScroll = () => {
      if (contextMenu.isOpen) {
        closeContextMenu();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('contextmenu', handleOutsideClick);
    window.addEventListener('scroll', handleScroll);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('contextmenu', handleOutsideClick);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [contextMenu.isOpen, closeContextMenu]);

  if (!contextMenu.isOpen || !contextMenu.targetDeviceId) return null;

  const targetDevice = peers.get(contextMenu.targetDeviceId);
  if (!targetDevice) return null;

  const handleSendFileClick = () => {
    closeContextMenu();
    onSendFile(contextMenu.targetDeviceId!);
  };

  const handleSendClipboardClick = async () => {
    closeContextMenu();
    
    if (!myDevice || !contextMenu.targetDeviceId) return;
    
    try {
      let clipboardData: { type: 'text' | 'url' | 'html' | 'image'; data: string } | null = null;
      
      try {
        if (navigator.clipboard?.read) {
          const items = await navigator.clipboard.read();
          for (const item of items) {
            let foundImage = false;
            for (const type of item.types) {
              if (type.startsWith('image/')) {
                const blob = await item.getType(type);
                clipboardData = await new Promise((resolve) => {
                  const reader = new FileReader();
                  reader.onload = () => {
                    resolve({
                      type: 'image',
                      data: reader.result as string,
                    });
                  };
                  reader.readAsDataURL(blob);
                });
                foundImage = true;
                break;
              }
            }
            if (foundImage) break;
            
            if (item.types.includes('text/html')) {
              const blob = await item.getType('text/html');
              const text = await blob.text();
              clipboardData = { type: 'html', data: text };
              break;
            }
          }
        }
        
        if (!clipboardData && navigator.clipboard?.readText) {
          const text = await navigator.clipboard.readText();
          if (text && text.trim()) {
            const contentType = detectClipboardContentType(text);
            clipboardData = { type: contentType, data: text };
          }
        }
      } catch (err) {
        console.warn('[Clipboard] Direct read failed or blocked:', err);
      }
      
      if (clipboardData) {
        const success = await clipboardTransferService.sendClipboard(
          contextMenu.targetDeviceId,
          clipboardData.type,
          clipboardData.data,
          myDevice.name,
          myDevice.id
        );
        
        if (success) {
          addToast({
            type: 'success',
            title: 'Clipboard sent directly',
            message: `Sent clipboard ${clipboardData.type} to ${targetDevice.name}`,
          });
          return;
        }
      }
      
      selectPeer(contextMenu.targetDeviceId);
      setPanel(true);
      addToast({
        type: 'info',
        title: 'Opening Clipboard panel',
        message: `Paste or type content to send to ${targetDevice.name}`,
      });
      
    } catch (err) {
      console.error('[Clipboard] Context menu sharing failed:', err);
      addToast({
        type: 'error',
        title: 'Clipboard Share Failed',
        message: 'An error occurred while sharing clipboard.',
      });
    }
  };

  const menuWidth = 180;
  const menuHeight = 90;
  let posX = contextMenu.x;
  let posY = contextMenu.y;

  if (posX + menuWidth > window.innerWidth) {
    posX = window.innerWidth - menuWidth - 10;
  }
  if (posY + menuHeight > window.innerHeight) {
    posY = window.innerHeight - menuHeight - 10;
  }

  return (
    <div
      ref={menuRef}
      style={{ top: `${posY}px`, left: `${posX}px` }}
      className="fixed z-50 w-44 rounded-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border border-gray-200/50 dark:border-white/10 shadow-2xl p-1 animate-scale-in"
    >
      <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider select-none truncate">
        {targetDevice.name}
      </div>
      
      <button
        onClick={handleSendFileClick}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-primary-500 hover:text-white rounded-lg transition-colors text-left font-medium"
      >
        <Upload size={15} />
        Send Files...
      </button>
      
      <button
        onClick={handleSendClipboardClick}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-primary-500 hover:text-white rounded-lg transition-colors text-left font-medium"
      >
        <Clipboard size={15} />
        Send Clipboard
      </button>
    </div>
  );
}
