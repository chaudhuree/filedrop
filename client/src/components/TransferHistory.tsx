import React from 'react';
import { X, History, ArrowUpRight, ArrowDownLeft, CheckCircle, XCircle, Ban, Trash2 } from 'lucide-react';
import { useTransferStore } from '../stores/useTransferStore';
import { getFileIcon } from '../utils/fileIcons';
import { formatBytes } from '../utils/formatBytes';
import { formatRelativeTime } from '../utils/formatTime';

interface TransferHistoryProps {
  isOpen: boolean;
  onClose: () => void;
}

const statusIcons = {
  completed: { icon: CheckCircle, color: 'text-emerald-500' },
  cancelled: { icon: Ban, color: 'text-amber-500' },
  failed: { icon: XCircle, color: 'text-red-500' },
};

export default function TransferHistory({ isOpen, onClose }: TransferHistoryProps) {
  const { transferHistory, clearHistory, deleteHistoryItem } = useTransferStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center modal-backdrop animate-fade-in" id="history-panel">
      <div className="glass-card rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[80vh] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200/50 dark:border-white/5">
          <div className="flex items-center gap-2">
            <History size={18} className="text-primary-500" />
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">Transfer History</h3>
          </div>
          <div className="flex items-center gap-2">
            {transferHistory.length > 0 && (
              <button
                onClick={clearHistory}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                title="Clear history"
              >
                <Trash2 size={16} className="text-gray-400" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <X size={18} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* History list */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {transferHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
              <History size={32} className="mb-2 opacity-50" />
              <p className="text-sm">No transfers yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transferHistory.map((transfer) => {
                const { icon: FileIcon, color } = getFileIcon(transfer.fileType);
                const isOutgoing = transfer.direction === 'outgoing';
                const statusInfo = statusIcons[transfer.status as keyof typeof statusIcons] || statusIcons.completed;
                const StatusIcon = statusInfo.icon;

                return (
                  <div
                    key={transfer.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/30 dark:bg-white/5 hover:bg-white/50 dark:hover:bg-white/8 transition-colors group/item"
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${color}10` }}
                    >
                      <FileIcon size={18} style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                        {transfer.fileName}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        {isOutgoing ? (
                          <ArrowUpRight size={10} className="text-blue-400" />
                        ) : (
                          <ArrowDownLeft size={10} className="text-green-400" />
                        )}
                        <span>{transfer.peerName}</span>
                        <span>·</span>
                        <span>{formatBytes(transfer.fileSize)}</span>
                        {transfer.endTime && (
                          <>
                            <span>·</span>
                            <span>{formatRelativeTime(transfer.endTime)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusIcon size={16} className={statusInfo.color} />
                      <button
                        onClick={() => deleteHistoryItem(transfer.id)}
                        className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-red-400 transition-colors md:opacity-0 md:group-hover/item:opacity-100"
                        title="Remove from history"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
