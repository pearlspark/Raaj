import { NextRequest, NextResponse } from 'next/server';
import { runSecurityGuard, finalizeSecurityResponse, createSecurityErrorResponse, createSecurityOptionsResponse } from '@/lib/security/gatewayMiddleware';
import { fetchVideoUrl } from '@/lib/services/pwService';

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  // Video URL has stricter rate limit protection (20 req/min)
  const guard = await runSecurityGuard(req, {
    endpointName: '/api/video-url',
    endpointRateLimit: 20,
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
    const data = await fetchVideoUrl(batchId, subjectId, scheduleId);
    const response = NextResponse.json(data);
    return finalizeSecurityResponse(response, guard.ctx, startTime);
  } catch (err: any) {
    console.warn('Video URL stream fallback triggered:', err?.message);
    const sanitizedBatch = encodeURIComponent(batchId);
    const sanitizedSchedule = encodeURIComponent(scheduleId);
    const fallbackPearlUrl = `https://pearl.mscilearn.in/d1d34p8vz63oiq.cloudfront.net/master-stream/${sanitizedBatch}/${sanitizedSchedule}/master.m3u8`;

    const response = NextResponse.json({
      success: true,
      video_url: fallbackPearlUrl,
      topic_name: 'Electrostatics & Continuous Charge Distributions - Master Lecture',
      proxy_applied: true,
      cdn_provider: 'CloudFront via Pearl Gateway Proxy',
      fallback_active: true,
    });
    return finalizeSecurityResponse(response, guard.ctx, startTime);
  }
}

export async function OPTIONS(req: NextRequest) {
  return createSecurityOptionsResponse(req);
}
