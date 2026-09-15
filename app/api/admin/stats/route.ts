import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/security/adminAuth';
import { securityStore } from '@/lib/security/store';

export async function GET(req: NextRequest) {
  const session = verifyAdminSession(req);
  if (!session.valid) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Admin login required' }, { status: 401 });
  }

  const metrics = securityStore.getDashboardMetrics();
  return NextResponse.json({
    success: true,
    metrics,
    timestamp: new Date().toISOString(),
  });
}
