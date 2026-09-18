import { NextRequest } from 'next/server';

const UPSTREAM_API_BASE = (process.env.UPSTREAM_API_URL || 'https://web-production-bcc00.up.railway.app').replace(/\/+$/, '');

export interface UpstreamProxyResult {
  status: number;
  data: any;
  error?: string;
}

/**
 * Proxy an incoming gateway request to the real Railway upstream API.
 * Preserves query parameters, passes proper headers, and returns the authentic JSON response.
 */
export async function proxyToUpstream(
  endpointPath: string,
  searchParams?: URLSearchParams,
  incomingReq?: NextRequest,
  customTimeoutMs: number = 20000
): Promise<UpstreamProxyResult> {
  const normalizedPath = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
  return proxyToCustomUrl(`${UPSTREAM_API_BASE}${normalizedPath}`, searchParams, incomingReq, customTimeoutMs);
}

/**
 * Proxy to any dynamic upstream URL (e.g., https://web-production-bcc00.up.railway.app/api/batches)
 */
export async function proxyToCustomUrl(
  rawTargetUrl: string,
  searchParams?: URLSearchParams,
  incomingReq?: NextRequest,
  customTimeoutMs: number = 25000
): Promise<UpstreamProxyResult> {
  let targetUrl: URL;
  try {
    if (rawTargetUrl.startsWith('http://') || rawTargetUrl.startsWith('https://')) {
      targetUrl = new URL(rawTargetUrl);
    } else {
      const normalizedPath = rawTargetUrl.startsWith('/') ? rawTargetUrl : `/${rawTargetUrl}`;
      targetUrl = new URL(`${UPSTREAM_API_BASE}${normalizedPath}`);
    }
  } catch (err: any) {
    return {
      status: 400,
      data: {
        success: false,
        error: 'INVALID_UPSTREAM_URL',
        message: `Invalid upstream target URL: ${rawTargetUrl}`,
      },
    };
  }

  if (searchParams) {
    searchParams.forEach((value, key) => {
      // Don't duplicate if already present in targetUrl
      if (!targetUrl.searchParams.has(key)) {
        targetUrl.searchParams.append(key, value);
      }
    });
  }

  const headers: Record<string, string> = {
    'Accept': 'application/json, text/plain, */*',
    'User-Agent': 'API-Shield-Gateway/2.5 (Enterprise Security Proxy)',
  };

  let bodyData: any = undefined;
  if (incomingReq) {
    const method = incomingReq.method || 'GET';
    const contentType = incomingReq.headers.get('content-type');
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      try {
        const text = await incomingReq.text();
        if (text) bodyData = text;
      } catch {
        // ignore
      }
    }
  }

  try {
    const res = await fetch(targetUrl.toString(), {
      method: incomingReq?.method || 'GET',
      headers,
      body: bodyData,
      signal: AbortSignal.timeout(customTimeoutMs),
      cache: 'no-store',
    });

    const contentType = res.headers.get('content-type') || '';
    let responseData: any;

    if (contentType.includes('application/json')) {
      responseData = await res.json();
    } else {
      const text = await res.text();
      try {
        responseData = JSON.parse(text);
      } catch {
        responseData = { success: res.ok, raw: text };
      }
    }

    return {
      status: res.status,
      data: responseData,
    };
  } catch (error: any) {
    console.error(`[Gateway Proxy Error] Target: ${targetUrl.toString()} ->`, error?.message);
    return {
      status: 502,
      data: {
        success: false,
        error: 'UPSTREAM_GATEWAY_TIMEOUT',
        message: `Upstream service request failed or timed out: ${error?.message || 'Connection failure'}`,
        upstreamUrl: targetUrl.toString(),
      },
    };
  }
}

