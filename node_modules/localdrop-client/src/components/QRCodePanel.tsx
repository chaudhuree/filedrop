import React, { useEffect, useRef, useState } from 'react';
import { X, QrCode } from 'lucide-react';
import QRCode from 'qrcode';

interface QRCodePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QRCodePanel({ isOpen, onClose }: QRCodePanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const currentUrl = window.location.href;
    setUrl(currentUrl);

    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, currentUrl, {
        width: 240,
        margin: 2,
        color: {
          dark: document.documentElement.classList.contains('dark') ? '#e0e0ff' : '#1a1a2e',
          light: '#00000000',
        },
        errorCorrectionLevel: 'M',
      }).catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fade-in" id="qr-panel">
      <div className="glass-card rounded-2xl w-full max-w-xs p-6 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <QrCode size={18} className="text-primary-500" />
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">Scan to Join</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center">
          <div className="p-4 rounded-2xl bg-white dark:bg-white/10 mb-4">
            <canvas ref={canvasRef} />
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-2">
            Scan this QR code with your phone to open LocalDrop
          </p>

          <div className="w-full p-2 rounded-lg bg-gray-100 dark:bg-white/5">
            <p className="text-xs text-gray-600 dark:text-gray-300 text-center font-mono truncate">
              {url}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
