import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Edit3, Check, X, QrCode, History, Clipboard, Menu, Sun, Moon, Monitor } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { useDeviceStore } from '../stores/useDeviceStore';
import { useClipboardStore } from '../stores/useClipboardStore';
import { useThemeStore } from '../stores/useThemeStore';

interface HeaderProps {
  onShowQR: () => void;
  onShowHistory: () => void;
}

export default function Header({ onShowQR, onShowHistory }: HeaderProps) {
  const { myDevice, connected, updateMyName } = useDeviceStore();
  const togglePanel = useClipboardStore((s) => s.togglePanel);
  const { theme, setTheme } = useThemeStore();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

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

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const btn = document.getElementById('mobile-menu-btn');
      const menu = document.getElementById('mobile-menu-dropdown');
      if (
        btn &&
        menu &&
        !btn.contains(e.target as Node) &&
        !menu.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [menuOpen]);

  return (
    <header className="glass sticky top-0 z-40 px-4 sm:px-6 py-3" id="app-header">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 relative">
        {/* Logo + Name */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Custom Logo Image (icon.png) */}
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shadow-lg shadow-primary-500/30">
              <img src="/icon.png" alt="LocalDrop Logo" className="w-full h-full object-cover" />
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

        {/* Actions (Desktop View) */}
        <div className="hidden sm:flex items-center gap-2">
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
            <span>{connected ? 'Connected' : 'Offline'}</span>
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

        {/* Actions (Mobile View) */}
        <div className="flex sm:hidden items-center gap-2">
          {/* Connection Status Icon Only */}
          <div
            className={`flex items-center justify-center p-2 rounded-lg text-xs font-medium transition-all ${
              connected
                ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10'
                : 'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10'
            }`}
            title={connected ? 'Connected' : 'Offline'}
          >
            {connected ? <Wifi size={16} /> : <WifiOff size={16} />}
          </div>

          <button
            id="mobile-menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-white/5 transition-all"
            title="Menu"
          >
            <Menu size={20} />
          </button>
        </div>

        {/* Floating Dropdown Mobile Menu */}
        {menuOpen && (
          <div
            id="mobile-menu-dropdown"
            className="absolute top-14 right-0 z-50 w-48 rounded-xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-gray-200/50 dark:border-white/10 shadow-2xl p-1.5 animate-scale-in"
          >
            <button
              onClick={() => {
                setMenuOpen(false);
                togglePanel();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-primary-500 hover:text-white rounded-lg transition-colors text-left font-medium"
            >
              <Clipboard size={16} />
              Clipboard Share
            </button>

            <button
              onClick={() => {
                setMenuOpen(false);
                onShowHistory();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-primary-500 hover:text-white rounded-lg transition-colors text-left font-medium"
            >
              <History size={16} />
              Transfer History
            </button>

            <button
              onClick={() => {
                setMenuOpen(false);
                onShowQR();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-primary-500 hover:text-white rounded-lg transition-colors text-left font-medium"
            >
              <QrCode size={16} />
              Show QR Code
            </button>

            <div className="border-t border-gray-200/50 dark:border-white/5 my-1" />

            <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider select-none">
              Theme Options
            </div>
            
            <div className="flex items-center justify-around px-2 pb-1.5">
              <button
                onClick={() => setTheme('light')}
                className={`p-1.5 rounded-md transition-colors ${
                  theme === 'light'
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                }`}
                title="Light Theme"
              >
                <Sun size={15} />
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`p-1.5 rounded-md transition-colors ${
                  theme === 'dark'
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                }`}
                title="Dark Theme"
              >
                <Moon size={15} />
              </button>
              <button
                onClick={() => setTheme('system')}
                className={`p-1.5 rounded-md transition-colors ${
                  theme === 'system'
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                }`}
                title="System Preferences"
              >
                <Monitor size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
