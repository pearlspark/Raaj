'use client';

import React, { useState, useEffect } from 'react';
import {
  GlassShieldIcon,
  CrystalKeyIcon,
  LiquidLockIcon,
  PulseRadarIcon,
} from '../ui/PremiumIcons';
import {
  Key,
  Lock,
  Copy,
  Check,
  Terminal,
  Code,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Play,
  RefreshCw,
  Zap,
  Globe,
  Send,
  CheckCircle2,
} from 'lucide-react';

export const IntegrationGuide: React.FC = () => {
  const [origin] = useState<string>(() => (typeof window !== 'undefined' ? window.location.origin : ''));
  const [activeLang, setActiveLang] = useState<'curl' | 'browser' | 'nodejs' | 'python'>('curl');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Live Token Testing State
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [customSecret, setCustomSecret] = useState<string>('');
  const [testOrigin, setTestOrigin] = useState<string>(() => (typeof window !== 'undefined' ? window.location.origin : ''));
  const [isTesting, setIsTesting] = useState(false);
  const [testResponse, setTestResponse] = useState<any>(null);

  useEffect(() => {
    let ignore = false;
    // Load registered clients for the interactive tester
    const fetchClients = async () => {
      try {
        const res = await fetch('/api/admin/domains');
        if (res.ok && !ignore) {
          const data = await res.json();
          const activeClients = data.clients || [];
          setClients(activeClients);
          if (activeClients.length > 0) {
            setSelectedClientId(activeClients[0].clientId);
          }
        }
      } catch {
        // ignore
      }
    };
    fetchClients();
    return () => {
      ignore = true;
    };
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRunTokenTest = async () => {
    setIsTesting(true);
    setTestResponse(null);
    try {
      const res = await fetch('/api/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(testOrigin ? { Origin: testOrigin } : {}),
        },
        body: JSON.stringify({
          clientId: selectedClientId,
          clientSecret: customSecret || 'sample_secret_key',
        }),
      });

      const data = await res.json();
      setTestResponse({
        status: res.status,
        ok: res.ok,
        data,
      });
    } catch (err: any) {
      setTestResponse({
        status: 500,
        ok: false,
        data: { error: err.message || 'Request failed' },
      });
    } finally {
      setIsTesting(false);
    }
  };

  const hostUrl = origin || 'https://apiprotect.onrender.com';
  const tokenEndpointUrl = `${hostUrl}/api/auth/token`;

  const codeSnippets: Record<'curl' | 'browser' | 'nodejs' | 'python', string> = {
    curl: `# 1. Request signed security token from /api/auth/token
curl -X POST "${tokenEndpointUrl}" \\
  -H "Content-Type: application/json" \\
  -H "Origin: https://your-authorized-domain.com" \\
  -d '{
    "clientId": "client_your_id",
    "clientSecret": "sec_your_secret_key"
  }'

# 2. Call your protected API using the Bearer token
curl -X GET "${hostUrl}/api/your-proxy-slug" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Origin: https://your-authorized-domain.com"`,

    browser: `// Browser / Frontend JavaScript (React, Vue, Web)
async function fetchProtectedApi() {
  // Step 1: Exchange authorized client credentials for a signed enclave token
  const authRes = await fetch('${tokenEndpointUrl}', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Origin is automatically set by the browser
    },
    body: JSON.stringify({
      clientId: 'client_your_id',
      clientSecret: 'sec_your_secret_key',
    }),
  });

  const authData = await authRes.json();
  if (!authData.success) {
    throw new Error(authData.message || 'Authorization failed');
  }

  const token = authData.access_token;

  // Step 2: Use access token to request your protected endpoints (e.g. /api/your-proxy-slug)
  const apiRes = await fetch('${hostUrl}/api/your-proxy-slug', {
    headers: {
      'Authorization': \`Bearer \${token}\`,
    },
  });

  return await apiRes.json();
}`,

    nodejs: `// Node.js Backend Client
import axios from 'axios';

async function callProtectedGateway() {
  // 1. Get signed token from /api/auth/token
  const authResponse = await axios.post('${tokenEndpointUrl}', {
    clientId: process.env.API_CLIENT_ID,
    clientSecret: process.env.API_CLIENT_SECRET,
  }, {
    headers: {
      'Origin': 'https://your-authorized-domain.com',
    }
  });

  const token = authResponse.data.access_token;

  // 2. Query your protected API
  const apiResponse = await axios.get('${hostUrl}/api/your-proxy-slug', {
    headers: {
      'Authorization': \`Bearer \${token}\`,
      'Origin': 'https://your-authorized-domain.com',
    }
  });

  return apiResponse.data;
}`,

    python: `# Python Client
import requests

# 1. Obtain signed token from /api/auth/token
auth_payload = {
    "clientId": "client_your_id",
    "clientSecret": "sec_your_secret_key"
}
headers = {
    "Origin": "https://your-authorized-domain.com"
}

auth_res = requests.post("${tokenEndpointUrl}", json=auth_payload, headers=headers)
auth_data = auth_res.json()

if not auth_data.get("success"):
    print("Authentication error:", auth_data.get("message"))
else:
    token = auth_data["access_token"]
    
    # 2. Call your custom protected API endpoint (e.g. /api/your-proxy-slug)
    api_headers = {
        "Authorization": f"Bearer {token}",
        "Origin": "https://your-authorized-domain.com"
    }
    data_res = requests.get("${hostUrl}/api/your-proxy-slug", headers=api_headers)
    print("API Response:", data_res.json())`,
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="liquid-glass-card rounded-3xl p-6 relative overflow-hidden border border-cyan-500/20 shadow-[0_8px_32px_rgba(6,182,212,0.1)]">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-300">
                <LiquidLockIcon size={22} />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>Security Authentication Gateway</span>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  /api/auth/token
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              All client requests are verified by the Zero-Trust security gateway. Client applications authenticate
              against the enclave endpoint <code className="text-cyan-300 font-mono">/api/auth/token</code> to receive a
              cryptographically signed, short-lived Bearer token.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Token Enclave Active
            </span>
          </div>
        </div>

        {/* Endpoint URL Pill */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 font-mono">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              POST
            </span>
            <span className="text-cyan-300 bg-black/40 px-3 py-1 rounded-xl border border-white/10 select-all font-semibold">
              {tokenEndpointUrl}
            </span>
          </div>

          <button
            onClick={() => handleCopy(tokenEndpointUrl, 'token-url')}
            className="px-3 py-1 rounded-xl liquid-glass-subtle hover:bg-white/10 text-xs text-slate-300 flex items-center gap-1.5 border border-white/10 cursor-pointer transition-all"
          >
            {copiedKey === 'token-url' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Copied URL</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Endpoint</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Security Specifications Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl liquid-glass-card border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-white">Domain Whitelisting</span>
            <Globe className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Requests from unauthorized origins or scrape bots are blocked with:
            <code className="block mt-1 text-[11px] font-mono text-rose-300 bg-rose-950/30 p-1.5 rounded border border-rose-500/20">
              Need APIs Contact on Telegram @sparkxflare
            </code>
          </p>
        </div>

        <div className="p-5 rounded-2xl liquid-glass-card border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-white">15-Minute Token TTL</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Tokens expire automatically after 900 seconds (15 mins). Stolen tokens cannot be reused indefinitely,
            preventing replay attacks.
          </p>
        </div>

        <div className="p-5 rounded-2xl liquid-glass-card border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-white">HMAC Constant-Time</span>
            <CrystalKeyIcon size={18} className="text-indigo-400" />
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Secrets are verified using constant-time cryptographic comparisons, neutralizing timing side-channel
            exploits completely.
          </p>
        </div>
      </div>

      {/* Code Examples & Client Integration */}
      <div className="liquid-glass-card rounded-3xl p-6 border border-white/10 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Client Authentication Code Samples</h2>
              <p className="text-xs text-slate-400">How clients exchange credentials for an access token</p>
            </div>
          </div>

          {/* Language Switcher */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10 text-xs">
            {(['curl', 'browser', 'nodejs', 'python'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setActiveLang(lang)}
                className={`px-3 py-1 rounded-lg font-medium transition-all uppercase text-[11px] cursor-pointer ${
                  activeLang === lang
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {lang === 'curl' ? 'cURL' : lang === 'browser' ? 'Browser JS' : lang === 'nodejs' ? 'Node.js' : 'Python'}
              </button>
            ))}
          </div>
        </div>

        {/* Code Snippet */}
        <div className="relative">
          <pre className="text-xs font-mono p-4 rounded-2xl bg-black/70 border border-white/10 text-slate-200 overflow-x-auto max-h-96 leading-relaxed">
            {codeSnippets[activeLang]}
          </pre>
          <button
            onClick={() => handleCopy(codeSnippets[activeLang], 'snippet-code')}
            className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] text-slate-300 border border-white/10 flex items-center gap-1.5 cursor-pointer transition-all"
          >
            {copiedKey === 'snippet-code' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Live Token Simulator */}
      <div className="liquid-glass-card rounded-3xl p-6 border border-white/10 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <Play className="w-4 h-4 fill-indigo-400 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Live /api/auth/token Simulator</h2>
              <p className="text-xs text-slate-400">Test authenticating and issuing a token directly in your browser</p>
            </div>
          </div>
          <span className="text-[11px] font-mono text-indigo-400 bg-indigo-950/40 px-2.5 py-1 rounded-full border border-indigo-500/30">
            Live Enclave
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="text-slate-300 font-medium mb-1 block">Client ID</label>
            {clients.length > 0 ? (
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl liquid-glass-input text-slate-100 font-mono text-xs"
              >
                {clients.map((c) => (
                  <option key={c.clientId} value={c.clientId} className="bg-slate-900 text-slate-100">
                    {c.clientId} ({c.name})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                placeholder="client_your_id"
                className="w-full px-3 py-2.5 rounded-xl liquid-glass-input text-slate-100 font-mono text-xs"
              />
            )}
          </div>

          <div>
            <label className="text-slate-300 font-medium mb-1 block">Client Secret</label>
            <input
              type="text"
              value={customSecret}
              onChange={(e) => setCustomSecret(e.target.value)}
              placeholder="Enter secret or leave sample"
              className="w-full px-3 py-2.5 rounded-xl liquid-glass-input text-slate-100 font-mono text-xs"
            />
          </div>

          <div>
            <label className="text-slate-300 font-medium mb-1 block">Request Origin Header</label>
            <input
              type="text"
              value={testOrigin}
              onChange={(e) => setTestOrigin(e.target.value)}
              placeholder="https://your-domain.com"
              className="w-full px-3 py-2.5 rounded-xl liquid-glass-input text-slate-100 font-mono text-xs"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={handleRunTokenTest}
            disabled={isTesting || !selectedClientId}
            className="px-5 py-2.5 rounded-xl liquid-btn-primary text-white font-semibold text-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isTesting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Requesting Token...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                <span>Execute /api/auth/token</span>
              </>
            )}
          </button>
        </div>

        {/* Live Result View */}
        {testResponse && (
          <div className="mt-3 p-4 rounded-2xl bg-black/60 border border-white/10 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5 font-sans font-semibold">
                {testResponse.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                )}
                <span>Response Status: {testResponse.status}</span>
              </span>
              <button
                onClick={() => handleCopy(JSON.stringify(testResponse.data, null, 2), 'sim-resp')}
                className="text-[11px] text-cyan-400 hover:underline"
              >
                {copiedKey === 'sim-resp' ? 'Copied' : 'Copy Response'}
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-black/40 text-slate-200 overflow-x-auto max-h-48 text-[11px]">
              {JSON.stringify(testResponse.data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
