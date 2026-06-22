import React from 'react';
import { Check, X, Download } from 'lucide-react';
import DeviceAvatar from './DeviceAvatar';
import { useTransferStore } from '../stores/useTransferStore';
import { useDeviceStore } from '../stores/useDeviceStore';
import { fileTransferService } from '../services/fileTransfer';
import { getFileIcon } from '../utils/fileIcons';
import { formatBytes } from '../utils/formatBytes';

export default function IncomingFileModal() {
  const incomingRequests = useTransferStore((s) => s.incomingRequests);
  const removeIncomingRequest = useTransferStore((s) => s.removeIncomingRequest);
  const addTransfer = useTransferStore((s) => s.addTransfer);
  const peers = useDeviceStore((s) => s.peers);

  if (incomingRequests.length === 0) return null;

  const request = incomingRequests[0]; // Show one at a time
  const peer = peers.get(request.peerId);
  const { icon: FileIcon, color } = getFileIcon(request.fileType);

  const handleAccept = () => {
    fileTransferService.acceptFile(request.transferId, request.peerId);
    addTransfer({
      id: request.transferId,
      fileName: request.fileName,
      fileSize: request.fileSize,
      fileType: request.fileType,
      peerId: request.peerId,
      peerName: request.peerName || peer?.name || 'Unknown',
      direction: 'incoming',
      status: 'transferring',
      progress: 0,
      speed: 0,
      eta: 0,
      bytesTransferred: 0,
      startTime: Date.now(),
    });
    removeIncomingRequest(request.transferId);
  };

  const handleDecline = () => {
    fileTransferService.declineFile(request.transferId, request.peerId);
    removeIncomingRequest(request.transferId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fade-in" id="incoming-file-modal">
      <div className="glass-card rounded-2xl w-full max-w-sm p-6 animate-scale-in">
        {/* Sender info */}
        <div className="flex flex-col items-center mb-5">
          {peer && (
            <DeviceAvatar
              deviceType={peer.deviceType}
              colorHash={peer.colorHash}
              name={peer.name}
              size="lg"
            />
          )}
          <p className="mt-3 font-semibold text-gray-800 dark:text-gray-100">
            {peer?.name || 'Unknown Device'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">wants to send you a file</p>
        </div>

        {/* File info */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-white/50 dark:bg-white/5 mb-5">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${color}15` }}
          >
            <FileIcon size={24} style={{ color }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
              {request.fileName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatBytes(request.fileSize)} · {request.fileType.split('/')[1]?.toUpperCase() || 'File'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleDecline}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
              text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/5
              hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
          >
            <X size={16} />
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
              text-white bg-gradient-to-r from-primary-500 to-primary-600
              hover:from-primary-600 hover:to-primary-700 shadow-md shadow-primary-500/30
              transition-all hover:shadow-lg hover:shadow-primary-500/40"
          >
            <Download size={16} />
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
