import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/security/adminAuth';
import { securityStore } from '@/lib/security/store';

export async function GET(req: NextRequest) {
  const session = verifyAdminSession(req);
  if (!session.valid) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const domains = securityStore.getDomains();
  const clients = securityStore.getClients();
  return NextResponse.json({ success: true, domains, clients });
}

export async function POST(req: NextRequest) {
  const session = verifyAdminSession(req);
  if (!session.valid) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { domain, mode, rateLimitPerMin, clientName } = body;

    if (!domain) {
      return NextResponse.json({ success: false, error: 'Domain is required' }, { status: 400 });
    }

    const { domainRecord, rawSecret } = securityStore.addDomain({
      domain,
      mode: mode === 'EXACT' ? 'EXACT' : 'SUBDOMAIN',
      rateLimitPerMin: rateLimitPerMin ? parseInt(rateLimitPerMin, 10) : undefined,
      clientName,
    });

    securityStore.addAuditLog({
      admin: session.username || 'admin',
      action: 'DOMAIN_ADDED',
      target: domainRecord.domain,
      ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
      details: `Registered authorized domain in ${domainRecord.mode} mode. Client ID: ${domainRecord.clientId}`,
      result: 'SUCCESS',
    });

    return NextResponse.json({
      success: true,
      domain: domainRecord,
      // The rawSecret is ONLY returned once right now, and never stored or returned again!
      rawSecret,
      warning: 'Store this client secret securely now. It will never be displayed again.',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed to add domain' }, { status: 400 });
  }
}
