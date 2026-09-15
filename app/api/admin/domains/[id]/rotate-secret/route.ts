import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/security/adminAuth';
import { securityStore } from '@/lib/security/store';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = verifyAdminSession(req);
  if (!session.valid) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const { newRawSecret, domainRecord } = securityStore.rotateClientSecret(id);

    securityStore.addAuditLog({
      admin: session.username || 'admin',
      action: 'CREDENTIALS_ROTATED',
      target: domainRecord.domain,
      ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
      details: `Generated new Client ID ${domainRecord.clientId} and rotated secret key`,
      result: 'SUCCESS',
    });

    return NextResponse.json({
      success: true,
      domain: domainRecord,
      newRawSecret,
      warning: 'Store this new client secret securely now. Previous secret is immediately invalidated.',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed to rotate secret' }, { status: 400 });
  }
}
