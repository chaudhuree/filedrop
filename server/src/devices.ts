import * as fs from 'fs';
import * as path from 'path';

// Resolve data directory: works both in dev (tsx: __dirname = server/src)
// and production (node: __dirname = server/dist)
const serverRoot = path.resolve(__dirname, '..');
const dataDir = path.join(serverRoot, 'data');

// Fallback: if data/ is not next to the parent, try one more level up
const resolvedDataDir = fs.existsSync(dataDir)
  ? dataDir
  : path.join(serverRoot, '..', 'data');

const adjectives: string[] = JSON.parse(
  fs.readFileSync(path.join(resolvedDataDir, 'adjectives.json'), 'utf-8')
);
const animals: string[] = JSON.parse(
  fs.readFileSync(path.join(resolvedDataDir, 'animals.json'), 'utf-8')
);

/**
 * Generate a random device name like "Swift Falcon"
 */
export function generateDeviceName(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  return `${adj} ${animal}`;
}

/**
 * Detect device type from User-Agent string
 */
export function detectDeviceType(userAgent: string): 'desktop' | 'tablet' | 'phone' {
  const ua = userAgent.toLowerCase();

  // Check tablet first (iPads, Android tablets)
  if (
    /ipad/.test(ua) ||
    (/android/.test(ua) && !/mobile/.test(ua)) ||
    /tablet/.test(ua)
  ) {
    return 'tablet';
  }

  // Check phone
  if (
    /iphone|ipod/.test(ua) ||
    (/android/.test(ua) && /mobile/.test(ua)) ||
    /windows phone/.test(ua) ||
    /blackberry/.test(ua)
  ) {
    return 'phone';
  }

  return 'desktop';
}

/**
 * Detect browser from User-Agent string
 */
export function detectBrowser(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (/edg/.test(ua)) return 'Edge';
  if (/chrome/.test(ua) && !/chromium/.test(ua)) return 'Chrome';
  if (/firefox/.test(ua)) return 'Firefox';
  if (/safari/.test(ua)) return 'Safari';
  if (/opera|opr/.test(ua)) return 'Opera';
  return 'Unknown';
}

/**
 * Detect OS from User-Agent string
 */
export function detectOS(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (/windows/.test(ua)) return 'Windows';
  if (/macintosh|mac os/.test(ua)) return 'macOS';
  if (/linux/.test(ua) && !/android/.test(ua)) return 'Linux';
  if (/android/.test(ua)) return 'Android';
  if (/iphone|ipad|ipod/.test(ua)) return 'iOS';
  return 'Unknown';
}

/**
 * Generate a deterministic color hash from a string (device ID)
 */
export function generateColorHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 60%)`;
}
