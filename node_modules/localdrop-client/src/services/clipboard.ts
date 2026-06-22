import type { ClipboardContentType } from '../types/clipboard';

/**
 * Copy text to clipboard
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    return fallbackCopyText(text);
  }
}

/**
 * Copy image blob to clipboard using modern Clipboard API
 * Falls back to download if not supported
 */
export async function copyImage(blob: Blob): Promise<boolean> {
  try {
    // Modern browsers: navigator.clipboard.write()
    if (navigator.clipboard?.write) {
      // Safari requires image/png
      let pngBlob = blob;
      if (blob.type !== 'image/png') {
        pngBlob = await convertToPng(blob);
      }

      const item = new ClipboardItem({
        'image/png': pngBlob,
      });
      await navigator.clipboard.write([item]);
      return true;
    }

    // Fallback: no image clipboard support
    console.warn('[Clipboard] Image clipboard write not supported');
    return false;
  } catch (err) {
    console.error('[Clipboard] Image copy failed:', err);
    return false;
  }
}

/**
 * Copy HTML content to clipboard
 */
export async function copyHtml(html: string, plainText: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.write) {
      const htmlBlob = new Blob([html], { type: 'text/html' });
      const textBlob = new Blob([plainText], { type: 'text/plain' });
      const item = new ClipboardItem({
        'text/html': htmlBlob,
        'text/plain': textBlob,
      });
      await navigator.clipboard.write([item]);
      return true;
    }

    // Fallback to plain text
    return copyText(plainText);
  } catch {
    return copyText(plainText);
  }
}

/**
 * Detect clipboard content type from pasted data
 */
export function detectClipboardContentType(data: string): ClipboardContentType {
  // Check URL pattern
  const urlPattern = /^https?:\/\/[^\s]+$/i;
  if (urlPattern.test(data.trim())) {
    return 'url';
  }

  // Check HTML pattern
  if (/<[a-z][\s\S]*>/i.test(data) && (/<\/[a-z]+>/i.test(data) || /<[a-z]+\s*\/>/i.test(data))) {
    return 'html';
  }

  return 'text';
}

/**
 * Check if the browser supports image clipboard operations
 */
export function supportsImageClipboard(): boolean {
  return !!(navigator.clipboard?.write);
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Convert a base64 data URL to a Blob
 */
export function base64ToBlob(base64: string, mimeType: string = 'image/png'): Blob {
  // Handle data URLs
  let cleanBase64 = base64;
  if (base64.startsWith('data:')) {
    const [header, data] = base64.split(',');
    const match = header.match(/data:([^;]+)/);
    if (match) mimeType = match[1];
    cleanBase64 = data;
  }

  const byteString = atob(cleanBase64);
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uint8Array = new Uint8Array(arrayBuffer);
  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }
  return new Blob([arrayBuffer], { type: mimeType });
}

// ── Private Helpers ──────────────────────────────────────────────────────

function fallbackCopyText(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return true;
  } catch {
    document.body.removeChild(textarea);
    return false;
  }
}

async function convertToPng(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (pngBlob) => {
          if (pngBlob) resolve(pngBlob);
          else reject(new Error('Failed to convert to PNG'));
        },
        'image/png'
      );
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(blob);
  });
}
