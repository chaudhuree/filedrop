import React from 'react';
import { Check, CheckCheck } from 'lucide-react';
import DeviceAvatar from './DeviceAvatar';
import { useDeviceStore } from '../stores/useDeviceStore';
import { useTransferStore } from '../stores/useTransferStore';
import type { Device } from '../types/device';

interface DeviceCardProps {
  device: Device;
  onSendFile: (deviceId: string) => void;
}

export default function DeviceCard({ device, onSendFile }: DeviceCardProps) {
  const { selectedPeers, togglePeerSelection, setContextMenu } = useDeviceStore();
  const activeTransfers = useTransferStore((s) => s.activeTransfers);
  const isSelected = selectedPeers.has(device.id);

  // Check if there's an active transfer with this device
  const hasActiveTransfer = Array.from(activeTransfers.values()).some(
    (t) => t.peerId === device.id && t.status === 'transferring'
  );

  const handleClick = () => {
    togglePeerSelection(device.id);
  };

  const handleDoubleClick = () => {
    onSendFile(device.id);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      targetDeviceId: device.id,
    });
  };

  return (
    <button
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      className={`
        group relative glass-card rounded-2xl p-5 flex flex-col items-center gap-3
        transition-all duration-300 cursor-pointer w-full
        hover:scale-[1.03] hover:shadow-xl
        active:scale-[0.98]
        ${isSelected
          ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-transparent shadow-lg shadow-primary-500/20'
          : 'hover:ring-1 hover:ring-primary-300/50'
        }
      `}
      id={`device-card-${device.id}`}
      aria-label={`${device.name} - ${device.os} ${device.browser}`}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center animate-scale-in shadow-md">
          <Check size={14} className="text-white" />
        </div>
      )}

      {/* Active transfer indicator */}
      {hasActiveTransfer && (
        <div className="absolute inset-0 rounded-2xl overflow-hidden">
          <div
            className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-400 to-accent-500"
            style={{ animation: 'shimmer 2s linear infinite', backgroundSize: '200% 100%' }}
          />
        </div>
      )}

      <DeviceAvatar
        deviceType={device.deviceType}
        colorHash={device.colorHash}
        name={device.name}
        size="lg"
        online={true}
      />

      <div className="text-center min-w-0 w-full">
        <p className="font-semibold text-sm text-gray-800 dark:text-gray-100 truncate">
          {device.name}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {device.os} · {device.browser}
        </p>
      </div>

      {/* Hover hint */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0">
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 whitespace-nowrap">
          Click to select · Double-click to send
        </span>
      </div>
    </button>
  );
}
