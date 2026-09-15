'use client';

import React, { useState } from 'react';
import {
  LiquidGlobeIcon,
  CrystalKeyIcon,
  GlassShieldIcon,
  DefenseMatrixIcon,
} from '../ui/PremiumIcons';
import {
  Plus,
  Shield,
  Key,
  RefreshCw,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Lock,
  Eye,
  EyeOff,
  Layers,
} from 'lucide-react';
import { AuthorizedDomain, ApiClient } from '@/lib/security/types';

interface DomainManagerProps {
  domains: AuthorizedDomain[];
  clients: ApiClient[];
  onRefresh: () => void;
}

export const DomainManager: React.FC<DomainManagerProps> = ({ domains, clients, onRefresh }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [newMode, setNewMode] = useState<'EXACT' | 'SUBDOMAIN'>('SUBDOMAIN');
  const [newRateLimit, setNewRateLimit] = useState(120);
  const [newClientName, setNewClientName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // One-time credential disclosure modal state
  const [oneTimeSecretModal, setOneTimeSecretModal] = useState<{
    isOpen: boolean;
    domain: string;
    clientId: string;
    rawSecret: string;
  } | null>(null);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/admin/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: newDomain,
          mode: newMode,
          rateLimitPerMin: newRateLimit,
          clientName: newClientName,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to add domain');
      }

      setIsAddModalOpen(false);
      setNewDomain('');
      setNewClientName('');
      onRefresh();

      // Open one-time secret view modal
      setOneTimeSecretModal({
        isOpen: true,
        domain: data.domain.domain,
        clientId: data.domain.clientId,
        rawSecret: data.rawSecret,
      });
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (domainId: string, status: 'ACTIVE' | 'DISABLED' | 'BLOCKED') => {
    try {
      const res = await fetch(`/api/admin/domains/${domainId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (e) {
      // ignore
    }
  };

  const handleRotateSecret = async (domainId: string, domainName: string) => {
    if (!confirm(`Are you sure you want to rotate the credentials for ${domainName}? Any active frontend relying on previous credentials will need to update.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/domains/${domainId}/rotate-secret`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onRefresh();
        setOneTimeSecretModal({
          isOpen: true,
          domain: domainName,
          clientId: data.domain.clientId,
          rawSecret: data.newRawSecret,
        });
      }
    } catch (e) {
      // ignore
    }
  };

  const handleDeleteDomain = async (domainId: string, domainName: string) => {
    if (!confirm(`Delete authorized domain '${domainName}'? Access will be revoked immediately.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/domains/${domainId}`, { method: 'DELETE' });
      if (res.ok) {
        onRefresh();
      }
    } catch (e) {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl liquid-glass border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2.5 tracking-tight">
            <LiquidGlobeIcon size={20} className="text-cyan-400" />
            Authorized Domains & Client Enclaves
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Only explicit whitelisted domains and their corresponding cryptographically issued API clients are permitted to consume the API.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 rounded-2xl text-xs font-semibold liquid-btn-primary text-white transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Authorize New Domain</span>
        </button>
      </div>

      {/* Domain Cards / Table */}
      <div className="rounded-3xl border border-white/10 liquid-glass overflow-hidden shadow-[0_16px_40px_rgba(0,0,0,0.4)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="liquid-glass-subtle text-slate-300 border-b border-white/10">
              <tr>
                <th className="py-3.5 px-4 font-semibold tracking-wider uppercase text-[11px]">Status</th>
                <th className="py-3.5 px-4 font-semibold tracking-wider uppercase text-[11px]">Authorized Domain</th>
                <th className="py-3.5 px-4 font-semibold tracking-wider uppercase text-[11px]">Match Mode</th>
                <th className="py-3.5 px-4 font-semibold tracking-wider uppercase text-[11px]">Rate Limit</th>
                <th className="py-3.5 px-4 font-semibold tracking-wider uppercase text-[11px]">Client ID</th>
                <th className="py-3.5 px-4 font-semibold tracking-wider uppercase text-[11px]">Last Active</th>
                <th className="py-3.5 px-4 font-semibold tracking-wider uppercase text-[11px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {domains.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                    No domains authorized yet. Click &apos;Authorize New Domain&apos; above.
                  </td>
                </tr>
              ) : (
                domains.map((dom) => {
                  const client = clients.find((c) => c.clientId === dom.clientId || c.domainId === dom.id);

                  return (
                    <tr key={dom.id} className="hover:bg-white/[0.03] transition-colors">
                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            dom.status === 'ACTIVE'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : dom.status === 'DISABLED'
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {dom.status === 'ACTIVE' && <CheckCircle2 className="w-3 h-3" />}
                          {dom.status === 'DISABLED' && <AlertTriangle className="w-3 h-3" />}
                          {dom.status === 'BLOCKED' && <XCircle className="w-3 h-3" />}
                          {dom.status}
                        </span>
                      </td>

                      {/* Domain */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-semibold text-white text-xs">{dom.domain}</div>
                        <div className="text-[10px] text-slate-400">normalized: {dom.normalizedDomain}</div>
                      </td>

                      {/* Match Mode */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 font-semibold text-[11px] text-cyan-300">
                          {dom.mode === 'SUBDOMAIN' ? '*.subdomain' : 'exact'}
                        </span>
                      </td>

                      {/* Rate Limit */}
                      <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                        <span className="font-semibold text-white font-mono">{dom.rateLimitPerMin}</span> req/min
                      </td>

                      {/* Client ID */}
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="text-cyan-400 truncate max-w-[130px]">{dom.clientId}</span>
                          <button
                            onClick={() => handleCopy(dom.clientId, dom.id)}
                            className="p-1 rounded-lg liquid-btn-glass text-slate-400 hover:text-white cursor-pointer"
                          >
                            {copiedKey === dom.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Last Active */}
                      <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap text-[11px] font-mono">
                        {dom.lastActiveAt ? new Date(dom.lastActiveAt).toLocaleDateString() : 'Never'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Status toggle */}
                          {dom.status === 'ACTIVE' ? (
                            <button
                              onClick={() => handleUpdateStatus(dom.id, 'DISABLED')}
                              className="px-2.5 py-1 rounded-xl liquid-btn-glass text-slate-300 hover:text-amber-300 text-[11px] cursor-pointer"
                              title="Disable domain access"
                            >
                              Disable
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateStatus(dom.id, 'ACTIVE')}
                              className="px-2.5 py-1 rounded-xl liquid-btn-glass text-slate-300 hover:text-emerald-300 text-[11px] cursor-pointer"
                              title="Enable domain access"
                            >
                              Enable
                            </button>
                          )}

                          {/* Rotate secret */}
                          <button
                            onClick={() => handleRotateSecret(dom.id, dom.domain)}
                            className="p-1.5 rounded-xl liquid-btn-glass text-slate-300 hover:text-white cursor-pointer"
                            title="Rotate Client Secret"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteDomain(dom.id, dom.domain)}
                            className="p-1.5 rounded-xl liquid-btn-glass text-slate-400 hover:text-rose-400 cursor-pointer"
                            title="Delete authorized domain"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Domain Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="w-full max-w-md liquid-glass border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <LiquidGlobeIcon size={18} className="text-cyan-400" />
                Authorize New Domain
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-xl liquid-btn-glass text-slate-400 hover:text-white flex items-center justify-center cursor-pointer text-base"
              >
                &times;
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleAddDomain} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Domain Name or URL
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://example.com or example.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl liquid-glass-input text-white focus:outline-none font-mono text-xs"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Scheme, port, and trailing slashes are automatically sanitized.
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Friendly Client Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Web Video Portal Production"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl liquid-glass-input text-white focus:outline-none text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Match Mode</label>
                  <select
                    value={newMode}
                    onChange={(e: any) => setNewMode(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl liquid-glass-input text-white focus:outline-none text-xs bg-slate-900"
                  >
                    <option value="SUBDOMAIN">Subdomain & Apex (*.domain.com)</option>
                    <option value="EXACT">Exact Match Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Rate Limit (req/min)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={10000}
                    value={newRateLimit}
                    onChange={(e) => setNewRateLimit(parseInt(e.target.value, 10))}
                    className="w-full px-3.5 py-2.5 rounded-2xl liquid-glass-input text-white focus:outline-none text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl liquid-btn-glass text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-2xl liquid-btn-primary text-white font-semibold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-lg"
                >
                  {isSubmitting ? 'Registering...' : 'Authorize Domain'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* One-time Secret Disclosure Modal */}
      {oneTimeSecretModal?.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="w-full max-w-lg liquid-glass border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-amber-400 font-bold text-sm">
              <CrystalKeyIcon size={20} className="text-amber-400" />
              <span>Save Client Credentials Now (Shown Only Once)</span>
            </div>

            <p className="text-xs text-slate-300">
              For authorized domain <span className="font-mono text-white font-bold">{oneTimeSecretModal.domain}</span>.
              The client secret is hashed using salted PBKDF2 and will <strong>NEVER</strong> be shown again.
            </p>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl liquid-glass-subtle border border-white/10">
                <div className="text-[10px] text-slate-400 font-semibold mb-1 uppercase tracking-wider">CLIENT ID</div>
                <div className="flex items-center justify-between font-mono text-cyan-400">
                  <span className="break-all">{oneTimeSecretModal.clientId}</span>
                  <button
                    onClick={() => handleCopy(oneTimeSecretModal.clientId, 'modal-client-id')}
                    className="ml-2 p-1.5 rounded-xl liquid-btn-glass text-slate-300 hover:text-white cursor-pointer"
                  >
                    {copiedKey === 'modal-client-id' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl liquid-glass-subtle border border-amber-500/30">
                <div className="text-[10px] text-amber-400 font-semibold mb-1 uppercase tracking-wider">CLIENT SECRET (RAW)</div>
                <div className="flex items-center justify-between font-mono text-emerald-400">
                  <span className="break-all">{oneTimeSecretModal.rawSecret}</span>
                  <button
                    onClick={() => handleCopy(oneTimeSecretModal.rawSecret, 'modal-secret')}
                    className="ml-2 p-1.5 rounded-xl liquid-btn-glass text-slate-300 hover:text-white cursor-pointer"
                  >
                    {copiedKey === 'modal-secret' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
              ⚠️ Copy both keys into your client environment or secure vault. Once you close this modal, the secret cannot be recovered.
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setOneTimeSecretModal(null)}
                className="px-5 py-2.5 rounded-2xl liquid-btn-primary text-white font-semibold text-xs transition-all shadow-lg cursor-pointer"
              >
                I Have Safely Saved These Credentials
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
