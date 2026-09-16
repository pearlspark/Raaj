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
  // Normalize path
  const normalizedPath = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
  const targetUrl = new URL(`${UPSTREAM_API_BASE}${normalizedPath}`);

  if (searchParams) {
    searchParams.forEach((value, key) => {
      targetUrl.searchParams.append(key, value);
    });
  }

  const headers: Record<string, string> = {
    'Accept': 'application/json, text/plain, */*',
    'User-Agent': 'API-Shield-Gateway/2.0 (Security Proxy)',
  };

  // Pass along content-type if available
  if (incomingReq?.headers.get('content-type')) {
    headers['Content-Type'] = incomingReq.headers.get('content-type')!;
  }

  try {
    const res = await fetch(targetUrl.toString(), {
      method: incomingReq?.method || 'GET',
      headers,
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
        message: `Upstream Railway service request failed or timed out: ${error?.message || 'Connection failure'}`,
        upstreamUrl: targetUrl.origin,
      },
    };
  }
}
