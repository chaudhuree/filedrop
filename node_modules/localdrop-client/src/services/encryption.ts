/**
 * End-to-end encryption layer using Web Crypto API.
 * WebRTC already provides DTLS encryption, but this adds an additional
 * application-level encryption layer.
 */

/**
 * Generate an ECDH key pair for key exchange
 */
export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey']
  );
}

/**
 * Export a public key to send to a peer
 */
export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64(exported);
}

/**
 * Import a peer's public key
 */
export async function importPublicKey(base64Key: string): Promise<CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(base64Key);
  return crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  );
}

/**
 * Derive a shared AES-GCM key from ECDH key exchange
 */
export async function deriveSharedKey(
  privateKey: CryptoKey,
  peerPublicKey: CryptoKey
): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: peerPublicKey },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data with AES-256-GCM
 */
export async function encrypt(
  key: CryptoKey,
  data: ArrayBuffer
): Promise<{ iv: string; ciphertext: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  return {
    iv: arrayBufferToBase64(iv.buffer),
    ciphertext: arrayBufferToBase64(ciphertext),
  };
}

/**
 * Decrypt data with AES-256-GCM
 */
export async function decrypt(
  key: CryptoKey,
  iv: string,
  ciphertext: string
): Promise<ArrayBuffer> {
  const ivBuffer = base64ToArrayBuffer(iv);
  const ctBuffer = base64ToArrayBuffer(ciphertext);

  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBuffer },
    key,
    ctBuffer
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
