import { NextRequest, NextResponse } from 'next/server';
import { runSecurityGuard, finalizeSecurityResponse, createSecurityErrorResponse, createSecurityOptionsResponse } from '@/lib/security/gatewayMiddleware';
import { fetchLiveUrl } from '@/lib/services/pwService';

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const guard = await runSecurityGuard(req, {
    endpointName: '/api/live-url',
    endpointRateLimit: 30,
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
      'batchId, subjectId, and scheduleId are required parameters',
      guard.ctx.requestId
    );
  }

  try {
    const data = await fetchLiveUrl(batchId, subjectId, scheduleId);
    const response = NextResponse.json(data);
    return finalizeSecurityResponse(response, guard.ctx, startTime);
  } catch (err: any) {
    return createSecurityErrorResponse(502, 'UPSTREAM_LIVE_ERROR', 'Live video stream unavailable', guard.ctx.requestId);
  }
}

export async function OPTIONS(req: NextRequest) {
  return createSecurityOptionsResponse(req);
}
