'use client';

import React, { useState } from 'react';
import { Ban, Plus, Trash2, ShieldCheck, AlertTriangle, Clock } from 'lucide-react';
import { BlockedIpRecord } from '@/lib/security/types';

interface IpManagerProps {
  blockedIps: BlockedIpRecord[];
  onRefresh: () => void;
}

export const IpManager: React.FC<IpManagerProps> = ({ blockedIps, onRefresh }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ip, setIp] = useState('');
  const [reason, setReason] = useState('');
  const [isPermanent, setIsPermanent] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleBlockIp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/admin/ips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip,
          reason,
          isPermanent,
          durationMinutes: isPermanent ? undefined : durationMinutes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to block IP');
      }

      setIsModalOpen(false);
      setIp('');
      setReason('');
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnblock = async (ipToUnblock: string) => {
    if (!confirm(`Unblock IP ${ipToUnblock}?`)) return;

    try {
      const res = await fetch(`/api/admin/ips?ip=${encodeURIComponent(ipToUnblock)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (e) {
      // ignore
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Ban className="w-4 h-4 text-rose-400" />
            IP Blacklist & Automated Cooldown Manager
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Addresses quarantined due to rate-limit flooding, brute-forcing, or manual administrator blocks.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-md shadow-rose-600/20 flex items-center justify-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Block IP Address</span>
        </button>
      </div>

      {/* Blocked IP Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-3.5 font-semibold">IP Address</th>
                <th className="py-3 px-3.5 font-semibold">Reason</th>
                <th className="py-3 px-3.5 font-semibold">Duration / Expiry</th>
                <th className="py-3 px-3.5 font-semibold">Blocked At</th>
                <th className="py-3 px-3.5 font-semibold">Blocked By</th>
                <th className="py-3 px-3.5 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {blockedIps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    <ShieldCheck className="w-6 h-6 text-emerald-400 mx-auto mb-1.5" />
                    No IP addresses currently under quarantine or blacklist.
                  </td>
                </tr>
              ) : (
                blockedIps.map((b) => (
                  <tr key={b.ip} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3.5 font-mono text-rose-400 font-bold whitespace-nowrap">
                      {b.ip}
                    </td>

                    <td className="py-3 px-3.5 text-slate-300">
                      {b.reason}
                    </td>

                    <td className="py-3 px-3.5 whitespace-nowrap font-mono text-[11px]">
                      {b.isPermanent ? (
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold font-sans">
                          PERMANENT
                        </span>
                      ) : b.expiresAt ? (
                        <span className="text-amber-400">
                          Expires: {new Date(b.expiresAt).toLocaleTimeString()}
                        </span>
                      ) : (
                        'N/A'
                      )}
                    </td>

                    <td className="py-3 px-3.5 text-slate-400 whitespace-nowrap font-mono text-[11px]">
                      {new Date(b.blockedAt).toLocaleString()}
                    </td>

                    <td className="py-3 px-3.5 text-slate-400 whitespace-nowrap text-[11px]">
                      {b.blockedBy}
                    </td>

                    <td className="py-3 px-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleUnblock(b.ip)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-300 text-[11px] font-semibold transition-colors"
                      >
                        Unblock
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Block IP Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Ban className="w-4 h-4 text-rose-400" />
                Quarantine IP Address
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
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

            <form onSubmit={handleBlockIp} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Target IP Address
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 198.51.100.25"
                  value={ip}
                  onChange={(e) => setIp(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none focus:border-rose-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Reason for Quarantine
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Abusive scraper / DDoS signature"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-rose-500 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="perm"
                  checked={isPermanent}
                  onChange={(e) => setIsPermanent(e.target.checked)}
                  className="rounded border-slate-700 text-rose-600 focus:ring-rose-500"
                />
                <label htmlFor="perm" className="text-slate-300 font-semibold cursor-pointer">
                  Permanent Blacklist (No expiration)
                </label>
              </div>

              {!isPermanent && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Cooldown Duration (Minutes)
                  </label>
                  <select
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-rose-500 text-xs"
                  >
                    <option value="15">15 Minutes</option>
                    <option value="60">1 Hour</option>
                    <option value="360">6 Hours</option>
                    <option value="1440">24 Hours</option>
                    <option value="10080">7 Days</option>
                  </select>
                </div>
              )}

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold disabled:opacity-50"
                >
                  {isSubmitting ? 'Quarantining...' : 'Confirm Block'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
