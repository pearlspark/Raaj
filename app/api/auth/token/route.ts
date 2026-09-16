import { NextRequest, NextResponse } from 'next/server';
import { securityStore } from '@/lib/security/store';
import { verifySecret, signAccessToken, generateRequestId } from '@/lib/security/crypto';
import { isDomainAuthorized, extractClientDomain } from '@/lib/security/domainGuard';
import { createSecurityErrorResponse, createSecurityOptionsResponse } from '@/lib/security/gatewayMiddleware';

export async function OPTIONS(req: NextRequest) {
  return createSecurityOptionsResponse(req);
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const body = await req.json();
    const { clientId, clientSecret } = body;

    if (!clientId || !clientSecret) {
      return createSecurityErrorResponse(400, 'MISSING_CREDENTIALS', 'clientId and clientSecret are required', requestId);
    }

    const client = securityStore.getClientById(clientId);
    if (!client) {
      return createSecurityErrorResponse(401, 'INVALID_CLIENT', 'Client ID not recognized', requestId);
    }

    if (client.status !== 'ACTIVE') {
      return createSecurityErrorResponse(403, 'CLIENT_REVOKED', 'This API client has been revoked by the administrator', requestId);
    }

    const domain = securityStore.getDomainById(client.domainId);
    if (!domain) {
      return createSecurityErrorResponse(403, 'DOMAIN_NOT_FOUND', 'No authorized domain associated with client', requestId);
    }

    if (domain.status !== 'ACTIVE') {
      return createSecurityErrorResponse(
        403,
        'DOMAIN_INACTIVE',
        `Authorized domain is currently ${domain.status}. Contact administrator.`,
        requestId
      );
    }

    // Verify secret with constant-time comparison
    const isSecretValid = verifySecret(clientSecret, domain.clientSecretHash);
    if (!isSecretValid) {
      securityStore.addSecurityEvent({
        severity: 'HIGH',
        type: 'INVALID_CREDENTIALS_ATTEMPT',
        clientId,
        domain: domain.normalizedDomain,
        ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
        endpoint: '/api/auth/token',
        reason: 'Failed secret verification for client ID',
        actionTaken: 'Authentication rejected with 401',
        requestId,
      });

      return createSecurityErrorResponse(401, 'INVALID_SECRET', 'Client secret is invalid', requestId);
    }

    // Validate Origin / Referer if present in browser request
    const incomingDomain = extractClientDomain(req.headers);
    if (incomingDomain) {
      const match = isDomainAuthorized(incomingDomain, domain);
      if (!match.matched) {
        securityStore.addSecurityEvent({
          severity: 'HIGH',
          type: 'DOMAIN_MISMATCH_ON_AUTH',
          clientId,
          domain: incomingDomain,
          ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
          endpoint: '/api/auth/token',
          reason: `Attempted token generation for domain '${domain.normalizedDomain}' from unauthorized origin '${incomingDomain}'`,
          actionTaken: 'HTTP 403 Forbidden',
          requestId,
        });

        return createSecurityErrorResponse(
          403,
          'ORIGIN_MISMATCH',
          `Cannot issue token: origin '${incomingDomain}' does not match client's authorized domain policy.`,
          requestId
        );
      }
    }

    // Issue short-lived signed access token (15 mins = 900 seconds)
    const tokenTtl = 900;
    const token = signAccessToken(
      {
        jti: 'tok_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        sub: client.clientId,
        domain: domain.normalizedDomain,
        permissions: client.permissions,
      },
      tokenTtl
    );

    client.lastUsedAt = new Date().toISOString();
    domain.lastActiveAt = new Date().toISOString();

    const origin = req.headers.get('origin');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
    };

    if (origin) {
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Access-Control-Allow-Credentials'] = 'true';
    }

    return new NextResponse(
      JSON.stringify({
        success: true,
        token_type: 'Bearer',
        access_token: token,
        expires_in: tokenTtl,
        client_id: client.clientId,
        domain: domain.normalizedDomain,
        permissions: client.permissions,
        issued_at: new Date().toISOString(),
        requestId,
      }),
      { status: 200, headers }
    );
  } catch (err: any) {
    return createSecurityErrorResponse(500, 'SERVER_ERROR', 'Failed to generate access token: ' + err.message, requestId);
  }
}
