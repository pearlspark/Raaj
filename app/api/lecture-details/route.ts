import { NextRequest, NextResponse } from 'next/server';
import { runSecurityGuard, finalizeSecurityResponse, createSecurityErrorResponse, createSecurityOptionsResponse } from '@/lib/security/gatewayMiddleware';
import { fetchPW, MASTER_BATCH_ID } from '@/lib/services/pwService';

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const guard = await runSecurityGuard(req, {
    endpointName: '/api/lecture-details',
    endpointRateLimit: 60,
  });

  if (!guard.allowed) {
    return guard.response;
  }

  const { searchParams } = req.nextUrl;
  const subjectId = searchParams.get('subjectId');
  const scheduleId = searchParams.get('scheduleId');

  if (!subjectId || !scheduleId) {
    return createSecurityErrorResponse(
      400,
      'BAD_REQUEST',
      'subjectId and scheduleId query parameters are required',
      guard.ctx.requestId
    );
  }

  const endpoint = `/v1/batches/${MASTER_BATCH_ID}/subject/${subjectId}/schedule/${scheduleId}/schedule-details`;
  const data = await fetchPW(endpoint);

  const response = NextResponse.json(data);
  return finalizeSecurityResponse(response, guard.ctx, startTime);
}

export async function OPTIONS(req: NextRequest) {
  return createSecurityOptionsResponse(req);
}
