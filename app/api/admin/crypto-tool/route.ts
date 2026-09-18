import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/security/adminAuth';
import { generateEncryptionKey, encryptPayload, decryptPayload } from '@/lib/security/crypto';
import { securityStore } from '@/lib/security/store';

export async function POST(req: NextRequest) {
  const session = verifyAdminSession(req);
  if (!session.valid) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, payload, key } = body;
    const settings = securityStore.getSettings();
    const activeKey = key?.trim() || settings.masterEncryptionKey || 'api-shield-master-key';

    if (action === 'generate-key') {
      const newKey = generateEncryptionKey();
      return NextResponse.json({ success: true, key: newKey });
    }

    if (action === 'encrypt') {
      if (payload === undefined || payload === null) {
        return NextResponse.json({ success: false, error: 'Payload is required' }, { status: 400 });
      }
      let parsed = payload;
      if (typeof payload === 'string') {
        try {
          parsed = JSON.parse(payload);
        } catch {
          parsed = payload;
        }
      }
      const encrypted = encryptPayload(parsed, activeKey);
      return NextResponse.json({
        success: true,
        encrypted,
        format: '{"data": "<iv_hex>:<ciphertext_hex>"}',
        keyUsed: activeKey.substring(0, 8) + '...',
      });
    }

    if (action === 'decrypt') {
      if (!payload || typeof payload !== 'string') {
        return NextResponse.json({ success: false, error: 'Encrypted string payload is required' }, { status: 400 });
      }
      try {
        const decrypted = decryptPayload(payload, activeKey);
        return NextResponse.json({
          success: true,
          decrypted,
        });
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          error: `Decryption failed: ${err?.message || 'Invalid key or corrupted data'}`,
        }, { status: 400 });
      }
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Crypto tool error' }, { status: 400 });
  }
}
