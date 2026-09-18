import { NextRequest, NextResponse } from 'next/server';
import { runSecurityGuard, finalizeSecurityResponse, createSecurityOptionsResponse, createSecurityErrorResponse } from '@/lib/security/gatewayMiddleware';
import { securityStore } from '@/lib/security/store';
import { proxyToCustomUrl } from './upstreamService';
import { encryptPayload } from '@/lib/security/crypto';

export async function handleDynamicProtectedRequest(req: NextRequest, slugSegments: string[]) {
  const startTime = Date.now();
  const rawPath = '/api/' + slugSegments.join('/');
  const normalizedPath = rawPath.split('?')[0].toLowerCase();

  // Look for configured protected API route
  let protectedApi = securityStore.getProtectedApiBySlug(normalizedPath);

  // If not found by full path, try matching prefix if sub-routes are supported
  if (!protectedApi && slugSegments.length > 1) {
    const parentPath = '/api/' + slugSegments[0];
    const parentApi = securityStore.getProtectedApiBySlug(parentPath);
    if (parentApi) {
      protectedApi = parentApi;
    }
  }

  // Not found in configured APIs
  if (!protectedApi) {
    return NextResponse.json({
      success: false,
      error: {
        code: 'API_NOT_FOUND',
        message: 'Need APIs Contact on Telegram @sparkxflare',
      },
      message: 'Need APIs Contact on Telegram @sparkxflare',
      contact: 'Telegram @sparkxflare',
      configured: false,
      endpoint: rawPath,
    }, { status: 404 });
  }

  // Check if API is disabled
  if (protectedApi.status === 'DISABLED') {
    return NextResponse.json({
      success: false,
      error: {
        code: 'API_DISABLED',
        message: 'This protected API endpoint is currently suspended by administrator',
      },
    }, { status: 503 });
  }

  // Check HTTP method if specified
  const method = req.method.toUpperCase();
  if (
    protectedApi.methods &&
    protectedApi.methods.length > 0 &&
    !protectedApi.methods.includes('ALL') &&
    !protectedApi.methods.includes(method)
  ) {
    return NextResponse.json({
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: `Method ${method} is not allowed for this route. Allowed: ${protectedApi.methods.join(', ')}`,
      },
    }, { status: 405 });
  }

  // Enforce zero-trust security gateway check (Origin, Domain, Token, Signature, Browser Bot Block, Rate Limit)
  const guard = await runSecurityGuard(req, {
    endpointName: protectedApi.slug,
    endpointRateLimit: protectedApi.rateLimitPerMin || 60,
  });

  if (!guard.allowed) {
    return guard.response;
  }

  // Forward to target upstream URL
  let targetUrl = protectedApi.upstreamUrl;
  // If request had sub-path beyond the base slug, append it
  if (protectedApi.slug.toLowerCase() !== normalizedPath) {
    const remainder = rawPath.substring(protectedApi.slug.length);
    if (remainder) {
      const glue = targetUrl.endsWith('/') || remainder.startsWith('/') ? '' : '/';
      targetUrl = `${targetUrl}${glue}${remainder.startsWith('/') ? remainder.substring(1) : remainder}`;
    }
  }

  const upstream = await proxyToCustomUrl(targetUrl, req.nextUrl.searchParams, req);
  const latency = Date.now() - startTime;

  // Record metrics
  securityStore.recordProtectedApiMetrics(protectedApi.id, upstream.status < 400, latency);

  const settings = securityStore.getSettings();
  const encryptionKey = protectedApi.encryptionKey || settings.masterEncryptionKey || 'api-shield-master-key';

  let finalPayload: any = upstream.data;

  // Encrypt payload if enabled
  if (protectedApi.encryptionEnabled !== false) {
    try {
      finalPayload = encryptPayload(upstream.data, encryptionKey);
    } catch (encErr: any) {
      console.error('[Dynamic Proxy] Encryption error:', encErr);
      return NextResponse.json({
        success: false,
        error: 'ENCRYPTION_FAILED',
        message: 'Security enclave could not encrypt upstream payload',
      }, { status: 500 });
    }
  }

  const response = NextResponse.json(finalPayload, { status: upstream.status });
  return finalizeSecurityResponse(response, guard.ctx, startTime);
}
