import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/security/adminAuth';
import { securityStore } from '@/lib/security/store';

export async function GET(req: NextRequest) {
  const session = verifyAdminSession(req);
  if (!session.valid) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const blockedIps = securityStore.getBlockedIps();
  return NextResponse.json({ success: true, blockedIps });
}

export async function POST(req: NextRequest) {
  const session = verifyAdminSession(req);
  if (!session.valid) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { ip, reason, isPermanent, durationMinutes } = body;

    if (!ip || !reason) {
      return NextResponse.json({ success: false, error: 'IP and reason are required' }, { status: 400 });
    }

    const record = securityStore.blockIp(
      ip.trim(),
      reason,
      Boolean(isPermanent),
      durationMinutes ? parseInt(durationMinutes, 10) : 60,
      session.username || 'admin'
    );

    securityStore.addAuditLog({
      admin: session.username || 'admin',
      action: 'IP_BLOCKED',
      target: ip,
      ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
      details: `Blocked IP: ${reason} (Permanent: ${Boolean(isPermanent)})`,
      result: 'SUCCESS',
    });

    return NextResponse.json({ success: true, blockedIp: record });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed to block IP' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = verifyAdminSession(req);
  if (!session.valid) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const ip = req.nextUrl.searchParams.get('ip');
  if (!ip) {
    return NextResponse.json({ success: false, error: 'IP query parameter required' }, { status: 400 });
  }

  const removed = securityStore.unblockIp(ip, session.username || 'admin');
  return NextResponse.json({ success: true, removed });
}
