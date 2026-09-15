import { NextRequest, NextResponse } from 'next/server';
import { runSecurityGuard, finalizeSecurityResponse, createSecurityErrorResponse } from '@/lib/security/gatewayMiddleware';
import { fetchPW } from '@/lib/services/pwService';

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const guard = await runSecurityGuard(req, {
    endpointName: '/api/khazana',
    endpointRateLimit: 60,
  });

  if (!guard.allowed) {
    return guard.response;
  }

  const searchParams = req.nextUrl.searchParams;
  const endpoint = searchParams.get('endpoint');
  if (!endpoint) {
    return createSecurityErrorResponse(400, 'BAD_REQUEST', 'Khazana endpoint path required', guard.ctx.requestId);
  }

  const params: Record<string, string> = {};
  searchParams.forEach((val, key) => {
    if (key !== 'endpoint') params[key] = val;
  });

  const data = await fetchPW(endpoint, params);
  const response = NextResponse.json(data);
  return finalizeSecurityResponse(response, guard.ctx, startTime);
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': req.headers.get('origin') || '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-ID, X-Timestamp, X-Nonce, X-Signature, X-Request-ID',
      'Access-Control-Max-Age': '86400',
    },
  });
}
