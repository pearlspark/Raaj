# API Shield & Gateway — Advanced API Protection & Domain Authorization System

A production-grade, defense-in-depth API gateway and security management console built with Next.js App Router, TypeScript, and Tailwind CSS. The system ensures that your public API endpoints can **only be accessed by explicitly authorized domains and authenticated client applications**, making unauthorized scraping, hotlinking, and credential abuse mathematically and cryptographically intractable.

---

## 🛡️ Key Architectural Highlights

### 1. Multi-Layer Defense-in-Depth (Zero Reliance on CORS Alone)
- **Domain Whitelist & Strict Normalization**: Origins and Referers are stripped of ports, paths, and casing; validated against exact domains (`https://example.com`) or wildcard subdomains (`*.example.com`). Lookalike suffixes (e.g. `example.com.attacker.com`) are mathematically blocked.
- **Short-Lived Signed Access Tokens**: Cryptographic HMAC-SHA256 tokens issued via `/api/auth/token` with a 15-minute TTL, bound to the client ID and authorized domain.
- **Backend-to-Backend HMAC Request Signing**: For server-to-server calls, requests are signed using `HMAC-SHA256(method:endpoint:timestamp:nonce:body)` with client secret verification, clock-skew checks (±5 mins), and single-use nonces to defeat replay attacks.
- **Dynamic Risk Engine**: Analyzes incoming traffic across 7 heuristic threat vectors (missing headers, automated bot scrapers, sudden burst rates, signature anomalies, origin discrepancies) to compute a 0–100 risk score.
- **Automated IP Quarantine**: Abusive IPs exceeding critical thresholds are automatically quarantined in a cooldown blacklist.
- **Media & CDN Shielding**: CloudFront media and video URLs are dynamically rewritten to route through the secure Pearl proxy (`https://pearl.mscilearn.in`), concealing internal CDN origins.

---

## 🚀 Getting Started & Default Credentials

### Running the Application
```bash
# Install dependencies
npm install

# Start development server on port 3000
npm run dev

# Build for production
npm run build
npm run start
```

### Administrator Portal Access
- **URL**: `http://localhost:3000/` (or your deployed URL)
- **Default Username**: `admin`
- **Default Password**: `Admin@Shield2026!`
*(Credentials and session secrets can be customized via environment variables or the Settings view).*

---

## 📋 Comprehensive 20-Point Security Test Suite

The system includes a built-in automated test harness executable directly from the Admin Console (`Testing Suite` tab) or via API (`POST /api/admin/simulate-test`):

| # | Test Case Name | Attack / Verification Vector | Expected Result | Gateway Response |
|---|---|---|---|---|
| **01** | Authorized Domain Access | Legitimate request from whitelisted domain origin | `200 OK` | Allowed through gateway |
| **02** | Unauthorized Domain Access | Origin not present in admin whitelist | `403 Forbidden` | `UNAUTHORIZED_DOMAIN` |
| **03** | Missing Credentials | Direct call without token, signature, or origin | `403 Forbidden` | Risk Score 65 (High) Intercepted |
| **04** | Invalid Credentials | Tampered token signature or altered payload | `403 Forbidden` | Cryptographic rejection |
| **05** | Expired Token | Token past its 15-minute TTL window | `403 Forbidden` | Token Expired challenge |
| **06** | Revoked Token / Client | Client credential revoked in admin console | `403 Forbidden` | `CLIENT_REVOKED` |
| **07** | Invalid HMAC Signature | Server call with corrupted signature or secret | `403 Forbidden` | Constant-time mismatch |
| **08** | Replay Request | Re-sending an intercepted request with reused nonce | `403 Forbidden` | `REPLAY_ATTACK_DETECTED` |
| **09** | Rate Limit Exceeded | Flooding requests beyond configured limit | `429 Too Many Requests`| `RATE_LIMIT_EXCEEDED` + Retry-After |
| **10** | IP Blocklist Enforcement | Request from manually or auto-blocked IP | `403 Forbidden` | `IP_BLOCKED` |
| **11** | Domain Disabled | Domain flipped to `DISABLED` state by admin | `403 Forbidden` | Access revoked |
| **12** | Malformed Query | Missing mandatory query parameters on endpoints | `400 Bad Request` | Input validator drop |
| **13** | Payload Body Size Guard| Body exceeding 1MB threshold | `413 Payload Too Large`| Resource protection drop |
| **14** | Unknown Endpoint Probe | Scanning `/api/admin.php` or config files | `404 Not Found` | Probe dropped without leaking stack |
| **15** | Bot / Scraper Detection| Automated library User-Agents (curl, python, scrapy)| `403 Forbidden` | Elevated risk penalty + blocked |
| **16** | CORS Suffix Bypass | Lookalike origin: `example.com.attacker.com` | `403 Forbidden` | Domain normalizer rejection |
| **17** | Direct Browser URL Bar | Raw URL pasting without frontend session headers | `403 Forbidden` | Direct access denied |
| **18** | Header Spoofing | Spoofed `X-Forwarded-Host` or fake Referer | `403 Forbidden` | Untrusted header ignored |
| **19** | Null Origin Attempt | `Origin: null` from sandbox iframe or file:// | `403 Forbidden` | Sanitized and dropped |
| **20** | Concurrency Race Condition| Parallel requests hitting rate/nonce gates | `200 Protected` | Atomic sliding-window guard |

---

## 💻 Client Integration Quickstart

### Method 1: Client-Side (SPA on Whitelisted Domain)
```javascript
// Step 1: Exchange credentials for short-lived access token
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
  return data.access_token; // Valid for 15 mins
}

// Step 2: Make protected calls with Bearer token
async function fetchBatches() {
  const token = await getAccessToken();
  const res = await fetch('https://your-gateway.com/api/batches', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return await res.json();
}
```

### Method 2: Server-to-Server HMAC-SHA256 Signing (Node.js)
```javascript
import crypto from 'crypto';
import axios from 'axios';

const CLIENT_ID = 'YOUR_CLIENT_ID';
const CLIENT_SECRET = 'YOUR_CLIENT_SECRET';

async function callGateway(endpoint) {
  const timestamp = Date.now().toString();
  const nonce = crypto.randomBytes(16).toString('hex');
  const canonical = `GET:${endpoint}:${timestamp}:${nonce}:`;
  
  const signature = crypto
    .createHmac('sha256', CLIENT_SECRET)
    .update(canonical)
    .digest('hex');

  return (await axios.get(`https://your-gateway.com${endpoint}`, {
    headers: {
      'X-Client-ID': CLIENT_ID,
      'X-Timestamp': timestamp,
      'X-Nonce': nonce,
      'X-Signature': signature
    }
  })).data;
}
```

---

## ⚙️ Environment Configuration

| Variable | Description | Default |
|---|---|---|
| `MONGODB_URI` | MongoDB Atlas cluster connection string | Configured (Atlas Cluster `forward.v75z0uc.mongodb.net`) |
| `PW_BASE_URL` | Upstream educational API service | `https://api.penpencil.co` |
| `PW_AUTH_TOKEN` | Bearer token for upstream service | (Configured) |
| `JWT_SECRET` | Secret used to sign access tokens | Embedded / Auto-generated |
| `ADMIN_SECRET` | Secret used to sign admin session cookies | Embedded / Auto-generated |
| `API_SIGNING_SALT`| Extra entropy salt for request signatures | Built-in secure fallback |
| `REDIS_URL` | Optional Redis URL for distributed rate limits | Built-in in-memory sliding window |
| `GEOIP_PROVIDER_KEY` | Optional key for IP country/city detection | Optional |

---

## 🔒 Security Hardening Checklists Enforced
- [x] Zero plain-text client secrets stored (hashed with SHA-256).
- [x] Constant-time buffer comparisons (`crypto.timingSafeEqual`) to eliminate timing attacks.
- [x] HttpOnly, SameSite=Strict cookies for admin sessions.
- [x] Strict Content Security Policy (CSP), HSTS, and X-Content-Type-Options headers.
- [x] Single-use cryptographic nonces with automatic 10-minute expiry sweeps.
- [x] Atomic sliding-window rate limiting per IP, Domain, and sensitive endpoints.
