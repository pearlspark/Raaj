import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/security/adminAuth';
import { securityStore } from '@/lib/security/store';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = verifyAdminSession(req);
  if (!session.valid) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const body = await req.json();
    const { status, mode, rateLimitPerMin } = body;

    const updates: Record<string, any> = {};
    if (status && ['ACTIVE', 'DISABLED', 'BLOCKED'].includes(status)) {
      updates.status = status;
    }
    if (mode && ['EXACT', 'SUBDOMAIN'].includes(mode)) {
      updates.mode = mode;
    }
    if (rateLimitPerMin !== undefined) {
      updates.rateLimitPerMin = parseInt(rateLimitPerMin, 10);
    }

    const updated = securityStore.updateDomain(id, updates);

    securityStore.addAuditLog({
      admin: session.username || 'admin',
      action: status ? `DOMAIN_${status}` : 'DOMAIN_UPDATED',
      target: updated.domain,
      ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
      details: `Updated domain: status=${updated.status}, mode=${updated.mode}, limit=${updated.rateLimitPerMin}`,
      result: 'SUCCESS',
    });

    return NextResponse.json({ success: true, domain: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed to update domain' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = verifyAdminSession(req);
  if (!session.valid) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const existing = securityStore.getDomainById(id);
    const domainName = existing?.domain || id;

    securityStore.deleteDomain(id);

    securityStore.addAuditLog({
      admin: session.username || 'admin',
      action: 'DOMAIN_DELETED',
      target: domainName,
      ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
      details: 'Domain authorization and associated API clients removed',
      result: 'SUCCESS',
    });

    return NextResponse.json({ success: true, message: 'Domain deleted' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed to delete domain' }, { status: 400 });
  }
}
