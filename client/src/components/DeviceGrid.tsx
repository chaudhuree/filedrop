import React from 'react';
import { Wifi, Search } from 'lucide-react';
import DeviceCard from './DeviceCard';
import { useDeviceStore } from '../stores/useDeviceStore';

interface DeviceGridProps {
  onSendFile: (deviceId: string) => void;
}

export default function DeviceGrid({ onSendFile }: DeviceGridProps) {
  const peers = useDeviceStore((s) => s.peers);
  const connected = useDeviceStore((s) => s.connected);
  const peerList = Array.from(peers.values());

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in" id="connecting-state">
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-full bg-primary-500/10 flex items-center justify-center">
            <Wifi size={32} className="text-primary-500 animate-pulse" />
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-primary-500/30 animate-ping" />
        </div>
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">
          Connecting to network...
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Make sure you're connected to a local network
        </p>
      </div>
    );
  }

  if (peerList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in" id="empty-state">
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-full bg-primary-500/10 flex items-center justify-center">
            <Search size={32} className="text-primary-400" />
          </div>
          {/* Scanning animation rings */}
          <div className="absolute inset-0 rounded-full border-2 border-primary-400/20 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="absolute -inset-4 rounded-full border border-primary-400/10 animate-ping" style={{ animationDuration: '3s', animationDelay: '0.5s' }} />
        </div>
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">
          Searching for devices...
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs">
          Open LocalDrop on another device connected to the same network
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" id="device-grid">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 text-center">
        {peerList.length} device{peerList.length !== 1 ? 's' : ''} on your network
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {peerList.map((device) => (
          <DeviceCard key={device.id} device={device} onSendFile={onSendFile} />
        ))}
      </div>
    </div>
  );
}
