import React, { useState } from 'react';
import { Wifi, WifiOff, Edit3, Check, X, QrCode, History, Clipboard } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { useDeviceStore } from '../stores/useDeviceStore';
import { useClipboardStore } from '../stores/useClipboardStore';

interface HeaderProps {
  onShowQR: () => void;
  onShowHistory: () => void;
}

export default function Header({ onShowQR, onShowHistory }: HeaderProps) {
  const { myDevice, connected, updateMyName } = useDeviceStore();
  const togglePanel = useClipboardStore((s) => s.togglePanel);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');

  const startEditing = () => {
    setEditName(myDevice?.name || '');
    setEditing(true);
  };

  const saveName = () => {
    if (editName.trim()) {
      updateMyName(editName.trim());
    }
    setEditing(false);
  };

  const cancelEdit = () => setEditing(false);

  return (
    <header className="glass sticky top-0 z-40 px-4 sm:px-6 py-3" id="app-header">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        {/* Logo + Name */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Animated Logo */}
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/30">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
                <path
                  d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight">
              <span className="text-gradient">LocalDrop</span>
            </h1>
            <div className="flex items-center gap-2">
              {editing ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveName()}
                    className="text-xs bg-white/50 dark:bg-white/10 px-2 py-0.5 rounded border border-primary-300 dark:border-primary-600 outline-none w-28"
                    autoFocus
                    maxLength={24}
                  />
                  <button onClick={saveName} className="text-green-500 hover:text-green-400 p-0.5">
                    <Check size={12} />
                  </button>
                  <button onClick={cancelEdit} className="text-red-400 hover:text-red-300 p-0.5">
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={startEditing}
                  className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
                  title="Click to edit your name"
                >
                  <span className="truncate max-w-[120px]">{myDevice?.name || 'Connecting...'}</span>
                  <Edit3 size={10} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Connection Status */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              connected
                ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10'
                : 'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10'
            }`}
            id="connection-status"
          >
            {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span className="hidden sm:inline">{connected ? 'Connected' : 'Offline'}</span>
          </div>

          {/* Clipboard button */}
          <button
            onClick={togglePanel}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-primary-500 dark:hover:text-primary-400 hover:bg-white/50 dark:hover:bg-white/5 transition-all"
            title="Clipboard Share"
            id="clipboard-btn"
          >
            <Clipboard size={18} />
          </button>

          {/* History button */}
          <button
            onClick={onShowHistory}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-primary-500 dark:hover:text-primary-400 hover:bg-white/50 dark:hover:bg-white/5 transition-all"
            title="Transfer History"
            id="history-btn"
          >
            <History size={18} />
          </button>

          {/* QR Code button */}
          <button
            onClick={onShowQR}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-primary-500 dark:hover:text-primary-400 hover:bg-white/50 dark:hover:bg-white/5 transition-all"
            title="Show QR Code"
            id="qr-btn"
          >
            <QrCode size={18} />
          </button>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
