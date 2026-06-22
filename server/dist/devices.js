"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDeviceName = generateDeviceName;
exports.detectDeviceType = detectDeviceType;
exports.detectBrowser = detectBrowser;
exports.detectOS = detectOS;
exports.generateColorHash = generateColorHash;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Resolve data directory: works both in dev (tsx: __dirname = server/src)
// and production (node: __dirname = server/dist)
const serverRoot = path.resolve(__dirname, '..');
const dataDir = path.join(serverRoot, 'data');
// Fallback: if data/ is not next to the parent, try one more level up
const resolvedDataDir = fs.existsSync(dataDir)
    ? dataDir
    : path.join(serverRoot, '..', 'data');
const adjectives = JSON.parse(fs.readFileSync(path.join(resolvedDataDir, 'adjectives.json'), 'utf-8'));
const animals = JSON.parse(fs.readFileSync(path.join(resolvedDataDir, 'animals.json'), 'utf-8'));
/**
 * Generate a random device name like "Swift Falcon"
 */
function generateDeviceName() {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const animal = animals[Math.floor(Math.random() * animals.length)];
    return `${adj} ${animal}`;
}
/**
 * Detect device type from User-Agent string
 */
function detectDeviceType(userAgent) {
    const ua = userAgent.toLowerCase();
    // Check tablet first (iPads, Android tablets)
    if (/ipad/.test(ua) ||
        (/android/.test(ua) && !/mobile/.test(ua)) ||
        /tablet/.test(ua)) {
        return 'tablet';
    }
    // Check phone
    if (/iphone|ipod/.test(ua) ||
        (/android/.test(ua) && /mobile/.test(ua)) ||
        /windows phone/.test(ua) ||
        /blackberry/.test(ua)) {
        return 'phone';
    }
    return 'desktop';
}
/**
 * Detect browser from User-Agent string
 */
function detectBrowser(userAgent) {
    const ua = userAgent.toLowerCase();
    if (/edg/.test(ua))
        return 'Edge';
    if (/chrome/.test(ua) && !/chromium/.test(ua))
        return 'Chrome';
    if (/firefox/.test(ua))
        return 'Firefox';
    if (/safari/.test(ua))
        return 'Safari';
    if (/opera|opr/.test(ua))
        return 'Opera';
    return 'Unknown';
}
/**
 * Detect OS from User-Agent string
 */
function detectOS(userAgent) {
    const ua = userAgent.toLowerCase();
    if (/windows/.test(ua))
        return 'Windows';
    if (/macintosh|mac os/.test(ua))
        return 'macOS';
    if (/linux/.test(ua) && !/android/.test(ua))
        return 'Linux';
    if (/android/.test(ua))
        return 'Android';
    if (/iphone|ipad|ipod/.test(ua))
        return 'iOS';
    return 'Unknown';
}
/**
 * Generate a deterministic color hash from a string (device ID)
 */
function generateColorHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 60%)`;
}
//# sourceMappingURL=devices.js.map