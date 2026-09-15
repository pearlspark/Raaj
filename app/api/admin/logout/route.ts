import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/security/adminAuth';
import { securityStore } from '@/lib/security/store';

export async function POST(req: NextRequest) {
  const session = verifyAdminSession(req);
  if (session.valid && session.username) {
    securityStore.addAuditLog({
      admin: session.username,
      action: 'ADMIN_LOGOUT',
      target: 'system',
      ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
      details: 'Administrator logged out',
      result: 'SUCCESS',
    });
  }

  const res = NextResponse.json({ success: true, message: 'Logged out successfully' });
  res.cookies.delete('shield_admin_session');
  return res;
}
