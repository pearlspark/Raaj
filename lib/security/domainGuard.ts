import { DomainRecord, DomainMode } from './types';

/**
 * Robust domain normalization:
 * - strips protocol (http://, https://)
 * - strips path, query parameters, hash
 * - strips port (except standard port handling)
 * - strips trailing slash
 * - converts to lowercase
 * - strips leading 'www.' if configured or keeps for canonical form
 */
export function normalizeDomain(rawDomain: string): { hostname: string; port?: string; fullOrigin: string; error?: string } {
  if (!rawDomain || typeof rawDomain !== 'string') {
    return { hostname: '', fullOrigin: '', error: 'Domain must be a non-empty string' };
  }

  let cleaned = rawDomain.trim().toLowerCase();

  // If no scheme was provided, add https:// to parse properly
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = 'https://' + cleaned;
  }

  try {
    const parsed = new URL(cleaned);
    const hostname = parsed.hostname;

    if (!hostname || hostname.includes(' ') || !hostname.includes('.')) {
      // Allow localhost or standard local addresses for dev/testing
      if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        return { hostname: '', fullOrigin: '', error: 'Invalid hostname structure' };
      }
    }

    const port = parsed.port || (parsed.protocol === 'https:' ? '443' : '80');
    const fullOrigin = `${parsed.protocol}//${parsed.host}`;

    return {
      hostname,
      port: parsed.port,
      fullOrigin,
    };
  } catch (err: any) {
    return { hostname: '', fullOrigin: '', error: 'Malformed domain URL: ' + err.message };
  }
}

/**
 * Check if an incoming request origin/domain matches an authorized domain record.
 * Strictly prevents bypasses such as:
 * - "evil-example.com"
 * - "example.com.evil.com"
 * - look-alikes
 */
export function isDomainAuthorized(
  incomingHostOrOrigin: string,
  authorizedRecord: DomainRecord
): { matched: boolean; reason?: string } {
  if (authorizedRecord.status !== 'ACTIVE') {
    return { matched: false, reason: `Domain status is ${authorizedRecord.status}` };
  }

  const incoming = normalizeDomain(incomingHostOrOrigin);
  if (incoming.error || !incoming.hostname) {
    return { matched: false, reason: 'Invalid incoming origin/domain format' };
  }

  const incomingHost = incoming.hostname;
  const targetHost = authorizedRecord.normalizedDomain.toLowerCase();

  if (authorizedRecord.mode === 'EXACT') {
    // Exact domain match
    if (incomingHost === targetHost) {
      return { matched: true };
    }
    // Also accept www.targetHost if targetHost doesn't have www, or vice-versa if exact match without www
    if (incomingHost === `www.${targetHost}` || `www.${incomingHost}` === targetHost) {
      return { matched: true };
    }
    return { matched: false, reason: `Exact domain mismatch: expected ${targetHost}, received ${incomingHost}` };
  }

  if (authorizedRecord.mode === 'SUBDOMAIN') {
    // Subdomain mode:
    // incoming must either be EXACT root domain (e.g. "example.com")
    // OR it must end with ".example.com" (e.g. "app.example.com", "sub.nested.example.com")
    // NEVER allow "evil-example.com" or "example.com.evil.com"!
    if (incomingHost === targetHost) {
      return { matched: true };
    }

    const suffix = '.' + targetHost;
    if (incomingHost.endsWith(suffix)) {
      return { matched: true };
    }

    return {
      matched: false,
      reason: `Subdomain mismatch: ${incomingHost} is not a valid subdomain of ${targetHost}`,
    };
  }

  return { matched: false, reason: 'Unknown domain authorization mode' };
}

/**
 * Extract origin / host from headers cleanly
 */
export function extractClientDomain(headers: Headers | Record<string, string | string[] | undefined>): string | null {
  const getHeader = (key: string): string | undefined => {
    if (typeof (headers as any).get === 'function') {
      return (headers as any).get(key) || undefined;
    }
    const val = (headers as Record<string, string | string[] | undefined>)[key.toLowerCase()];
    if (Array.isArray(val)) return val[0];
    return val;
  };

  const origin = getHeader('origin');
  if (origin && origin !== 'null') {
    return origin;
  }

  const referer = getHeader('referer');
  if (referer) {
    try {
      const parsed = new URL(referer);
      return parsed.origin;
    } catch {
      // ignore invalid referer URL
    }
  }

  return null;
}
