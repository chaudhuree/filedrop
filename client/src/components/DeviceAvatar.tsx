import React from 'react';
import { Laptop, Smartphone, Tablet } from 'lucide-react';

interface DeviceAvatarProps {
  deviceType: 'desktop' | 'tablet' | 'phone';
  colorHash: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  online?: boolean;
  avatar?: string;
}

const sizeClasses = {
  sm: 'w-10 h-10',
  md: 'w-14 h-14',
  lg: 'w-20 h-20',
};

const iconSizes = {
  sm: 18,
  md: 24,
  lg: 32,
};

const DeviceIcons = {
  desktop: Laptop,
  tablet: Tablet,
  phone: Smartphone,
};

export default function DeviceAvatar({
  deviceType,
  colorHash,
  name,
  size = 'md',
  online = true,
  avatar,
}: DeviceAvatarProps) {
  const Icon = DeviceIcons[deviceType];

  return (
    <div className="relative inline-flex">
      <div
        className={`${sizeClasses[size]} rounded-2xl overflow-hidden flex items-center justify-center transition-all duration-300`}
        style={{
          background: avatar
            ? 'transparent'
            : `linear-gradient(135deg, ${colorHash}, ${adjustHue(colorHash, 40)})`,
          boxShadow: `0 4px 15px ${colorHash}40`,
        }}
      >
        {avatar ? (
          <img
            src={avatar}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Icon size={iconSizes[size]} className="text-white drop-shadow-sm" />
        )}
      </div>
      {online && (
        <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ backgroundColor: '#22c55e' }}
          />
          <span
            className="relative inline-flex rounded-full h-3.5 w-3.5 border-2 border-white dark:border-surface-900"
            style={{ backgroundColor: '#22c55e' }}
          />
        </span>
      )}
    </div>
  );
}

function adjustHue(hsl: string, amount: number): string {
  const match = hsl.match(/hsl\((\d+),\s*([\d.]+)%,\s*([\d.]+)%\)/);
  if (!match) return hsl;
  const h = (parseInt(match[1]) + amount) % 360;
  return `hsl(${h}, ${match[2]}%, ${match[3]}%)`;
}
