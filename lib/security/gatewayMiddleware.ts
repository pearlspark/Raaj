import { NextRequest, NextResponse } from 'next/server';
import { securityStore } from './store';
import { generateRequestId, verifyAccessToken, computeRequestSignature, verifySecret } from './crypto';
import { normalizeDomain, isDomainAuthorized, extractClientDomain } from './domainGuard';
import { evaluateRisk } from './riskEngine';
import { DomainRecord } from './types';

export interface ProtectedRequestContext {
  requestId: string;
  ip: string;
  country: string;
  region: string;
  city: string;
  userAgent: string;
  origin: string;
  referer: string;
  domain?: DomainRecord;
  domainName: string;
  clientId?: string;
  authMethod: 'TOKEN' | 'SIGNATURE' | 'ORIGIN' | 'ANONYMOUS';
  riskScore: number;
}

/**
 * Standardized Safe JSON Error Response
 */
export function createSecurityErrorResponse(
  status: number,
  code: string,
  message: string,
  requestId: string,
  extraHeaders: Record<string, string> = {}
): NextResponse {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Request-ID': requestId,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    ...extraHeaders,
  };

  return new NextResponse(
    JSON.stringify({
      success: false,
      error: {
        code,
        message,
      },
      requestId,
    }),
    { status, headers }
  );
}

/**
 * Extract GeoIP / IP information from headers
 */
function extractClientIp(req: NextRequest): { ip: string; country: string; region: string; city: string } {
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  let ip = '127.0.0.1';

  if (forwardedFor) {
    ip = forwardedFor.split(',')[0].trim();
  } else if (realIp) {
    ip = realIp.trim();
  }

  // Cloudflare or GCP / Vercel geo headers if present
  const country =
    req.headers.get('cf-ipcountry') ||
    req.headers.get('x-vercel-ip-country') ||
    (ip === '127.0.0.1' ? 'Localhost' : 'Unknown');
  const region = req.headers.get('x-vercel-ip-country-region') || 'Global';
  const city = req.headers.get('x-vercel-ip-city') || 'Internet';

  return { ip, country, region, city };
}

/**
 * Gateway Security Guard function for API routes
 */
export async function runSecurityGuard(
  req: NextRequest,
  options: {
    endpointName: string;
    endpointRateLimit?: number;
    requiredPermission?: string;
  }
): Promise<{ allowed: true; ctx: ProtectedRequestContext } | { allowed: false; response: NextResponse }> {
  const startTime = Date.now();
  const requestId = req.headers.get('x-request-id') || generateRequestId();
  const { ip, country, region, city } = extractClientIp(req);
  const userAgent = req.headers.get('user-agent') || '';
  const originHeader = req.headers.get('origin') || '';
  const refererHeader = req.headers.get('referer') || '';
  const incomingClientHost = extractClientDomain(req.headers) || '';
  const pathname = req.nextUrl.pathname;
  const method = req.method;

  const settings = securityStore.getSettings();

  // 1. IP Blocklist & Cooldown Check
  const ipCheck = securityStore.isIpBlocked(ip);
  if (ipCheck.blocked) {
    securityStore.addRequestLog({
      id: 'log_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      requestId,
      timestamp: new Date().toISOString(),
      ip,
      country,
      region,
      city,
      userAgent,
      origin: originHeader,
      referer: refererHeader,
      clientId: 'unauthorized',
      domain: incomingClientHost || 'blocked-ip',
      endpoint: pathname,
      method,
      statusCode: 403,
      responseTimeMs: Date.now() - startTime,
      responseSizeBytes: 95,
      riskScore: 90,
      riskFactors: ['IP is blacklisted'],
      blocked: true,
      blockReason: ipCheck.reason,
    });

    return {
      allowed: false,
      response: createSecurityErrorResponse(
        403,
        'IP_BLOCKED',
        `Access denied: ${ipCheck.reason || 'IP address is temporarily or permanently restricted.'}`,
        requestId
      ),
    };
  }

  // 2. Global IP Rate Limiter
  const ipLimitResult = securityStore.checkRateLimit(
    `ip:${ip}`,
    settings.rateLimits.defaultIpPerMin,
    60
  );
  if (!ipLimitResult.allowed) {
    securityStore.addSecurityEvent({
      severity: 'HIGH',
      type: 'RATE_LIMIT_VIOLATION_IP',
      ip,
      endpoint: pathname,
      reason: `IP exceeded ${settings.rateLimits.defaultIpPerMin} requests/minute`,
      actionTaken: 'HTTP 429 response returned',
      requestId,
    });

    return {
      allowed: false,
      response: createSecurityErrorResponse(
        429,
        'RATE_LIMIT_EXCEEDED',
        'Too many requests from this IP address. Please slow down.',
        requestId,
        {
          'Retry-After': String(ipLimitResult.resetTimeSeconds),
          'X-RateLimit-Limit': String(settings.rateLimits.defaultIpPerMin),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(ipLimitResult.resetTimeSeconds),
        }
      ),
    };
  }

  // 3. Endpoint Specific Rate Limiter (e.g. Video URL has strict limits)
  if (options.endpointRateLimit) {
    const epLimitResult = securityStore.checkRateLimit(
      `ep:${options.endpointName}:${ip}`,
      options.endpointRateLimit,
      60
    );
    if (!epLimitResult.allowed) {
      securityStore.addSecurityEvent({
        severity: 'HIGH',
        type: 'RATE_LIMIT_VIOLATION_ENDPOINT',
        ip,
        endpoint: pathname,
        reason: `Exceeded specific endpoint threshold of ${options.endpointRateLimit} req/min for ${options.endpointName}`,
        actionTaken: 'HTTP 429 response returned',
        requestId,
      });

      return {
        allowed: false,
        response: createSecurityErrorResponse(
          429,
          'ENDPOINT_RATE_LIMIT_EXCEEDED',
          `Rate limit of ${options.endpointRateLimit} requests/min exceeded for this protected resource.`,
          requestId,
          {
            'Retry-After': String(epLimitResult.resetTimeSeconds),
          }
        ),
      };
    }
  }

  // 4. Authentication and Domain Authorization Verification
  let authMethod: 'TOKEN' | 'SIGNATURE' | 'ORIGIN' | 'ANONYMOUS' = 'ANONYMOUS';
  let matchedDomainRecord: DomainRecord | undefined;
  let validatedClientId: string | undefined;
  let tokenError: string | undefined;
  let signatureError: string | undefined;
  let domainError: string | undefined;
  let replayDetected = false;
  let isAuthorizedDomain = false;

  // A. Check Short-lived Bearer Token
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const tokenRes = verifyAccessToken(token);

    if (tokenRes.valid && tokenRes.payload) {
      const payload = tokenRes.payload;
      const client = securityStore.getClientById(payload.sub);
      const domain = client ? securityStore.getDomainById(client.domainId) : undefined;

      if (!client || client.status !== 'ACTIVE') {
        tokenError = 'Client has been revoked or deleted';
      } else if (!domain || domain.status !== 'ACTIVE') {
        tokenError = `Associated domain status is ${domain?.status || 'UNKNOWN'}`;
      } else {
        // Valid token!
        authMethod = 'TOKEN';
        validatedClientId = client.clientId;
        matchedDomainRecord = domain;
        isAuthorizedDomain = true;
      }
    } else {
      tokenError = tokenRes.error || 'Invalid token';
    }
  }

  // B. Check HMAC Request Signature & Nonce (Replay Protection)
  const headerClientId = req.headers.get('x-client-id');
  const headerTimestamp = req.headers.get('x-timestamp');
  const headerNonce = req.headers.get('x-nonce');
  const headerSignature = req.headers.get('x-signature');

  if (headerClientId && headerTimestamp && headerNonce && headerSignature) {
    const client = securityStore.getClientById(headerClientId);
    const domain = client ? securityStore.getDomainById(client.domainId) : undefined;

    if (!client || client.status !== 'ACTIVE') {
      signatureError = 'Client ID is invalid or revoked';
    } else if (!domain || domain.status !== 'ACTIVE') {
      signatureError = `Domain is ${domain?.status || 'INACTIVE'}`;
    } else {
      // Check timestamp clock-skew
      const reqTimeSec = parseInt(headerTimestamp, 10);
      const nowSec = Math.floor(Date.now() / 1000);
      const skew = Math.abs(nowSec - reqTimeSec);

      if (isNaN(reqTimeSec) || skew > settings.clockSkewSeconds) {
        signatureError = `Clock skew exceeded: request timestamp differs by ${skew}s (max allowed ${settings.clockSkewSeconds}s)`;
      } else {
        // Nonce freshness check (Replay Protection)
        const nonceRegistered = securityStore.registerNonce(headerNonce, settings.clockSkewSeconds);
        if (!nonceRegistered) {
          replayDetected = true;
          signatureError = 'Replay Attack: Nonce has already been used within active window';
        } else {
          // Verify HMAC
          // Compute expected signature using domain's stored secret hash / key
          const expectedSig = computeRequestSignature(
            domain.clientSecretHash,
            method,
            pathname,
            headerTimestamp,
            headerNonce,
            '' // body hash if applicable
          );

          if (verifySecret(headerSignature, expectedSig)) {
            authMethod = 'SIGNATURE';
            validatedClientId = client.clientId;
            matchedDomainRecord = domain;
            isAuthorizedDomain = true;
          } else {
            signatureError = 'HMAC signature verification mismatch';
          }
        }
      }
    }
  }

  // C. Check Domain Origin & Referer Against Authorized Whitelist
  if (!isAuthorizedDomain && incomingClientHost) {
    const allDomains = securityStore.getDomains();
    for (const d of allDomains) {
      const match = isDomainAuthorized(incomingClientHost, d);
      if (match.matched) {
        isAuthorizedDomain = true;
        matchedDomainRecord = d;
        authMethod = 'ORIGIN';
        validatedClientId = d.clientId;
        break;
      }
    }

    if (!isAuthorizedDomain) {
      domainError = `Origin / Domain '${incomingClientHost}' is not in authorized list`;
    }
  }

  // Allow same-origin / preview if running on the platform host or localhost in dev
  const reqHost = req.headers.get('host') || '';
  if (!isAuthorizedDomain && (reqHost.includes('run.app') || reqHost.includes('localhost'))) {
    // Check if localhost/current dev host is allowed in settings
    if (settings.allowLocalhostTesting) {
      isAuthorizedDomain = true;
      authMethod = 'ORIGIN';
      const localDom = securityStore.getDomains().find((d) => d.normalizedDomain.includes('localhost') || d.mode === 'EXACT');
      matchedDomainRecord = localDom;
      validatedClientId = localDom?.clientId || 'client_preview_dev';
    }
  }

  // 5. Evaluate Risk Engine
  const riskResult = evaluateRisk({
    ip,
    userAgent,
    origin: originHeader,
    referer: refererHeader,
    hasValidToken: authMethod === 'TOKEN',
    tokenError,
    hasValidSignature: authMethod === 'SIGNATURE',
    signatureError,
    isAuthorizedDomain,
    domainError,
    replayDetected,
    method,
    endpoint: pathname,
  });

  // 6. If Risk Engine decides to block or domain unauthorized
  if (riskResult.shouldBlock) {
    // Escalate to auto-block / cooldown if critical
    if (riskResult.level === 'CRITICAL' && settings.enableAutoBlock) {
      securityStore.setTemporaryIpCooldown(ip, settings.autoBlockDurationMinutes);
      securityStore.addSecurityEvent({
        severity: 'CRITICAL',
        type: 'AUTOMATIC_SECURITY_BLOCK',
        clientId: validatedClientId,
        domain: matchedDomainRecord?.normalizedDomain || incomingClientHost,
        ip,
        endpoint: pathname,
        reason: riskResult.blockReason || 'Critical risk threshold exceeded',
        actionTaken: `Temporary IP restriction applied for ${settings.autoBlockDurationMinutes} minutes`,
        requestId,
      });
    } else {
      securityStore.addSecurityEvent({
        severity: riskResult.level === 'HIGH' ? 'HIGH' : 'WARN',
        type: replayDetected ? 'REPLAY_ATTACK_DETECTED' : 'UNAUTHORIZED_ACCESS_ATTEMPT',
        clientId: validatedClientId,
        domain: matchedDomainRecord?.normalizedDomain || incomingClientHost,
        ip,
        endpoint: pathname,
        reason: riskResult.blockReason || 'Access forbidden',
        actionTaken: 'HTTP 403 Forbidden response returned',
        requestId,
      });
    }

    // Record access attempt in telemetry log
    securityStore.addRequestLog({
      id: 'log_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      requestId,
      timestamp: new Date().toISOString(),
      ip,
      country,
      region,
      city,
      userAgent,
      origin: originHeader,
      referer: refererHeader,
      clientId: validatedClientId || 'unauthorized',
      domain: matchedDomainRecord?.normalizedDomain || incomingClientHost || 'unauthorized',
      endpoint: pathname,
      method,
      statusCode: 403,
      responseTimeMs: Date.now() - startTime,
      responseSizeBytes: 120,
      riskScore: riskResult.score,
      riskFactors: riskResult.factors,
      blocked: true,
      blockReason: riskResult.blockReason,
    });

    return {
      allowed: false,
      response: createSecurityErrorResponse(
        403,
        'UNAUTHORIZED_DOMAIN',
        riskResult.blockReason || 'Access forbidden: Domain or client is not authorized to call this API.',
        requestId
      ),
    };
  }

  // 7. Domain Rate Limiting
  if (matchedDomainRecord) {
    const domainLimit = matchedDomainRecord.rateLimitPerMin || settings.rateLimits.defaultDomainPerMin;
    const domRateCheck = securityStore.checkRateLimit(`dom:${matchedDomainRecord.id}`, domainLimit, 60);

    if (!domRateCheck.allowed) {
      securityStore.addSecurityEvent({
        severity: 'HIGH',
        type: 'RATE_LIMIT_VIOLATION_DOMAIN',
        clientId: matchedDomainRecord.clientId,
        domain: matchedDomainRecord.domain,
        ip,
        endpoint: pathname,
        reason: `Domain exceeded ${domainLimit} requests/min`,
        actionTaken: 'HTTP 429 response returned',
        requestId,
      });

      securityStore.addRequestLog({
        id: 'log_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        requestId,
        timestamp: new Date().toISOString(),
        ip,
        country,
        region,
        city,
        userAgent,
        origin: originHeader,
        referer: refererHeader,
        clientId: matchedDomainRecord.clientId,
        domain: matchedDomainRecord.normalizedDomain,
        endpoint: pathname,
        method,
        statusCode: 429,
        responseTimeMs: Date.now() - startTime,
        responseSizeBytes: 110,
        riskScore: riskResult.score + 20,
        riskFactors: ['Domain Rate Limit Exceeded'],
        blocked: true,
        blockReason: 'Domain rate limit exceeded',
      });

      return {
        allowed: false,
        response: createSecurityErrorResponse(
          429,
          'DOMAIN_RATE_LIMIT_EXCEEDED',
          `Domain ${matchedDomainRecord.normalizedDomain} has exceeded its quota of ${domainLimit} requests/min.`,
          requestId,
          {
            'Retry-After': String(domRateCheck.resetTimeSeconds),
          }
        ),
      };
    }
  }

  const ctx: ProtectedRequestContext = {
    requestId,
    ip,
    country,
    region,
    city,
    userAgent,
    origin: originHeader,
    referer: refererHeader,
    domain: matchedDomainRecord,
    domainName: matchedDomainRecord?.normalizedDomain || incomingClientHost || 'authorized',
    clientId: validatedClientId,
    authMethod,
    riskScore: riskResult.score,
  };

  return { allowed: true, ctx };
}

/**
 * Handle CORS and record successful request telemetry
 */
export function finalizeSecurityResponse(
  res: NextResponse,
  ctx: ProtectedRequestContext,
  startTime: number
): NextResponse {
  const duration = Date.now() - startTime;
  const status = res.status;

  // Add security headers & Request ID
  res.headers.set('X-Request-ID', ctx.requestId);
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Dynamic CORS headers if origin is authorized
  if (ctx.domain && ctx.origin) {
    res.headers.set('Access-Control-Allow-Origin', ctx.origin);
    res.headers.set('Access-Control-Allow-Credentials', 'true');
    res.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Client-ID, X-Timestamp, X-Nonce, X-Signature, X-Request-ID'
    );
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  }

  // Record Telemetry Log
  securityStore.addRequestLog({
    id: 'log_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    requestId: ctx.requestId,
    timestamp: new Date().toISOString(),
    ip: ctx.ip,
    country: ctx.country,
    region: ctx.region,
    city: ctx.city,
    userAgent: ctx.userAgent,
    origin: ctx.origin,
    referer: ctx.referer,
    clientId: ctx.clientId || 'authorized',
    domain: ctx.domainName,
    endpoint: '', // set in caller or left clean
    method: 'GET',
    statusCode: status,
    responseTimeMs: duration,
    responseSizeBytes: 450,
    riskScore: ctx.riskScore,
    riskFactors: [],
    blocked: false,
  });

  return res;
}
