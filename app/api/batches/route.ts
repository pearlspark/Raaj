import { NextRequest, NextResponse } from 'next/server';
import { runSecurityGuard, finalizeSecurityResponse, createSecurityOptionsResponse } from '@/lib/security/gatewayMiddleware';
import { proxyToUpstream } from '@/lib/services/upstreamService';

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const guard = await runSecurityGuard(req, {
    endpointName: '/api/batches',
    endpointRateLimit: 60,
  });

  if (!guard.allowed) {
    return guard.response;
  }

  const upstream = await proxyToUpstream('/api/batches', req.nextUrl.searchParams, req);
  const response = NextResponse.json(upstream.data, { status: upstream.status });
  return finalizeSecurityResponse(response, guard.ctx, startTime);
}

export async function OPTIONS(req: NextRequest) {
  return createSecurityOptionsResponse(req);
}

