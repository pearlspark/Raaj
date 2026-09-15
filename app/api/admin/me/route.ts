import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/security/adminAuth';
import { securityStore } from '@/lib/security/store';

export async function GET(req: NextRequest) {
  const session = verifyAdminSession(req);
  if (!session.valid) {
    return NextResponse.json({ authenticated: false, error: session.error }, { status: 401 });
  }

  const user = securityStore.getAdminByUsername(session.username!);
  return NextResponse.json({
    authenticated: true,
    user: {
      username: user?.username || session.username,
      role: user?.role || 'ADMIN',
      lastLoginAt: user?.lastLoginAt,
    },
  });
}
