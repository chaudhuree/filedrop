import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Upload, ArrowRight } from 'lucide-react';

import Header from './components/Header';
import DeviceGrid from './components/DeviceGrid';
import TransferModal from './components/TransferModal';
import IncomingFileModal from './components/IncomingFileModal';
import ClipboardSharePanel from './components/ClipboardSharePanel';
import IncomingClipboardModal from './components/IncomingClipboardModal';
import ToastSystem from './components/ToastSystem';
import QRCodePanel from './components/QRCodePanel';
import TransferHistory from './components/TransferHistory';
import ContextMenu from './components/ContextMenu';
import NotificationPermissionModal from './components/NotificationPermissionModal';
import ProfileModal from './components/ProfileModal';

import { useDeviceStore } from './stores/useDeviceStore';
import { useTransferStore } from './stores/useTransferStore';
import { useClipboardStore } from './stores/useClipboardStore';
import { useToastStore } from './stores/useToastStore';

import { socketService } from './services/socket';
import { webrtcService } from './services/webrtc';
import { fileTransferService } from './services/fileTransfer';
import { clipboardTransferService } from './services/clipboardTransfer';
import { requestNotificationPermission, showNotification } from './services/notifications';
import { detectClipboardContentType, copyText, copyImage, copyHtml, base64ToBlob } from './services/clipboard';

import { useDeviceIdentity } from './hooks/useDeviceIdentity';
import { useFileDrop } from './hooks/useFileDrop';
import { useWakeLock } from './hooks/useWakeLock';

import type { Device } from './types/device';

export default function App() {
  const deviceIdentity = useDeviceIdentity();
  const dropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isDragging, droppedFiles, clearFiles } = useFileDrop(dropRef);

  useWakeLock();

  const [showQR, setShowQR] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showTransfers, setShowTransfers] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallPWA = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const {
    setMyDevice,
    addPeer,
    removePeer,
    setPeers,
    setConnected,
    selectedPeers,
    peers,
    myDevice,
    selectPeer,
  } = useDeviceStore();

  const { addTransfer, updateProgress, completeTransfer, failTransfer, addIncomingRequest } = useTransferStore();
  const { addIncoming: addIncomingClipboard } = useClipboardStore();
  const addToast = useToastStore((s) => s.addToast);

  // ── Initialize Socket.IO + WebRTC ────────────────────────────────────
  useEffect(() => {
    if (!deviceIdentity) return;

    const socket = socketService.connect();

    socket.on('connect', () => {
      setConnected(true);
      socketService.joinRoom(deviceIdentity);
      setMyDevice(deviceIdentity);

      // Initialize WebRTC
      webrtcService.initialize(deviceIdentity.id);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    // Peer events
    socketService.on('device-info', (data: unknown) => {
      const deviceInfo = data as Device;
      setMyDevice(deviceInfo);
    });

    socketService.on('peers-list', (data: unknown) => {
      setPeers(data as Device[]);
    });

    socketService.on('peer-joined', (data: unknown) => {
      const device = data as Device;
      addPeer(device);
      addToast({
        type: 'info',
        title: `${device.name} joined`,
        message: `${device.os} · ${device.browser}`,
      });
    });

    socketService.on('peer-left', (data: unknown) => {
      const peerId = data as string;
      const peerName = useDeviceStore.getState().peers.get(peerId)?.name || 'A device';
      removePeer(peerId);
      addToast({
        type: 'info',
        title: `${peerName} left`,
      });
    });

    socketService.on('peer-updated', (data: unknown) => {
      const device = data as Device;
      addPeer(device);
    });

    // Show custom notification permission modal (only if not already granted/denied)
    if ('Notification' in window && Notification.permission === 'default') {
      // Small delay so the main UI loads first
      const timer = setTimeout(() => setShowNotifModal(true), 2000);
      return () => {
        clearTimeout(timer);
        socketService.leaveRoom();
        socketService.disconnect();
        webrtcService.destroy();
      };
    }

    return () => {
      socketService.leaveRoom();
      socketService.disconnect();
      webrtcService.destroy();
    };
  }, [deviceIdentity]);

  // ── Set up WebRTC message handlers ───────────────────────────────────
  useEffect(() => {
    // Handle DataChannel messages
    webrtcService.onMessage((peerId, data) => {
      // Try file transfer first
      if (fileTransferService.handleMessage(peerId, data)) return;
      // Then clipboard transfer
      if (clipboardTransferService.handleMessage(peerId, data)) return;
    });

    // File transfer callbacks
    fileTransferService.onIncomingFile((peerId, _, transferId, fileName, fileSize, fileType) => {
      const peer = useDeviceStore.getState().peers.get(peerId);
      addIncomingRequest({
        transferId,
        fileName,
        fileSize,
        fileType,
        peerId,
        peerName: peer?.name || 'Unknown',
        timestamp: Date.now(),
      });

      showNotification('Incoming File', `${peer?.name || 'Someone'} wants to send you ${fileName}`);
    });

    fileTransferService.onProgress((transferId, bytesTransferred, _totalBytes, speed) => {
      updateProgress(transferId, bytesTransferred, speed);
    });

    fileTransferService.onComplete((transferId) => {
      completeTransfer(transferId);
      addToast({ type: 'success', title: 'Transfer complete', message: 'File has been downloaded' });
    });

    fileTransferService.onError((transferId, error) => {
      failTransfer(transferId, error);
      addToast({ type: 'error', title: 'Transfer failed', message: error });
    });

    // Clipboard transfer callbacks
    clipboardTransferService.onIncoming(async (senderId, senderName, contentType, data) => {
      const { autoAccept } = useClipboardStore.getState();

      if (autoAccept) {
        let writeSuccess = false;
        try {
          if (contentType === 'text' || contentType === 'url') {
            writeSuccess = await copyText(data);
          } else if (contentType === 'image') {
            const blob = base64ToBlob(data);
            writeSuccess = await copyImage(blob);
          } else if (contentType === 'html') {
            const plainText = new DOMParser()
              .parseFromString(data, 'text/html')
              .body.textContent || '';
            writeSuccess = await copyHtml(data, plainText);
          }

          if (writeSuccess) {
            localStorage.setItem('localdrop-last-sent-clipboard', data);
            addToast({
              type: 'success',
              title: 'Clipboard auto-accepted',
              message: `From ${senderName}`,
            });
            return;
          }
        } catch (err) {
          console.warn('[Clipboard] Auto-accept write failed, falling back to modal:', err);
        }
      }

      addIncomingClipboard({
        id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        contentType,
        data,
        senderId,
        senderName,
        timestamp: Date.now(),
      });

      showNotification(
        'Clipboard Shared',
        `${senderName} shared ${contentType} with you`
      );
    });

    // Listen for clipboard data arriving via WebSocket relay (fallback path)
    socketService.on('clipboard-relay', (payload: unknown) => {
      const msg = payload as {
        senderId: string;
        senderName: string;
        contentType: string;
        data: string;
      };
      clipboardTransferService.handleRelayMessage(msg);
    });
  }, []);

  // ── Handle dropped files ─────────────────────────────────────────────
  useEffect(() => {
    if (droppedFiles.length === 0) return;

    const targets = selectedPeers.size > 0 ? selectedPeers : null;

    if (!targets || targets.size === 0) {
      // If only one peer exists, auto-select
      const peerList = Array.from(peers.values());
      if (peerList.length === 1) {
        sendFilesToPeers(droppedFiles, new Set([peerList[0].id]));
      } else {
        addToast({
          type: 'warning',
          title: 'Select a device first',
          message: 'Click on a device before dropping files',
        });
      }
    } else {
      sendFilesToPeers(droppedFiles, targets);
    }

    clearFiles();
  }, [droppedFiles]);

  // ── Auto-Send Clipboard on Focus ─────────────────────────────────────
  useEffect(() => {
    const handleFocus = async () => {
      const { autoSend } = useClipboardStore.getState();
      const { selectedPeers, myDevice } = useDeviceStore.getState();
      if (!autoSend || selectedPeers.size === 0 || !myDevice) return;

      try {
        const permission = await navigator.permissions.query({ name: 'clipboard-read' as PermissionName });
        if (permission.state === 'granted') {
          const text = await navigator.clipboard.readText();
          if (text && text.trim()) {
            const lastSent = localStorage.getItem('localdrop-last-sent-clipboard');
            if (text !== lastSent) {
              const contentType = detectClipboardContentType(text);
              let successCount = 0;
              for (const peerId of selectedPeers) {
                const success = await clipboardTransferService.sendClipboard(
                  peerId,
                  contentType,
                  text,
                  myDevice.name,
                  myDevice.id
                );
                if (success) successCount++;
              }

              if (successCount > 0) {
                localStorage.setItem('localdrop-last-sent-clipboard', text);
                addToast({
                  type: 'success',
                  title: 'Clipboard auto-synced',
                  message: `Synced to ${successCount} device${successCount > 1 ? 's' : ''}`,
                });
              }
            }
          }
        }
      } catch (err) {
        console.warn('[Clipboard] Auto-read failed or not allowed:', err);
      }
    };

    window.addEventListener('focus', handleFocus);
    if (document.hasFocus()) {
      handleFocus();
    }
    return () => window.removeEventListener('focus', handleFocus);
  }, [selectedPeers, myDevice]);

  // ── Send files ───────────────────────────────────────────────────────
  const sendFilesToPeers = useCallback(
    async (files: File[], targetPeers: Set<string>) => {
      for (const file of files) {
        for (const peerId of targetPeers) {
          try {
            const peer = peers.get(peerId);
            const transferId = await fileTransferService.sendFile(peerId, peer?.name || '', file);
            addTransfer({
              id: transferId,
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type || 'application/octet-stream',
              peerId,
              peerName: peer?.name || 'Unknown',
              direction: 'outgoing',
              status: 'awaiting-response',
              progress: 0,
              speed: 0,
              eta: 0,
              bytesTransferred: 0,
              startTime: Date.now(),
            });
            setShowTransfers(true);
          } catch (err) {
            addToast({
              type: 'error',
              title: 'Failed to send',
              message: `Could not send ${file.name}`,
            });
          }
        }
      }
    },
    [peers, addTransfer, addToast]
  );

  const handleSendFile = useCallback(
    (deviceId: string) => {
      selectPeer(deviceId);
      fileInputRef.current?.click();
    },
    [selectPeer]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0 && selectedPeers.size > 0) {
        sendFilesToPeers(files, selectedPeers);
      }
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [selectedPeers, sendFilesToPeers]
  );

  const handleSendToSelected = useCallback(() => {
    if (selectedPeers.size === 0) {
      addToast({ type: 'warning', title: 'Select devices first' });
      return;
    }
    fileInputRef.current?.click();
  }, [selectedPeers, addToast]);

  const activeTransferCount = useTransferStore((s) => s.activeTransfers.size);

  return (
    <div
      ref={dropRef}
      className={`min-h-dvh flex flex-col bg-mesh ${isDragging ? 'drop-zone-active' : ''}`}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInput}
        id="file-input"
      />

      <Header
        onShowQR={() => setShowQR(true)}
        onShowHistory={() => setShowHistory(true)}
        onShowProfile={() => setShowProfile(true)}
        onInstallPWA={deferredPrompt ? handleInstallPWA : undefined}
      />

      {/* Main Content */}
      <main className="flex-grow flex flex-col max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        <DeviceGrid onSendFile={handleSendFile} />

        {/* Action Bar */}
        {selectedPeers.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 animate-slide-up" id="action-bar">
            <div className="glass-card rounded-2xl px-5 py-3 flex items-center gap-4 shadow-xl">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                <strong>{selectedPeers.size}</strong> device{selectedPeers.size !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={handleSendToSelected}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white
                  bg-gradient-to-r from-primary-500 to-primary-600 shadow-md shadow-primary-500/30
                  hover:shadow-lg hover:shadow-primary-500/40 transition-all active:scale-[0.97]"
              >
                <Upload size={16} />
                Send Files
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Active transfer FAB */}
        {activeTransferCount > 0 && !showTransfers && (
          <button
            onClick={() => setShowTransfers(true)}
            className="fixed bottom-6 right-6 z-30 w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700
              text-white shadow-xl shadow-primary-500/40 flex items-center justify-center
              hover:scale-105 transition-all animate-bounce-subtle"
            id="transfer-fab"
          >
            <div className="relative">
              <Upload size={22} />
              <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-[10px] font-bold flex items-center justify-center">
                {activeTransferCount}
              </span>
            </div>
          </button>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-gray-400 dark:text-gray-600 mt-auto">
        <p>End-to-end encrypted · Peer-to-peer · No data stored on server</p>
      </footer>

      {/* Modals */}
      <TransferModal isOpen={showTransfers} onClose={() => setShowTransfers(false)} />
      <IncomingFileModal onAccept={() => setShowTransfers(true)} />
      <ClipboardSharePanel />
      <IncomingClipboardModal />
      <QRCodePanel isOpen={showQR} onClose={() => setShowQR(false)} />
      <TransferHistory isOpen={showHistory} onClose={() => setShowHistory(false)} />
      <ContextMenu onSendFile={handleSendFile} />
      <NotificationPermissionModal
        isOpen={showNotifModal}
        onAllow={async () => {
          setShowNotifModal(false);
          await requestNotificationPermission();
        }}
        onDeny={() => setShowNotifModal(false)}
      />
      <ProfileModal isOpen={showProfile} onClose={() => setShowProfile(false)} />
      <ToastSystem />
    </div>
  );
}
