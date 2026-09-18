'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Shield,
  Lock,
  Unlock,
  Key,
  Globe,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Code2,
  AlertCircle,
  Play,
  Layers,
  ChevronDown,
  ChevronUp,
  Cpu,
  ShieldCheck,
  Send,
  Zap,
} from 'lucide-react';
import { ProtectedApiRoute } from '@/lib/security/types';
import { GlassShieldIcon, LiquidLockIcon, CrystalKeyIcon } from '../ui/PremiumIcons';

export const AddApiManager: React.FC = () => {
  const [apis, setApis] = useState<ProtectedApiRoute[]>([]);
  const [masterKey, setMasterKey] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form states for Add API
  const [apiUrl, setApiUrl] = useState('');
  const [proxySlug, setProxySlug] = useState('');
  const [apiName, setApiName] = useState('');
  const [encryptionEnabled, setEncryptionEnabled] = useState(true);
  const [customKey, setCustomKey] = useState('');
  const [useCustomKey, setUseCustomKey] = useState(false);
  const [rateLimit, setRateLimit] = useState('60');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live Test Modal / State
  const [testModalApi, setTestModalApi] = useState<ProtectedApiRoute | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testDecrypted, setTestDecrypted] = useState<any>(null);

  // Enclave Decrypt Tool State
  const [payloadToDecrypt, setPayloadToDecrypt] = useState('');
  const [decryptionKeyInput, setDecryptionKeyInput] = useState('');
  const [manualDecryptedResult, setManualDecryptedResult] = useState<any>(null);
  const [manualDecryptError, setManualDecryptError] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  // Client Code Snippet Language
  const [activeCodeLang, setActiveCodeLang] = useState<'nodejs' | 'python' | 'flutter' | 'java'>('nodejs');

  // Base host for proxy URL
  const [hostOrigin] = useState<string>(() => (typeof window !== 'undefined' ? window.location.origin : ''));

  const loadApis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/protected-apis');
      if (res.ok) {
        const data = await res.json();
        setApis(data.apis || []);
        setMasterKey(data.masterEncryptionKey || '');
        if (!decryptionKeyInput && data.masterEncryptionKey) {
          setDecryptionKeyInput(data.masterEncryptionKey);
        }
      } else {
        setError('Failed to fetch protected APIs. Ensure admin session is active.');
      }
    } catch (err: any) {
      setError(err?.message || 'Network error fetching APIs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    const initApis = async () => {
      try {
        const res = await fetch('/api/admin/protected-apis');
        if (res.ok && !ignore) {
          const data = await res.json();
          setApis(data.apis || []);
          setMasterKey(data.masterEncryptionKey || '');
          setDecryptionKeyInput((prev) => prev || data.masterEncryptionKey || '');
        }
      } catch {
        // ignore
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };
    initApis();
    return () => {
      ignore = true;
    };
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSlugChange = (val: string) => {
    let clean = val.trim();
    if (clean && !clean.startsWith('/')) {
      clean = '/' + clean;
    }
    setProxySlug(clean);
  };

  const handleAddApi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiUrl.trim()) {
      setError('Please enter your Target API URL');
      return;
    }
    if (!proxySlug.trim()) {
      setError('Please enter your Proxy Slug (e.g. /api/batches)');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/admin/protected-apis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: apiName.trim() || proxySlug.trim(),
          upstreamUrl: apiUrl.trim(),
          slug: proxySlug.trim(),
          encryptionEnabled,
          encryptionKey: useCustomKey && customKey.trim() ? customKey.trim() : undefined,
          rateLimitPerMin: parseInt(rateLimit, 10) || 60,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to add protected API');
      }

      setSuccessMsg(`API "${data.api.name}" successfully protected and proxied!`);
      // Reset form
      setApiUrl('');
      setProxySlug('');
      setApiName('');
      setUseCustomKey(false);
      setCustomKey('');
      loadApis();
    } catch (err: any) {
      setError(err?.message || 'Error saving protected API');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteApi = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete protection for "${name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/protected-apis?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSuccessMsg(`Removed API route protection for "${name}"`);
        loadApis();
      } else {
        const d = await res.json();
        setError(d.error || 'Failed to delete API route');
      }
    } catch (err: any) {
      setError(err?.message || 'Delete operation failed');
    }
  };

  const handleToggleStatus = async (api: ProtectedApiRoute) => {
    const newStatus = api.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
      const res = await fetch('/api/admin/protected-apis', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: api.id, status: newStatus }),
      });
      if (res.ok) {
        loadApis();
      }
    } catch (err) {
      // ignore
    }
  };

  const handleRunLiveTest = async (api: ProtectedApiRoute) => {
    setTestModalApi(api);
    setTestLoading(true);
    setTestResult(null);
    setTestDecrypted(null);

    const testUrl = `${hostOrigin || ''}${api.slug}`;
    try {
      // Pass origin header so gateway verifies authorized origin
      const res = await fetch(testUrl, {
        headers: {
          'Origin': hostOrigin || 'http://localhost:3000',
        },
      });
      const data = await res.json();
      setTestResult({
        status: res.status,
        ok: res.ok,
        headers: Object.fromEntries(res.headers.entries()),
        data,
      });

      // If response is encrypted {"data": "<iv>:<cipher>"}, auto-decrypt for preview!
      if (data && data.data && typeof data.data === 'string' && data.data.includes(':')) {
        const keyToUse = api.encryptionKey || masterKey;
        const decryptRes = await fetch('/api/admin/crypto-tool', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'decrypt',
            payload: data.data,
            key: keyToUse,
          }),
        });
        if (decryptRes.ok) {
          const decJson = await decryptRes.json();
          if (decJson.success) {
            setTestDecrypted(decJson.decrypted);
          }
        }
      }
    } catch (err: any) {
      setTestResult({
        status: 500,
        ok: false,
        error: err?.message || 'Network test failed',
      });
    } finally {
      setTestLoading(false);
    }
  };

  const handleManualDecrypt = async () => {
    if (!payloadToDecrypt.trim()) {
      setManualDecryptError('Please paste an encrypted payload');
      return;
    }
    setIsDecrypting(true);
    setManualDecryptError(null);
    setManualDecryptedResult(null);

    try {
      const res = await fetch('/api/admin/crypto-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'decrypt',
          payload: payloadToDecrypt.trim(),
          key: decryptionKeyInput.trim() || masterKey,
        }),
      });

      const d = await res.json();
      if (!res.ok || !d.success) {
        throw new Error(d.error || 'Decryption failed');
      }
      setManualDecryptedResult(d.decrypted);
    } catch (err: any) {
      setManualDecryptError(err?.message || 'Decryption failed. Check key and payload.');
    } finally {
      setIsDecrypting(false);
    }
  };

  // Pre-calculated target URL preview
  const calculatedProxyUrl = proxySlug
    ? `${hostOrigin || 'https://apiprotect.onrender.com'}${proxySlug}`
    : `${hostOrigin || 'https://apiprotect.onrender.com'}/api/batches`;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="liquid-glass-card rounded-3xl p-6 relative overflow-hidden border border-cyan-500/20 shadow-[0_8px_32px_rgba(6,182,212,0.1)]">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-300">
                <GlassShieldIcon size={22} />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>Dynamic API Protection & Response Encryption</span>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  AES-256-GCM Active
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Add upstream API URLs, map them to clean proxy slugs, and automatically encrypt all response payloads
              with zero-trust origin authorization. Decodable only by your authenticated client applications.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={loadApis}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl liquid-glass-subtle text-xs text-slate-300 hover:text-white border border-white/10 hover:border-cyan-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
              <span>Refresh APIs</span>
            </button>
          </div>
        </div>

        {/* Global Encryption Enclave Bar */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 font-mono">
            <Key className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-slate-400">Master Enclave Key:</span>
            <span className="text-cyan-200 bg-black/40 px-2.5 py-1 rounded-lg border border-cyan-500/20 truncate max-w-xs md:max-w-md">
              {masterKey ? `${masterKey.substring(0, 16)}••••••••••••••••••••` : 'Generating...'}
            </span>
          </div>

          <button
            onClick={() => handleCopy(masterKey, 'master-key')}
            className="px-2.5 py-1 rounded-lg liquid-glass-subtle hover:bg-white/10 text-[11px] text-slate-300 flex items-center gap-1.5 border border-white/10 cursor-pointer"
          >
            {copiedKey === 'master-key' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Copied Key</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Master Key</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-300 hover:text-white text-xs">
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-300 hover:text-white text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* SECTION 1: Add APIs Section (Requested by User) */}
      <div className="liquid-glass-card rounded-3xl p-6 border border-white/10 shadow-2xl relative">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Add Protected API</h2>
              <p className="text-xs text-slate-400">Map an upstream target URL to a proxy slug with AES-256 encryption</p>
            </div>
          </div>
          <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded-full border border-cyan-500/30">
            Zero-Trust Gateway
          </span>
        </div>

        <form onSubmit={handleAddApi} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Input 1: API URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span>Enter API URL (Target Upstream)</span>
                <span className="text-rose-400">*</span>
              </label>
              <input
                type="url"
                required
                placeholder="https://web-production-bcc00.up.railway.app/api/batches"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl liquid-glass-input text-slate-100 placeholder-slate-500 text-xs font-mono transition-all"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span>The real backend API that returns raw data</span>
                <button
                  type="button"
                  onClick={() => setApiUrl('https://web-production-bcc00.up.railway.app/api/batches')}
                  className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 cursor-pointer"
                >
                  Fill Sample URL
                </button>
              </div>
            </div>

            {/* Input 2: Proxy Slug */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                <span>Enter Proxy Slug</span>
                <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="/api/batches"
                  value={proxySlug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl liquid-glass-input text-slate-100 placeholder-slate-500 text-xs font-mono transition-all"
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span>Public endpoint exposed on your gateway</span>
                <button
                  type="button"
                  onClick={() => setProxySlug('/api/batches')}
                  className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 cursor-pointer"
                >
                  Set /api/batches
                </button>
              </div>
            </div>
          </div>

          {/* Live URL Demonstration Preview Box */}
          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-slate-400 shrink-0">Your Protected API URL:</span>
              <span className="text-emerald-300 font-semibold truncate select-all">{calculatedProxyUrl}</span>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(calculatedProxyUrl, 'preview-url')}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] flex items-center gap-1.5 shrink-0 border border-white/10 transition-all cursor-pointer"
            >
              {copiedKey === 'preview-url' ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-300">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-slate-400" />
                  <span>Copy URL</span>
                </>
              )}
            </button>
          </div>

          {/* Additional Route Options (Accordion / Advanced) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* API Name / Label */}
            <div>
              <label className="text-xs text-slate-300 mb-1 block">Display Name (Optional)</label>
              <input
                type="text"
                placeholder="Batches Master API"
                value={apiName}
                onChange={(e) => setApiName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl liquid-glass-input text-slate-100 placeholder-slate-500 text-xs"
              />
            </div>

            {/* Rate Limit */}
            <div>
              <label className="text-xs text-slate-300 mb-1 block">Rate Limit (req/min)</label>
              <input
                type="number"
                min="10"
                max="10000"
                value={rateLimit}
                onChange={(e) => setRateLimit(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl liquid-glass-input text-slate-100 text-xs font-mono"
              />
            </div>

            {/* Encryption Mode Switch */}
            <div className="flex flex-col justify-end">
              <label className="text-xs text-slate-300 mb-1 flex items-center justify-between">
                <span>Response Encryption:</span>
                <span className={encryptionEnabled ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                  {encryptionEnabled ? 'ENABLED' : 'DISABLED'}
                </span>
              </label>
              <button
                type="button"
                onClick={() => setEncryptionEnabled(!encryptionEnabled)}
                className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-medium border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  encryptionEnabled
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-white/5 border-white/10 text-slate-400'
                }`}
              >
                {encryptionEnabled ? (
                  <>
                    <LiquidLockIcon size={14} />
                    <span>AES-256-GCM Encrypted</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Plain JSON (Raw)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Encryption Format Note */}
          {encryptionEnabled && (
            <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-[11px] text-cyan-300/90 flex items-start gap-2 font-mono">
              <LiquidLockIcon size={14} className="shrink-0 mt-0.5" />
              <div>
                <span>Response will be encrypted as: </span>
                <code className="text-white bg-black/60 px-1.5 py-0.5 rounded">
                  {`{"data":"<12-byte-iv-hex>:<aes-256-gcm-ciphertext-and-tag-hex>"}`}
                </code>
                <span className="block text-slate-400 mt-0.5">
                  Only authorized clients with your encryption key can decode the batches/data.
                </span>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 rounded-2xl liquid-btn-primary text-white font-semibold text-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Configuring Route...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-white" />
                  <span>Add API Protection</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2: Configured Protected APIs List */}
      <div className="liquid-glass-card rounded-3xl p-6 border border-white/10 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <span>Configured Protected APIs</span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-mono">
                {apis.length} Active
              </span>
            </h2>
            <p className="text-xs text-slate-400">Manage proxy routes, monitor traffic, and run live gateway tests</p>
          </div>
        </div>

        {apis.length === 0 ? (
          <div className="py-12 text-center rounded-2xl border border-dashed border-white/10 bg-black/20">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-3 text-cyan-400">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-200">No Protected APIs Configured</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              Add your first API above (e.g. Target URL: <code className="text-cyan-300">https://web-production-bcc00.up.railway.app/api/batches</code> and Proxy Slug: <code className="text-cyan-300">/api/batches</code>).
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {apis.map((api) => {
              const fullProxyUrl = `${hostOrigin || ''}${api.slug}`;
              return (
                <div
                  key={api.id}
                  className="p-4 rounded-2xl liquid-glass-subtle border border-white/10 hover:border-cyan-500/30 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-white">{api.name}</span>
                      <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                        {api.slug}
                      </span>
                      {api.encryptionEnabled ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          <span>AES-256-GCM</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-500/20 text-slate-300 border border-slate-500/30">
                          Raw JSON
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                          api.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {api.status}
                      </span>
                    </div>

                    {/* Upstream & Proxy Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                      <div className="flex items-center gap-1.5 text-slate-400 truncate">
                        <span className="text-slate-500">Upstream:</span>
                        <span className="text-slate-300 truncate" title={api.upstreamUrl}>
                          {api.upstreamUrl}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400 truncate">
                        <span className="text-slate-500">Proxy:</span>
                        <span className="text-cyan-300 truncate font-semibold">{fullProxyUrl}</span>
                      </div>
                    </div>

                    {/* Request Counters & Latency */}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-mono pt-1">
                      <span>Total: <strong className="text-slate-200">{api.totalRequests || 0}</strong></span>
                      <span>Success: <strong className="text-emerald-300">{api.successfulRequests || 0}</strong></span>
                      <span>Failed: <strong className="text-rose-300">{api.failedRequests || 0}</strong></span>
                      {api.lastLatencyMs !== undefined && (
                        <span>Last Latency: <strong className="text-cyan-300">{api.lastLatencyMs}ms</strong></span>
                      )}
                      <span>Limit: <strong className="text-slate-200">{api.rateLimitPerMin}/min</strong></span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-white/5">
                    <button
                      onClick={() => handleCopy(fullProxyUrl, `url-${api.id}`)}
                      className="px-3 py-1.5 rounded-xl liquid-glass-subtle hover:bg-white/10 text-xs text-slate-300 flex items-center gap-1.5 border border-white/10 transition-all cursor-pointer"
                      title="Copy Public Proxy URL"
                    >
                      {copiedKey === `url-${api.id}` ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-300">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Copy URL</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleRunLiveTest(api)}
                      className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Execute live test request"
                    >
                      <Play className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
                      <span>Test Live</span>
                    </button>

                    <button
                      onClick={() => handleToggleStatus(api)}
                      className="p-2 rounded-xl liquid-glass-subtle hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-all cursor-pointer"
                      title={api.status === 'ACTIVE' ? 'Disable Route' : 'Enable Route'}
                    >
                      {api.status === 'ACTIVE' ? (
                        <Unlock className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Lock className="w-4 h-4 text-rose-400" />
                      )}
                    </button>

                    <button
                      onClick={() => handleDeleteApi(api.id, api.name)}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all cursor-pointer"
                      title="Delete API"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 3: Live Decryption Enclave & Client Decoders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sub-Card A: Decryption Playground */}
        <div className="liquid-glass-card rounded-3xl p-6 border border-white/10 shadow-2xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <LiquidLockIcon size={20} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Live Decryption Enclave</h3>
                <p className="text-xs text-slate-400">Test decoding any encrypted response payload using your key</p>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              <div>
                <label className="text-xs text-slate-300 mb-1 block">
                  Encrypted Payload (Paste <code className="text-cyan-300 font-mono">{"{ \"data\": \"<iv>:<cipher>\" }"}</code> or string)
                </label>
                <textarea
                  rows={4}
                  placeholder='{"data":"ac2fb0ebcaebf0e2ecba108c:0fa06700c25a073f9104b2b737402636..."}'
                  value={payloadToDecrypt}
                  onChange={(e) => setPayloadToDecrypt(e.target.value)}
                  className="w-full p-3 rounded-xl liquid-glass-input text-slate-100 placeholder-slate-500 text-xs font-mono resize-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 mb-1 block">Decryption Secret Key</label>
                <input
                  type="text"
                  value={decryptionKeyInput}
                  onChange={(e) => setDecryptionKeyInput(e.target.value)}
                  placeholder="Paste route or master key"
                  className="w-full px-3.5 py-2.5 rounded-xl liquid-glass-input text-slate-100 text-xs font-mono"
                />
              </div>

              <div className="flex justify-between items-center pt-1">
                <button
                  type="button"
                  onClick={() => setDecryptionKeyInput(masterKey)}
                  className="text-xs text-cyan-400 hover:underline cursor-pointer"
                >
                  Use Master Key
                </button>

                <button
                  type="button"
                  onClick={handleManualDecrypt}
                  disabled={isDecrypting}
                  className="px-4 py-2 rounded-xl liquid-btn-primary text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isDecrypting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Zap className="w-3.5 h-3.5" />
                  )}
                  <span>Decrypt Payload</span>
                </button>
              </div>

              {manualDecryptError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                  {manualDecryptError}
                </div>
              )}

              {manualDecryptedResult && (
                <div className="p-3 rounded-xl bg-black/60 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
                    <span className="flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Successfully Decrypted JSON
                    </span>
                    <button
                      onClick={() => handleCopy(JSON.stringify(manualDecryptedResult, null, 2), 'manual-dec')}
                      className="text-[11px] text-slate-400 hover:text-white"
                    >
                      {copiedKey === 'manual-dec' ? 'Copied' : 'Copy JSON'}
                    </button>
                  </div>
                  <pre className="text-slate-200 text-xs font-mono max-h-48 overflow-y-auto p-2 bg-black/40 rounded-lg">
                    {JSON.stringify(manualDecryptedResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sub-Card B: Client-Side Decryption Snippets (For your users/developers) */}
        <div className="liquid-glass-card rounded-3xl p-6 border border-white/10 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                <Code2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Client Decryption Code</h3>
                <p className="text-xs text-slate-400">Share this with your API users so their apps can decode responses</p>
              </div>
            </div>
          </div>

          {/* Language Switcher Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10 text-xs">
            {(['nodejs', 'python', 'flutter', 'java'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setActiveCodeLang(lang)}
                className={`flex-1 py-1.5 rounded-lg font-medium transition-all capitalize cursor-pointer ${
                  activeCodeLang === lang
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {lang === 'nodejs' ? 'Node.js / React' : lang === 'flutter' ? 'Flutter / Dart' : lang === 'java' ? 'Android / Kotlin' : 'Python'}
              </button>
            ))}
          </div>

          {/* Snippet Code Box */}
          <div className="relative">
            <pre className="text-[11px] font-mono p-4 rounded-2xl bg-black/70 border border-white/10 text-slate-200 overflow-x-auto max-h-72 leading-relaxed">
              {activeCodeLang === 'nodejs' && `import crypto from 'crypto';

// Function to decode the API response
export function decodeApiResponse(encryptedString, secretKey) {
  // Handles { "data": "iv:ciphertext" } or direct "iv:ciphertext"
  let str = typeof encryptedString === 'object' ? encryptedString.data : encryptedString;
  const [ivHex, cipherHex] = str.split(':');
  
  const key = crypto.createHash('sha256').update(secretKey).digest();
  const iv = Buffer.from(ivHex, 'hex');
  const cipherBuf = Buffer.from(cipherHex, 'hex');
  
  // Last 16 bytes are the GCM Auth Tag
  const tag = cipherBuf.subarray(cipherBuf.length - 16);
  const data = cipherBuf.subarray(0, cipherBuf.length - 16);
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}`}

              {activeCodeLang === 'python' && `import hashlib, json
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

def decode_api_response(encrypted_data, secret_key: str):
    # If dict: encrypted_data['data']
    raw_str = encrypted_data['data'] if isinstance(encrypted_data, dict) else encrypted_data
    iv_hex, cipher_hex = raw_str.split(':')
    
    key = hashlib.sha256(secret_key.encode('utf-8')).digest()
    iv = bytes.fromhex(iv_hex)
    ciphertext_and_tag = bytes.fromhex(cipher_hex)
    
    aesgcm = AESGCM(key)
    decrypted_bytes = aesgcm.decrypt(iv, ciphertext_and_tag, None)
    return json.loads(decrypted_bytes.decode('utf-8'))`}

              {activeCodeLang === 'flutter' && `// Flutter / Dart (using cryptography or encrypt package)
import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:encrypt/encrypt.dart' as enc;

Map<String, dynamic> decodeApiResponse(String rawPayload, String secretKey) {
  final parts = rawPayload.split(':');
  final iv = enc.IV.fromLength(12); // From parts[0]
  final key = enc.Key(sha256.convert(utf8.encode(secretKey)).bytes);
  final encrypter = enc.Encrypter(enc.AES(key, mode: enc.AESMode.gcm));
  
  final decrypted = encrypter.decrypt(enc.Encrypted.fromBase16(parts[1]), iv: iv);
  return jsonDecode(decrypted);
}`}

              {activeCodeLang === 'java' && `// Android Kotlin / Java
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec
import java.security.MessageDigest

fun decodeApiResponse(payload: String, secretKey: String): String {
    val parts = payload.split(":")
    val iv = parts[0].chunked(2).map { it.toInt(16).toByte() }.toByteArray()
    val cipherBytes = parts[1].chunked(2).map { it.toInt(16).toByte() }.toByteArray()
    
    val sha256 = MessageDigest.getInstance("SHA-256")
    val keyBytes = sha256.digest(secretKey.toByteArray(Charsets.UTF_8))
    
    val cipher = Cipher.getInstance("AES/GCM/NoPadding")
    val keySpec = SecretKeySpec(keyBytes, "AES")
    val gcmSpec = GCMParameterSpec(128, iv)
    
    cipher.init(Cipher.DECRYPT_MODE, keySpec, gcmSpec)
    val decrypted = cipher.doFinal(cipherBytes)
    return String(decrypted, Charsets.UTF_8)
}`}
            </pre>
            <button
              onClick={() => handleCopy(
                activeCodeLang === 'nodejs'
                  ? `import crypto from 'crypto';\nexport function decodeApiResponse(encryptedString, secretKey) {\n  let str = typeof encryptedString === 'object' ? encryptedString.data : encryptedString;\n  const [ivHex, cipherHex] = str.split(':');\n  const key = crypto.createHash('sha256').update(secretKey).digest();\n  const iv = Buffer.from(ivHex, 'hex');\n  const cipherBuf = Buffer.from(cipherHex, 'hex');\n  const tag = cipherBuf.subarray(cipherBuf.length - 16);\n  const data = cipherBuf.subarray(0, cipherBuf.length - 16);\n  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);\n  decipher.setAuthTag(tag);\n  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);\n  return JSON.parse(decrypted.toString('utf8'));\n}`
                  : `import hashlib, json\nfrom cryptography.hazmat.primitives.ciphers.aead import AESGCM\n\ndef decode_api_response(encrypted_data, secret_key: str):\n    raw_str = encrypted_data['data'] if isinstance(encrypted_data, dict) else encrypted_data\n    iv_hex, cipher_hex = raw_str.split(':')\n    key = hashlib.sha256(secret_key.encode('utf-8')).digest()\n    iv = bytes.fromhex(iv_hex)\n    ciphertext_and_tag = bytes.fromhex(cipher_hex)\n    aesgcm = AESGCM(key)\n    decrypted_bytes = aesgcm.decrypt(iv, ciphertext_and_tag, None)\n    return json.loads(decrypted_bytes.decode('utf-8'))`,
                'code-snippet'
              )}
              className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] text-slate-300 border border-white/10 flex items-center gap-1 cursor-pointer transition-all"
            >
              {copiedKey === 'code-snippet' ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-300">Copied Code</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-slate-400" />
                  <span>Copy Snippet</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* LIVE TEST MODAL */}
      {testModalApi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="liquid-glass-card rounded-3xl p-6 border border-cyan-500/30 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  <Play className="w-4 h-4 fill-cyan-400 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Live Route Verification</h3>
                  <p className="text-xs font-mono text-cyan-300">{testModalApi.slug}</p>
                </div>
              </div>
              <button
                onClick={() => setTestModalApi(null)}
                className="text-slate-400 hover:text-white text-xs px-2.5 py-1 rounded-lg hover:bg-white/10"
              >
                Close
              </button>
            </div>

            {testLoading ? (
              <div className="py-12 text-center space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mx-auto" />
                <p className="text-xs text-slate-300">Contacting Gateway Enclave & Upstream Server...</p>
              </div>
            ) : testResult ? (
              <div className="space-y-4 text-xs font-mono">
                <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/10">
                  <span>HTTP Status: <strong className={testResult.ok ? 'text-emerald-400' : 'text-rose-400'}>{testResult.status}</strong></span>
                  <span className="text-slate-400">Upstream: {testModalApi.upstreamUrl}</span>
                </div>

                {/* Raw Encrypted Response */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-slate-300 font-sans">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Raw Encrypted Gateway Response Sent to Client:</span>
                    </span>
                    <button
                      onClick={() => handleCopy(JSON.stringify(testResult.data, null, 2), 'raw-resp')}
                      className="text-[11px] text-cyan-400 hover:underline"
                    >
                      {copiedKey === 'raw-resp' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre className="p-3.5 rounded-xl bg-black/60 border border-white/10 text-cyan-200 overflow-x-auto max-h-40 select-all">
                    {JSON.stringify(testResult.data, null, 2)}
                  </pre>
                </div>

                {/* Auto Decrypted Preview */}
                {testDecrypted && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-slate-300 font-sans">
                      <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" />
                        <span>Decoded Original JSON (Verified with Enclave Key):</span>
                      </span>
                      <button
                        onClick={() => handleCopy(JSON.stringify(testDecrypted, null, 2), 'dec-resp')}
                        className="text-[11px] text-emerald-400 hover:underline"
                      >
                        {copiedKey === 'dec-resp' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <pre className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-200 overflow-x-auto max-h-48 select-all">
                      {JSON.stringify(testDecrypted, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : null}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => handleRunLiveTest(testModalApi)}
                disabled={testLoading}
                className="px-4 py-2 rounded-xl liquid-btn-primary text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testLoading ? 'animate-spin' : ''}`} />
                <span>Retest Request</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
