import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/security/adminAuth';
import { securityStore } from '@/lib/security/store';

export async function GET(req: NextRequest) {
  const session = verifyAdminSession(req);
  if (!session.valid) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const format = searchParams.get('format'); // 'json' or 'csv'
  const search = searchParams.get('search') || undefined;
  const domain = searchParams.get('domain') || undefined;
  const clientId = searchParams.get('clientId') || undefined;
  const ip = searchParams.get('ip') || undefined;
  const endpoint = searchParams.get('endpoint') || undefined;
  const statusCode = searchParams.get('statusCode') ? parseInt(searchParams.get('statusCode')!, 10) : undefined;
  const riskLevel = searchParams.get('riskLevel') || undefined;
  const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;

  const result = securityStore.getRequestLogs({
    search,
    domain,
    clientId,
    ip,
    endpoint,
    statusCode,
    riskLevel,
    page,
    limit: format === 'csv' ? 1000 : limit,
  });

  if (format === 'csv') {
    const headers = [
      'Timestamp',
      'Request ID',
      'Domain',
      'Client ID',
      'IP',
      'Country',
      'Endpoint',
      'Method',
      'Status',
      'Latency (ms)',
      'Risk Score',
      'Blocked',
    ];
    const rows = result.logs.map((l) => [
      `"${l.timestamp}"`,
      `"${l.requestId}"`,
      `"${l.domain}"`,
      `"${l.clientId}"`,
      `"${l.ip}"`,
      `"${l.country}"`,
      `"${l.endpoint}"`,
      `"${l.method}"`,
      l.statusCode,
      l.responseTimeMs,
      l.riskScore,
      l.blocked ? 'YES' : 'NO',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="api_shield_request_logs.csv"',
      },
    });
  }

  return NextResponse.json({
    success: true,
    ...result,
  });
}
