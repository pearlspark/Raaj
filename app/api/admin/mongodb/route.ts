import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/security/adminAuth';
import { checkMongoHealth } from '@/lib/db/mongodb';
import { securityStore } from '@/lib/security/store';

export async function GET(req: NextRequest) {
  const session = verifyAdminSession(req);
  if (!session.valid) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const status = await checkMongoHealth();
  return NextResponse.json({
    success: true,
    status,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  const session = verifyAdminSession(req);
  if (!session.valid) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await securityStore.syncToMongo();
    return NextResponse.json({
      success: true,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
