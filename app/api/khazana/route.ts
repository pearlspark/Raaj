import { NextRequest, NextResponse } from 'next/server';
import { runSecurityGuard, finalizeSecurityResponse, createSecurityErrorResponse, createSecurityOptionsResponse } from '@/lib/security/gatewayMiddleware';
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
  return createSecurityOptionsResponse(req);
}
