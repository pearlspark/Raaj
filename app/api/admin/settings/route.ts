import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/security/adminAuth';
import { securityStore } from '@/lib/security/store';

export async function GET(req: NextRequest) {
  const session = verifyAdminSession(req);
  if (!session.valid) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const settings = securityStore.getSettings();
  return NextResponse.json({ success: true, settings });
}

export async function PUT(req: NextRequest) {
  const session = verifyAdminSession(req);
  if (!session.valid) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const updated = securityStore.updateSettings(body);

    securityStore.addAuditLog({
      admin: session.username || 'admin',
      action: 'SETTINGS_UPDATED',
      target: 'system_configuration',
      ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
      details: 'Updated gateway risk thresholds and rate limits',
      result: 'SUCCESS',
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed to update settings' }, { status: 400 });
  }
}
