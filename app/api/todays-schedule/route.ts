import { NextRequest, NextResponse } from 'next/server';
import { runSecurityGuard, finalizeSecurityResponse, createSecurityErrorResponse, createSecurityOptionsResponse } from '@/lib/security/gatewayMiddleware';
import { fetchPW } from '@/lib/services/pwService';

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const guard = await runSecurityGuard(req, {
    endpointName: '/api/todays-schedule',
    endpointRateLimit: 60,
  });

  if (!guard.allowed) {
    return guard.response;
  }

  const batchId = req.nextUrl.searchParams.get('batchId');
  if (!batchId) {
    return createSecurityErrorResponse(400, 'BAD_REQUEST', 'batchId query parameter is required', guard.ctx.requestId);
  }

  const data = await fetchPW(`/v2/batches/${batchId}/todays-schedule`);
  const response = NextResponse.json(data);
  return finalizeSecurityResponse(response, guard.ctx, startTime);
}

export async function OPTIONS(req: NextRequest) {
  return createSecurityOptionsResponse(req);
}
