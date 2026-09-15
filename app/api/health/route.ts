import { NextRequest, NextResponse } from 'next/server';
import { generateRequestId } from '@/lib/security/crypto';

export async function GET(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || generateRequestId();

  return NextResponse.json(
    {
      status: 'OK',
      message: 'PW API Gateway is online and healthy',
      timestamp: new Date().toISOString(),
      requestId,
    },
    {
      status: 200,
      headers: {
        'X-Request-ID': requestId,
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'Cache-Control': 'no-cache',
      },
    }
  );
}
