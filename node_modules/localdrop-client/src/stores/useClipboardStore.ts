import { create } from 'zustand';
import type { ClipboardContent, IncomingClipboard, ClipboardContentType } from '../types/clipboard';

interface ClipboardState {
  currentContent: ClipboardContent | null;
  incomingClipboard: IncomingClipboard[];
  panelOpen: boolean;
  autoSend: boolean;
  autoAccept: boolean;

  setContent: (content: ClipboardContent | null) => void;
  addIncoming: (item: IncomingClipboard) => void;
  removeIncoming: (id: string) => void;
  togglePanel: () => void;
  setPanel: (open: boolean) => void;
  setAutoSend: (enabled: boolean) => void;
  setAutoAccept: (enabled: boolean) => void;
}

export const useClipboardStore = create<ClipboardState>((set) => ({
  currentContent: null,
  incomingClipboard: [],
  panelOpen: false,
  autoSend: localStorage.getItem('localdrop-auto-send') === 'true',
  autoAccept: localStorage.getItem('localdrop-auto-accept') === 'true',

  setContent: (content) => set({ currentContent: content }),

  addIncoming: (item) =>
    set((state) => ({
      incomingClipboard: [...state.incomingClipboard, item],
    })),

  removeIncoming: (id) =>
    set((state) => ({
      incomingClipboard: state.incomingClipboard.filter((c) => c.id !== id),
    })),

  togglePanel: () => set((state) => ({ panelOpen: !state.panelOpen })),
  setPanel: (open) => set({ panelOpen: open }),

  setAutoSend: (enabled) => {
    localStorage.setItem('localdrop-auto-send', String(enabled));
    set({ autoSend: enabled });
  },

  setAutoAccept: (enabled) => {
    localStorage.setItem('localdrop-auto-accept', String(enabled));
    set({ autoAccept: enabled });
  },
}));
