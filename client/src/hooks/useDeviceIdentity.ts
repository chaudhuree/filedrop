import { useEffect, useState } from 'react';
import { DEVICE_ID_KEY, DEVICE_NAME_KEY } from '../utils/constants';
import { detectDeviceType, detectBrowser, detectOS, generateColorHash } from '../utils/deviceDetect';
import type { Device } from '../types/device';

/**
 * Hook to get or create a persistent device identity
 */
export function useDeviceIdentity(): Device | null {
  const [device, setDevice] = useState<Device | null>(null);

  useEffect(() => {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    const savedName = localStorage.getItem(DEVICE_NAME_KEY);

    if (!id) {
      id = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(DEVICE_ID_KEY, id);
    }

    const deviceInfo: Device = {
      id,
      name: savedName || '', // Server will generate if empty
      deviceType: detectDeviceType(),
      browser: detectBrowser(),
      os: detectOS(),
      colorHash: generateColorHash(id),
    };

    setDevice(deviceInfo);
  }, []);

  return device;
}
