/**
 * Generate a random device name like "Swift Falcon"
 */
export declare function generateDeviceName(): string;
/**
 * Detect device type from User-Agent string
 */
export declare function detectDeviceType(userAgent: string): 'desktop' | 'tablet' | 'phone';
/**
 * Detect browser from User-Agent string
 */
export declare function detectBrowser(userAgent: string): string;
/**
 * Detect OS from User-Agent string
 */
export declare function detectOS(userAgent: string): string;
/**
 * Generate a deterministic color hash from a string (device ID)
 */
export declare function generateColorHash(str: string): string;
//# sourceMappingURL=devices.d.ts.map