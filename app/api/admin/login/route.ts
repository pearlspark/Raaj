import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { securityStore } from '@/lib/security/store';
import { issueAdminSessionToken } from '@/lib/security/adminAuth';

function constantTimeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'utf-8');
    const bufB = Buffer.from(b, 'utf-8');
    if (bufA.length !== bufB.length) {
      // Execute dummy timing operation to maintain constant time
      crypto.timingSafeEqual(bufB, bufB);
      return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'Username and password are required' }, { status: 400 });
    }

    const envAdminUsername = (process.env.ADMIN_USERNAME || 'admin').trim();
    const envAdminPassword = process.env.ADMIN_PASSWORD;

    if (!envAdminPassword) {
      return NextResponse.json(
        {
          success: false,
          error:
            'ADMIN_PASSWORD is not configured in environment variables (.env). For security, admin access requires ADMIN_PASSWORD configured in your environment settings.',
        },
        { status: 500 }
      );
    }

    // Verify username and password against environment variables in constant time
    const isUserValid = constantTimeCompare(username.trim().toLowerCase(), envAdminUsername.toLowerCase());
    const isPassValid = constantTimeCompare(password, envAdminPassword);

    if (!isUserValid || !isPassValid) {
      securityStore.addAuditLog({
        admin: username,
        action: 'ADMIN_LOGIN_FAILED',
        target: 'system',
        ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
        details: !isUserValid ? 'Invalid username submitted' : 'Incorrect password entered',
        result: 'FAILURE',
      });
      return NextResponse.json({ success: false, error: 'Invalid admin credentials' }, { status: 401 });
    }

    securityStore.updateAdminLastLogin(envAdminUsername);
    const token = issueAdminSessionToken(envAdminUsername);

    securityStore.addAuditLog({
      admin: envAdminUsername,
      action: 'ADMIN_LOGIN_SUCCESS',
      target: 'system',
      ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
      details: 'Administrator logged into console via environment credentials',
      result: 'SUCCESS',
    });

    const res = NextResponse.json({
      success: true,
      user: {
        username: envAdminUsername,
        role: 'SUPER_ADMIN',
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
