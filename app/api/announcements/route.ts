import { NextRequest, NextResponse } from 'next/server';
import { runSecurityGuard, finalizeSecurityResponse, createSecurityErrorResponse, createSecurityOptionsResponse } from '@/lib/security/gatewayMiddleware';
import { proxyToUpstream } from '@/lib/services/upstreamService';

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const guard = await runSecurityGuard(req, {
    endpointName: '/api/announcements',
    endpointRateLimit: 60,
  });

  if (!guard.allowed) {
    return guard.response;
  }

  const batchId = req.nextUrl.searchParams.get('batchId');
  if (!batchId) {
    return createSecurityErrorResponse(400, 'BAD_REQUEST', 'batchId query parameter is required', guard.ctx.requestId);
  }

  const upstream = await proxyToUpstream('/api/announcements', req.nextUrl.searchParams, req);
  const response = NextResponse.json(upstream.data, { status: upstream.status });
  return finalizeSecurityResponse(response, guard.ctx, startTime);
}

export async function OPTIONS(req: NextRequest) {
  return createSecurityOptionsResponse(req);
}

