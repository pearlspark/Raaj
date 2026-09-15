import { NextRequest, NextResponse } from 'next/server';
import { runSecurityGuard, finalizeSecurityResponse, createSecurityErrorResponse } from '@/lib/security/gatewayMiddleware';
import { fetchPW, MASTER_BATCH_ID } from '@/lib/services/pwService';

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const guard = await runSecurityGuard(req, {
    endpointName: '/api/contents',
    endpointRateLimit: 60,
  });

  if (!guard.allowed) {
    return guard.response;
  }

  const { searchParams } = req.nextUrl;
  const subjectId = searchParams.get('subjectId');
  if (!subjectId) {
    return createSecurityErrorResponse(400, 'BAD_REQUEST', 'subjectId query parameter is required', guard.ctx.requestId);
  }

  const page = searchParams.get('page') || '1';
  const contentType = searchParams.get('contentType') || undefined;
  const tag = searchParams.get('tag') || undefined;

  const endpoint = `/v2/batches/${MASTER_BATCH_ID}/subject/${subjectId}/contents`;
  const data = await fetchPW(endpoint, { page, contentType, tag });

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
