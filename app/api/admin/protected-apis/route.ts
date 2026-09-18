import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/security/adminAuth';
import { securityStore } from '@/lib/security/store';
import { generateEncryptionKey, encryptPayload, decryptPayload } from '@/lib/security/crypto';

export async function GET(req: NextRequest) {
  const session = verifyAdminSession(req);
  if (!session.valid) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const apis = securityStore.getProtectedApis();
  const settings = securityStore.getSettings();

  return NextResponse.json({
    success: true,
    apis,
    masterEncryptionKey: settings.masterEncryptionKey,
  });
}

export async function POST(req: NextRequest) {
  const session = verifyAdminSession(req);
  if (!session.valid) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, upstreamUrl, slug, encryptionEnabled, encryptionKey, rateLimitPerMin, status, methods } = body;

    if (!upstreamUrl || typeof upstreamUrl !== 'string' || !upstreamUrl.trim()) {
      return NextResponse.json({ success: false, error: 'Target API URL is required (e.g., https://web-production-bcc00.up.railway.app/api/batches)' }, { status: 400 });
    }

    if (!slug || typeof slug !== 'string' || !slug.trim()) {
      return NextResponse.json({ success: false, error: 'Proxy Slug is required (e.g., /api/batches)' }, { status: 400 });
    }

    const rawSlug = slug.trim().split('?')[0];
    const normalizedSlug = rawSlug.startsWith('/') ? rawSlug : `/${rawSlug}`;

    // Check if slug already exists
    const existing = securityStore.getProtectedApiBySlug(normalizedSlug);
    if (existing) {
      return NextResponse.json({
        success: false,
        error: `Proxy slug "${normalizedSlug}" is already configured for "${existing.name}". Please choose another slug or edit the existing one.`
      }, { status: 400 });
    }

    const added = securityStore.addProtectedApi({
      name: name?.trim() || normalizedSlug,
      upstreamUrl: upstreamUrl.trim(),
      slug: normalizedSlug,
      encryptionEnabled: encryptionEnabled !== false,
      encryptionKey: encryptionKey?.trim() ? encryptionKey.trim() : undefined,
      rateLimitPerMin: rateLimitPerMin ? parseInt(rateLimitPerMin, 10) : 60,
      status: status === 'DISABLED' ? 'DISABLED' : 'ACTIVE',
      methods: Array.isArray(methods) && methods.length > 0 ? methods : ['GET', 'POST'],
    });

    securityStore.addAuditLog({
      admin: session.username || 'admin',
      action: 'PROTECTED_API_ADDED',
      target: normalizedSlug,
      ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
      details: `Added protected route [${normalizedSlug}] -> ${upstreamUrl.trim()}. Encryption: ${added.encryptionEnabled ? 'ENABLED' : 'DISABLED'}`,
      result: 'SUCCESS',
    });

    return NextResponse.json({
      success: true,
      api: added,
      message: `API route ${normalizedSlug} successfully protected!`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed to add protected API' }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  const session = verifyAdminSession(req);
  if (!session.valid) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'API ID is required' }, { status: 400 });
    }

    const updated = securityStore.updateProtectedApi(id, updates);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'API route not found' }, { status: 404 });
    }

    securityStore.addAuditLog({
      admin: session.username || 'admin',
      action: 'PROTECTED_API_UPDATED',
      target: updated.slug,
      ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
      details: `Updated protected route [${updated.slug}]. Upstream: ${updated.upstreamUrl}`,
      result: 'SUCCESS',
    });

    return NextResponse.json({ success: true, api: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed to update protected API' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = verifyAdminSession(req);
  if (!session.valid) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'API ID is required' }, { status: 400 });
    }

    const target = securityStore.getProtectedApi(id);
    const deleted = securityStore.deleteProtectedApi(id);

    if (!deleted) {
      return NextResponse.json({ success: false, error: 'API route not found' }, { status: 404 });
    }

    securityStore.addAuditLog({
      admin: session.username || 'admin',
      action: 'PROTECTED_API_DELETED',
      target: target?.slug || id,
      ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
      details: `Deleted protected API route ${target?.slug || id}`,
      result: 'SUCCESS',
    });

    return NextResponse.json({ success: true, message: 'Protected API deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed to delete protected API' }, { status: 400 });
  }
}
