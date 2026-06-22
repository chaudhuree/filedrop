/**
 * Detect the current device type from the browser
 */
export function detectDeviceType(): 'desktop' | 'tablet' | 'phone' {
  const ua = navigator.userAgent.toLowerCase();

  if (/ipad/.test(ua) || (/android/.test(ua) && !/mobile/.test(ua)) || /tablet/.test(ua)) {
    return 'tablet';
  }

  if (
    /iphone|ipod/.test(ua) ||
    (/android/.test(ua) && /mobile/.test(ua)) ||
    /windows phone/.test(ua)
  ) {
    return 'phone';
  }

  // Also check touch + small screen for iPads with desktop UA
  if ('ontouchstart' in window && window.innerWidth >= 768 && window.innerWidth <= 1366) {
    return 'tablet';
  }

  return 'desktop';
}

/**
 * Detect the current browser
 */
export function detectBrowser(): string {
  const ua = navigator.userAgent;
  if (/Edg/.test(ua)) return 'Edge';
  if (/Chrome/.test(ua) && !/Chromium/.test(ua)) return 'Chrome';
  if (/Firefox/.test(ua)) return 'Firefox';
  if (/Safari/.test(ua)) return 'Safari';
  if (/Opera|OPR/.test(ua)) return 'Opera';
  return 'Unknown';
}

/**
 * Detect the current OS
 */
export function detectOS(): string {
  const ua = navigator.userAgent;
  if (/Windows/.test(ua)) return 'Windows';
  if (/Macintosh|Mac OS/.test(ua)) return 'macOS';
  if (/Linux/.test(ua) && !/Android/.test(ua)) return 'Linux';
  if (/Android/.test(ua)) return 'Android';
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
  return 'Unknown';
}

/**
 * Generate a color hash from a string
 */
export function generateColorHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 60%)`;
}
