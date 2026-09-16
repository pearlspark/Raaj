import { NextRequest, NextResponse } from 'next/server';
import { runSecurityGuard, finalizeSecurityResponse, createSecurityErrorResponse, createSecurityOptionsResponse } from '@/lib/security/gatewayMiddleware';
import { fetchPW } from '@/lib/services/pwService';

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const guard = await runSecurityGuard(req, {
    endpointName: '/api/slides',
    endpointRateLimit: 60,
  });

  if (!guard.allowed) {
    return guard.response;
  }

  const { searchParams } = req.nextUrl;
  const batchId = searchParams.get('batchId');
  const subjectId = searchParams.get('subjectId');
  const scheduleId = searchParams.get('scheduleId');

  if (!batchId || !subjectId || !scheduleId) {
    return createSecurityErrorResponse(
      400,
      'BAD_REQUEST',
      'batchId, subjectId, and scheduleId are required query parameters',
      guard.ctx.requestId
    );
  }

  const endpoint = `/v1/batches/${batchId}/subject/${subjectId}/schedule/${scheduleId}/slides`;
  const data = await fetchPW(endpoint);

  const response = NextResponse.json(data);
  return finalizeSecurityResponse(response, guard.ctx, startTime);
}

export async function OPTIONS(req: NextRequest) {
  return createSecurityOptionsResponse(req);
}
