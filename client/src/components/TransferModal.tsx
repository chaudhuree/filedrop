import React from 'react';
import { X, ArrowUpRight, ArrowDownLeft, Trash2 } from 'lucide-react';
import TransferProgress from './TransferProgress';
import { useTransferStore } from '../stores/useTransferStore';
import { useDeviceStore } from '../stores/useDeviceStore';
import { fileTransferService } from '../services/fileTransfer';
import { getFileIcon } from '../utils/fileIcons';
import { formatBytes } from '../utils/formatBytes';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TransferModal({ isOpen, onClose }: TransferModalProps) {
  const activeTransfers = useTransferStore((s) => s.activeTransfers);
  const cancelTransferInStore = useTransferStore((s) => s.cancelTransfer);
  const transfers = Array.from(activeTransfers.values());

  if (!isOpen || transfers.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 modal-backdrop animate-fade-in" id="transfer-modal">
      <div className="glass-card rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200/50 dark:border-white/5">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">
            Active Transfers ({transfers.length})
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Transfer list */}
        <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4">
          {transfers.map((transfer) => {
            const { icon: FileIcon, color } = getFileIcon(transfer.fileType);
            const isOutgoing = transfer.direction === 'outgoing';

            return (
              <div key={transfer.id} className="p-4 rounded-xl bg-white/50 dark:bg-white/5">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${color}15` }}
                  >
                    <FileIcon size={20} style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                      {transfer.fileName}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                      {isOutgoing ? (
                        <ArrowUpRight size={12} className="text-blue-400" />
                      ) : (
                        <ArrowDownLeft size={12} className="text-green-400" />
                      )}
                      <span>
                        {isOutgoing ? 'Sending to' : 'Receiving from'} {transfer.peerName}
                      </span>
                      <span>·</span>
                      <span>{formatBytes(transfer.fileSize)}</span>
                    </div>
                  </div>
                  {/* Dismiss button — always available to remove stuck entries */}
                  <button
                    onClick={() => cancelTransferInStore(transfer.id)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors flex-shrink-0"
                    title="Dismiss transfer"
                  >
                    <Trash2 size={14} className="text-gray-400 hover:text-red-400 transition-colors" />
                  </button>
                </div>

                <TransferProgress
                  progress={transfer.progress}
                  speed={transfer.speed}
                  eta={transfer.eta}
                  bytesTransferred={transfer.bytesTransferred}
                  totalBytes={transfer.fileSize}
                  onCancel={() => {
                    fileTransferService.cancelTransfer(transfer.id, transfer.peerId);
                    cancelTransferInStore(transfer.id);
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
