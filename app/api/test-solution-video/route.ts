import { NextRequest, NextResponse } from 'next/server';
import { runSecurityGuard, finalizeSecurityResponse, createSecurityErrorResponse } from '@/lib/security/gatewayMiddleware';
import { fetchTestSolutionVideo } from '@/lib/services/pwService';

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const guard = await runSecurityGuard(req, {
    endpointName: '/api/test-solution-video',
    endpointRateLimit: 30,
  });

  if (!guard.allowed) {
    return guard.response;
  }

  const { searchParams } = req.nextUrl;
  const parentId = searchParams.get('parentId');
  const childId = searchParams.get('childId');
  const videoId = searchParams.get('videoId');

  if (!parentId || !childId || !videoId) {
    return createSecurityErrorResponse(
      400,
      'BAD_REQUEST',
      'parentId, childId, and videoId query parameters are required',
      guard.ctx.requestId
    );
  }

  const params: Record<string, string> = { parentId, childId, videoId };
  const videoUrl = searchParams.get('videoUrl');
  const url_type = searchParams.get('url_type');
  if (videoUrl) params.videoUrl = videoUrl;
  if (url_type) params.url_type = url_type;

  try {
    const data = await fetchTestSolutionVideo(params);
    const response = NextResponse.json(data);
    return finalizeSecurityResponse(response, guard.ctx, startTime);
  } catch (err: any) {
    return createSecurityErrorResponse(404, 'NOT_FOUND', 'Failed to fetch solution video stream', guard.ctx.requestId);
  }
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
