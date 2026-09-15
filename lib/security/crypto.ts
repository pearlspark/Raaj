import crypto from 'crypto';
import { TokenPayload } from './types';

// Fallback salt and secrets if env vars are unset
const MASTER_SALT = process.env.API_SIGNING_SALT || 'api-shield-master-salt-2026';
const JWT_SECRET = process.env.JWT_SECRET || 'api-shield-jwt-secure-secret-key-32-bytes-long!';

/**
 * Hash client secret with salt using SHA-256
 */
export function hashSecret(secret: string): string {
  return crypto.createHmac('sha256', MASTER_SALT).update(secret).digest('hex');
}

/**
 * Compare secret in constant time to prevent timing attacks
 */
export function verifySecret(secret: string, expectedHash: string): boolean {
  const hash = hashSecret(secret);
  try {
    const a = Buffer.from(hash, 'hex');
    const b = Buffer.from(expectedHash, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Generate cryptographically secure random client credentials
 */
export function generateClientCredentials() {
  const clientId = 'client_' + crypto.randomBytes(12).toString('hex');
  const rawSecret = 'sec_' + crypto.randomBytes(24).toString('base64url');
  const secretHash = hashSecret(rawSecret);
  const secretPrefix = rawSecret.slice(0, 8) + '...' + rawSecret.slice(-4);

  return {
    clientId,
    rawSecret,
    secretHash,
    secretPrefix,
  };
}

/**
 * Generate a unique Request ID
 */
export function generateRequestId(): string {
  return 'req_' + crypto.randomBytes(10).toString('hex');
}

/**
 * Generate a random Nonce
 */
export function generateNonce(): string {
  return 'nce_' + crypto.randomBytes(12).toString('hex');
}

/**
 * Base64URL encoding helpers
 */
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf-8');
}

/**
 * Issue a signed short-lived access token
 */
export function signAccessToken(payload: Omit<TokenPayload, 'iss' | 'aud' | 'iat' | 'exp'>, ttlSeconds: number = 900): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: TokenPayload = {
    ...payload,
    iss: 'api-shield-gateway',
    aud: 'api-clients',
    iat: now,
    exp: now + ttlSeconds,
  };

  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(signatureInput)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${signatureInput}.${signature}`;
}

/**
 * Verify and decode a short-lived signed access token
 */
export function verifyAccessToken(token: string): { valid: boolean; payload?: TokenPayload; error?: string } {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Malformed token structure' };
    }

    const [encodedHeader, encodedPayload, signature] = parts;
    const signatureInput = `${encodedHeader}.${encodedPayload}`;

    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(signatureInput)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    // Constant-time signature comparison
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return { valid: false, error: 'Invalid token signature' };
    }

    const payload: TokenPayload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
      return { valid: false, error: 'Token has expired' };
    }

    if (payload.iss !== 'api-shield-gateway') {
      return { valid: false, error: 'Invalid token issuer' };
    }

    if (payload.aud !== 'api-clients') {
      return { valid: false, error: 'Invalid token audience' };
    }

    return { valid: true, payload };
  } catch (err: any) {
    return { valid: false, error: 'Token verification failed: ' + (err?.message || 'Unknown error') };
  }
}

/**
 * Sign an HTTP request using HMAC
 * StringToSign = METHOD\nPATH\nTIMESTAMP\nNONCE\nBODY_HASH
 */
export function computeRequestSignature(
  secret: string,
  method: string,
  pathname: string,
  timestamp: string,
  nonce: string,
  body: string = ''
): string {
  const bodyHash = crypto.createHash('sha256').update(body || '').digest('hex');
  const stringToSign = [
    method.toUpperCase(),
    pathname,
    timestamp,
    nonce,
    bodyHash,
  ].join('\n');

  return crypto.createHmac('sha256', secret).update(stringToSign).digest('hex');
}

/**
 * Admin password hashing and verification using PBKDF2
 */
export function hashAdminPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

export function verifyAdminPassword(password: string, hash: string, salt: string): boolean {
  try {
    const computedHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    const a = Buffer.from(computedHash, 'hex');
    const b = Buffer.from(hash, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
