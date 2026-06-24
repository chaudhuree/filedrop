import { useEffect } from 'react';

/**
 * Hook to request and maintain a Screen Wake Lock.
 * Keeps the display active and prevents the browser tab from sleeping.
 */
export function useWakeLock() {
  useEffect(() => {
    let wakeLock: any = null;

    const requestWakeLock = async () => {
      if (!('wakeLock' in navigator)) {
        console.warn('[WakeLock] Screen Wake Lock API is not supported in this browser.');
        return;
      }
      try {
        wakeLock = await (navigator as any).wakeLock.request('screen');
        console.log('[WakeLock] Screen Wake Lock is active.');
      } catch (err: any) {
        console.warn(`[WakeLock] Failed to request Screen Wake Lock: ${err.message}`);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    // Attempt to request wake lock on mount
    requestWakeLock();

    // Re-request when visibility state changes (e.g. user returns to tab)
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) {
        wakeLock.release()
          .then(() => {
            console.log('[WakeLock] Screen Wake Lock was released.');
          })
          .catch((err: any) => {
            console.warn(`[WakeLock] Error releasing Screen Wake Lock: ${err.message}`);
          });
      }
    };
  }, []);
}
