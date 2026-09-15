'use client';

import React, { useState } from 'react';
import { BookOpen, Copy, Check, Terminal, Code, Cpu } from 'lucide-react';

export const IntegrationGuide: React.FC = () => {
  const [activeLang, setActiveLang] = useState<'curl' | 'browser' | 'node' | 'python'>('browser');
  const [copied, setCopied] = useState(false);

  const snippets = {
    browser: `// Method 1: Client-Side (SPA / Frontend running on Authorized Whitelisted Domain)
// Step 1: Exchange Client ID & Client Secret for short-lived access token
async function getAccessToken() {
  const res = await fetch('https://your-gateway.com/api/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: 'YOUR_CLIENT_ID',
      clientSecret: 'YOUR_CLIENT_SECRET'
    })
  });
  const data = await res.json();
  return data.access_token; // Valid for 15 minutes
}

// Step 2: Call protected API endpoints using Bearer token
async function loadVideoDetails(batchId, subjectId, scheduleId) {
  const token = await getAccessToken();
  const res = await fetch(
    \`https://your-gateway.com/api/video-url?batchId=\${batchId}&subjectId=\${subjectId}&scheduleId=\${scheduleId}\`,
    {
      headers: {
        'Authorization': \`Bearer \${token}\`
      }
    }
  );
  return await res.json();
}`,
    node: `// Method 2: Server-to-Server HMAC-SHA256 Signature (Node.js)
import crypto from 'crypto';
import axios from 'axios';

const CLIENT_ID = 'YOUR_CLIENT_ID';
const CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const GATEWAY_URL = 'https://your-gateway.com';

async function callProtectedApi(endpoint, params = {}) {
  const timestamp = Date.now().toString();
  const nonce = crypto.randomBytes(16).toString('hex');
  const method = 'GET';
  
  // Format query params
  const queryString = new URLSearchParams(params).toString();
  const fullEndpoint = queryString ? \`\${endpoint}?\${queryString}\` : endpoint;

  // Build canonical signature string: METHOD + ENDPOINT + TIMESTAMP + NONCE
  const canonicalString = \`\${method}:\${endpoint}:\${timestamp}:\${nonce}:\`;
  const signature = crypto
    .createHmac('sha256', CLIENT_SECRET)
    .update(canonicalString)
    .digest('hex');

  const response = await axios.get(\`\${GATEWAY_URL}\${fullEndpoint}\`, {
    headers: {
      'X-Client-ID': CLIENT_ID,
      'X-Timestamp': timestamp,
      'X-Nonce': nonce,
      'X-Signature': signature,
    }
  });

  return response.data;
}`,
    python: `# Method 3: Python Backend Integration with HMAC Signature
import time
import uuid
import hmac
import hashlib
import requests

CLIENT_ID = "YOUR_CLIENT_ID"
CLIENT_SECRET = "YOUR_CLIENT_SECRET"
GATEWAY_URL = "https://your-gateway.com"

def call_protected_api(endpoint, params=None):
    timestamp = str(int(time.time() * 1000))
    nonce = uuid.uuid4().hex
    method = "GET"

    canonical = f"{method}:{endpoint}:{timestamp}:{nonce}:"
    signature = hmac.new(
        CLIENT_SECRET.encode('utf-8'),
        canonical.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    headers = {
        "X-Client-ID": CLIENT_ID,
        "X-Timestamp": timestamp,
        "X-Nonce": nonce,
        "X-Signature": signature
    }

    url = f"{GATEWAY_URL}{endpoint}"
    response = requests.get(url, params=params, headers=headers)
    return response.json()`,
    curl: `# Method 4: Test Authorized Request via cURL
# 1. First fetch short-lived access token:
curl -X POST https://your-gateway.com/api/auth/token \\
  -H "Content-Type: application/json" \\
  -d '{"clientId":"YOUR_CLIENT_ID","clientSecret":"YOUR_CLIENT_SECRET"}'

# 2. Call protected batches endpoint with token:
curl -X GET https://your-gateway.com/api/batches \\
  -H "Authorization: Bearer <ACCESS_TOKEN>" \\
  -H "Origin: https://example.com"`
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(snippets[activeLang]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-sky-400" />
          Client Integration & Cryptographic Signing SDK Guide
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Step-by-step code patterns for authorized frontends and servers to communicate with the Gateway.
        </p>
      </div>

      {/* Code Box */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
        {/* Language Tabs & Copy */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveLang('browser')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                activeLang === 'browser' ? 'bg-sky-500 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Browser / SPA (Fetch)
            </button>
            <button
              onClick={() => setActiveLang('node')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                activeLang === 'node' ? 'bg-sky-500 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Node.js (HMAC Signature)
            </button>
            <button
              onClick={() => setActiveLang('python')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                activeLang === 'python' ? 'bg-sky-500 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Python (Requests)
            </button>
            <button
              onClick={() => setActiveLang('curl')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                activeLang === 'curl' ? 'bg-sky-500 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              cURL CLI
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-[11px]"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {/* Code Content */}
        <div className="p-4 font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed bg-slate-950">
          <pre>{snippets[activeLang]}</pre>
        </div>
      </div>
    </div>
  );
};
