import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/security/adminAuth';
import { securityStore } from '@/lib/security/store';

export async function GET(req: NextRequest) {
  const session = verifyAdminSession(req);
  if (!session.valid) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const limit = req.nextUrl.searchParams.get('limit')
    ? parseInt(req.nextUrl.searchParams.get('limit')!, 10)
    : 100;
  const events = securityStore.getSecurityEvents(limit);

  return NextResponse.json({ success: true, events });
}
