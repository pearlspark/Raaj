import { NextRequest, NextResponse } from 'next/server';
import { securityStore } from './store';
import { verifyAccessToken, signAccessToken } from './crypto';

const ADMIN_SESSION_SECRET = process.env.ADMIN_SECRET || 'api-shield-admin-session-auth-token-key-2026';

export function issueAdminSessionToken(username: string): string {
  return signAccessToken(
    {
      jti: 'adm_tok_' + Date.now().toString(36),
      sub: username,
      domain: 'admin-console',
      permissions: ['admin:*'],
    },
    86400 // 24 hours
  );
}

export function verifyAdminSession(req: NextRequest): { valid: boolean; username?: string; error?: string } {
  // Check authorization header or cookie
  let token: string | undefined;

  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else {
    // Check cookie
    const cookie = req.cookies.get('shield_admin_session');
    if (cookie) {
      token = cookie.value;
    }
  }

  if (!token) {
    return { valid: false, error: 'Admin authentication required' };
  }

  const res = verifyAccessToken(token);
  if (!res.valid || !res.payload) {
    return { valid: false, error: res.error || 'Invalid admin session token' };
  }

  if (!res.payload.permissions.includes('admin:*') && res.payload.domain !== 'admin-console') {
    return { valid: false, error: 'Token does not have admin privileges' };
  }

  return { valid: true, username: res.payload.sub };
}
