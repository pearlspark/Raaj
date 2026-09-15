import { NextRequest, NextResponse } from 'next/server';
import { runSecurityGuard, finalizeSecurityResponse, createSecurityErrorResponse } from '@/lib/security/gatewayMiddleware';
import { fetchPW } from '@/lib/services/pwService';

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const guard = await runSecurityGuard(req, {
    endpointName: '/api/topics',
    endpointRateLimit: 60,
  });

  if (!guard.allowed) {
    return guard.response;
  }

  const { searchParams } = req.nextUrl;
  const batchId = searchParams.get('batchId');
  const subjectId = searchParams.get('subjectId');
  const page = searchParams.get('page') || '1';

  if (!batchId || !subjectId) {
    return createSecurityErrorResponse(400, 'BAD_REQUEST', 'batchId and subjectId query parameters are required', guard.ctx.requestId);
  }

  const endpoint = `/v2/batches/${batchId}/subject/${subjectId}/topics`;
  const data = await fetchPW(endpoint, { page });

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
