import { create } from 'zustand';
import type { Device } from '../types/device';
import { DEVICE_ID_KEY, DEVICE_NAME_KEY, DEVICE_AVATAR_KEY } from '../utils/constants';
import { socketService } from '../services/socket';

interface DeviceState {
  myDevice: Device | null;
  peers: Map<string, Device>;
  selectedPeers: Set<string>;
  connected: boolean;

  setMyDevice: (device: Device) => void;
  updateMyName: (name: string) => void;
  updateMyAvatar: (avatar: string) => void;
  setPeers: (peers: Device[]) => void;
  addPeer: (device: Device) => void;
  removePeer: (id: string) => void;
  togglePeerSelection: (id: string) => void;
  selectPeer: (id: string) => void;
  clearSelection: () => void;
  setConnected: (connected: boolean) => void;
  contextMenu: { isOpen: boolean; x: number; y: number; targetDeviceId: string | null };
  setContextMenu: (menu: { isOpen: boolean; x: number; y: number; targetDeviceId: string | null }) => void;
  closeContextMenu: () => void;
}

export const useDeviceStore = create<DeviceState>((set, get) => ({
  myDevice: null,
  peers: new Map(),
  selectedPeers: new Set(),
  connected: false,

  setMyDevice: (device) => {
    localStorage.setItem(DEVICE_ID_KEY, device.id);
    localStorage.setItem(DEVICE_NAME_KEY, device.name);
    if (device.avatar) {
      localStorage.setItem(DEVICE_AVATAR_KEY, device.avatar);
    }
    set({ myDevice: device });
  },

  updateMyName: (name) => {
    const current = get().myDevice;
    if (current) {
      localStorage.setItem(DEVICE_NAME_KEY, name);
      set({ myDevice: { ...current, name } });
      socketService.updateName(name);
    }
  },

  updateMyAvatar: (avatar) => {
    const current = get().myDevice;
    if (current) {
      localStorage.setItem(DEVICE_AVATAR_KEY, avatar);
      set({ myDevice: { ...current, avatar } });
      socketService.updateAvatar(avatar);
    }
  },

  setPeers: (peers) => {
    const map = new Map<string, Device>();
    peers.forEach((p) => map.set(p.id, p));
    set({ peers: map });
  },

  addPeer: (device) => {
    set((state) => {
      const peers = new Map(state.peers);
      peers.set(device.id, device);
      return { peers };
    });
  },

  removePeer: (id) => {
    set((state) => {
      const peers = new Map(state.peers);
      peers.delete(id);
      const selectedPeers = new Set(state.selectedPeers);
      selectedPeers.delete(id);
      return { peers, selectedPeers };
    });
  },

  togglePeerSelection: (id) => {
    set((state) => {
      const selectedPeers = new Set(state.selectedPeers);
      if (selectedPeers.has(id)) {
        selectedPeers.delete(id);
      } else {
        selectedPeers.add(id);
      }
      return { selectedPeers };
    });
  },

  selectPeer: (id) => {
    set({ selectedPeers: new Set([id]) });
  },

  clearSelection: () => {
    set({ selectedPeers: new Set() });
  },

  setConnected: (connected) => set({ connected }),

  contextMenu: { isOpen: false, x: 0, y: 0, targetDeviceId: null },
  setContextMenu: (menu) => set({ contextMenu: menu }),
  closeContextMenu: () => set((state) => ({ contextMenu: { ...state.contextMenu, isOpen: false } })),
}));
