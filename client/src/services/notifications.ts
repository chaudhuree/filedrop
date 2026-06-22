/**
 * Request browser notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const result = await Notification.requestPermission();
  return result === 'granted';
}

/**
 * Show a browser notification
 */
export function showNotification(
  title: string,
  body: string,
  options?: { icon?: string; tag?: string; onClick?: () => void }
): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (document.hasFocus()) return; // Don't show if tab is focused

  const notification = new Notification(title, {
    body,
    icon: options?.icon || '/favicon.svg',
    tag: options?.tag,
    silent: false,
  });

  if (options?.onClick) {
    notification.onclick = () => {
      window.focus();
      options.onClick?.();
      notification.close();
    };
  }

  // Auto-close after 5 seconds
  setTimeout(() => notification.close(), 5000);
}
