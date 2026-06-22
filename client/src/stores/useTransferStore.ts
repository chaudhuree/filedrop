import { create } from 'zustand';
import type { Transfer, FileRequest } from '../types/transfer';

interface TransferState {
  activeTransfers: Map<string, Transfer>;
  transferHistory: Transfer[];
  incomingRequests: FileRequest[];

  addTransfer: (transfer: Transfer) => void;
  updateProgress: (id: string, bytesTransferred: number, speed: number) => void;
  completeTransfer: (id: string) => void;
  cancelTransfer: (id: string) => void;
  failTransfer: (id: string, error: string) => void;
  addIncomingRequest: (request: FileRequest) => void;
  removeIncomingRequest: (id: string) => void;
  clearHistory: () => void;
}

const SAVE_HISTORY_KEY = 'localdrop-transfer-history';

const loadHistory = (): Transfer[] => {
  try {
    const data = localStorage.getItem(SAVE_HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveHistory = (history: Transfer[]) => {
  try {
    localStorage.setItem(SAVE_HISTORY_KEY, JSON.stringify(history));
  } catch (err) {
    console.error('Failed to save transfer history', err);
  }
};

export const useTransferStore = create<TransferState>((set, get) => ({
  activeTransfers: new Map(),
  transferHistory: loadHistory(),
  incomingRequests: [],

  addTransfer: (transfer) => {
    set((state) => {
      const activeTransfers = new Map(state.activeTransfers);
      activeTransfers.set(transfer.id, transfer);
      return { activeTransfers };
    });
  },

  updateProgress: (id, bytesTransferred, speed) => {
    set((state) => {
      const activeTransfers = new Map(state.activeTransfers);
      const transfer = activeTransfers.get(id);
      if (transfer) {
        const progress = Math.round((bytesTransferred / transfer.fileSize) * 100);
        const elapsed = (Date.now() - transfer.startTime) / 1000;
        const remaining = transfer.fileSize - bytesTransferred;
        const eta = speed > 0 ? remaining / speed : 0;

        activeTransfers.set(id, {
          ...transfer,
          bytesTransferred,
          progress,
          speed,
          eta,
          status: 'transferring',
        });
      }
      return { activeTransfers };
    });
  },

  completeTransfer: (id) => {
    set((state) => {
      const activeTransfers = new Map(state.activeTransfers);
      const transfer = activeTransfers.get(id);
      if (transfer) {
        const completed = {
          ...transfer,
          status: 'completed' as const,
          progress: 100,
          endTime: Date.now(),
        };
        activeTransfers.delete(id);
        const nextHistory = [completed, ...state.transferHistory].slice(0, 50);
        saveHistory(nextHistory);
        return {
          activeTransfers,
          transferHistory: nextHistory,
        };
      }
      return { activeTransfers };
    });
  },

  cancelTransfer: (id) => {
    set((state) => {
      const activeTransfers = new Map(state.activeTransfers);
      const transfer = activeTransfers.get(id);
      if (transfer) {
        const cancelled = {
          ...transfer,
          status: 'cancelled' as const,
          endTime: Date.now(),
        };
        activeTransfers.delete(id);
        const nextHistory = [cancelled, ...state.transferHistory].slice(0, 50);
        saveHistory(nextHistory);
        return {
          activeTransfers,
          transferHistory: nextHistory,
        };
      }
      return { activeTransfers };
    });
  },

  failTransfer: (id, _error) => {
    set((state) => {
      const activeTransfers = new Map(state.activeTransfers);
      const transfer = activeTransfers.get(id);
      if (transfer) {
        const failed = {
          ...transfer,
          status: 'failed' as const,
          endTime: Date.now(),
        };
        activeTransfers.delete(id);
        const nextHistory = [failed, ...state.transferHistory].slice(0, 50);
        saveHistory(nextHistory);
        return {
          activeTransfers,
          transferHistory: nextHistory,
        };
      }
      return { activeTransfers };
    });
  },

  addIncomingRequest: (request) => {
    set((state) => ({
      incomingRequests: [...state.incomingRequests, request],
    }));
  },

  removeIncomingRequest: (id) => {
    set((state) => ({
      incomingRequests: state.incomingRequests.filter((r) => r.transferId !== id),
    }));
  },

  clearHistory: () => {
    saveHistory([]);
    set({ transferHistory: [] });
  },
}));
