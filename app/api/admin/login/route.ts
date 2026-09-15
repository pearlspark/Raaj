import { NextRequest, NextResponse } from 'next/server';
import { securityStore } from '@/lib/security/store';
import { verifyAdminPassword } from '@/lib/security/crypto';
import { issueAdminSessionToken, verifyAdminSession } from '@/lib/security/adminAuth';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'Username and password are required' }, { status: 400 });
    }

    const admin = securityStore.getAdminByUsername(username);
    if (!admin) {
      securityStore.addAuditLog({
        admin: username,
        action: 'ADMIN_LOGIN_FAILED',
        target: 'system',
        ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
        details: 'Invalid username submitted',
        result: 'FAILURE',
      });
      return NextResponse.json({ success: false, error: 'Invalid admin credentials' }, { status: 401 });
    }

    const isValid = verifyAdminPassword(password, admin.passwordHash, admin.passwordSalt);
    if (!isValid) {
      securityStore.addAuditLog({
        admin: username,
        action: 'ADMIN_LOGIN_FAILED',
        target: 'system',
        ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
        details: 'Incorrect password entered',
        result: 'FAILURE',
      });
      return NextResponse.json({ success: false, error: 'Invalid admin credentials' }, { status: 401 });
    }

    securityStore.updateAdminLastLogin(username);
    const token = issueAdminSessionToken(username);

    securityStore.addAuditLog({
      admin: username,
      action: 'ADMIN_LOGIN_SUCCESS',
      target: 'system',
      ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
      details: 'Administrator logged into console',
      result: 'SUCCESS',
    });

    const res = NextResponse.json({
      success: true,
      user: {
        username: admin.username,
        role: admin.role,
      },
      token,
    });

    // Set secure HttpOnly cookie
    res.cookies.set('shield_admin_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 86400, // 24 hours
    });

    return res;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'Login server error: ' + err.message }, { status: 500 });
  }
}
