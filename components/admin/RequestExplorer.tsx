'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileSpreadsheet,
  Trash2,
} from 'lucide-react';
import { RequestLog } from '@/lib/security/types';

export const RequestExplorer: React.FC = () => {
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState('');
  const [statusCode, setStatusCode] = useState<string>('');
  const [riskLevel, setRiskLevel] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [showCleanConfirm, setShowCleanConfirm] = useState(false);
  const [cleanSuccess, setCleanSuccess] = useState(false);

  const handleCleanLogs = async () => {
    setIsCleaning(true);
    try {
      const res = await fetch('/api/admin/requests', { method: 'DELETE' });
      if (res.ok) {
        setLogs([]);
        setTotal(0);
        setShowCleanConfirm(false);
        setCleanSuccess(true);
        setTimeout(() => setCleanSuccess(false), 4000);
      }
    } catch (e) {
      console.error('Failed to clean logs:', e);
    } finally {
      setIsCleaning(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });
        if (search) params.append('search', search);
        if (statusCode) params.append('statusCode', statusCode);
        if (riskLevel) params.append('riskLevel', riskLevel);

        const res = await fetch(`/api/admin/requests?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (!ignore) {
            setLogs(data.logs || []);
            setTotal(data.total || 0);
          }
        }
      } catch {
        // ignore
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    fetchLogs();
    return () => {
      ignore = true;
    };
  }, [page, limit, statusCode, riskLevel, search]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handleExportCsv = () => {
    const params = new URLSearchParams({ format: 'csv' });
    if (search) params.append('search', search);
    if (statusCode) params.append('statusCode', statusCode);
    if (riskLevel) params.append('riskLevel', riskLevel);
    window.open(`/api/admin/requests?${params.toString()}`, '_blank');
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-4">
      {/* Header & Filter Controls */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-sky-400" />
              Historical Request Explorer & Audit Logs
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Query, filter, and export immutable forensic logs across all endpoints and clients.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => setShowCleanConfirm(true)}
              disabled={total === 0 || isCleaning}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isCleaning ? 'Cleaning...' : 'Clean Logs'}</span>
            </button>
          </div>
        </div>

        {cleanSuccess && (
          <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>All telemetry request logs have been successfully cleaned and purged.</span>
          </div>
        )}

        {showCleanConfirm && (
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Are you sure you want to clean all stored request logs? This cannot be undone.</span>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setShowCleanConfirm(false)}
                className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCleanLogs}
                disabled={isCleaning}
                className="px-3 py-1 rounded-md text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>{isCleaning ? 'Cleaning...' : 'Yes, Clean All'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
          {/* Search box */}
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search request ID, IP, domain, client ID, endpoint..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 text-xs"
            />
          </div>

          {/* Status Code Filter */}
          <div>
            <select
              value={statusCode}
              onChange={(e) => {
                setStatusCode(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-sky-500 text-xs"
            >
              <option value="">All HTTP Statuses</option>
              <option value="200">200 OK</option>
              <option value="400">400 Bad Request</option>
              <option value="401">401 Unauthorized</option>
              <option value="403">403 Forbidden</option>
              <option value="429">429 Rate Limited</option>
              <option value="500">500 Server Error</option>
            </select>
          </div>

          {/* Risk Level Filter */}
          <div>
            <select
              value={riskLevel}
              onChange={(e) => {
                setRiskLevel(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-sky-500 text-xs"
            >
              <option value="">All Risk Levels</option>
              <option value="LOW">Low Risk (&lt;20)</option>
              <option value="MEDIUM">Medium Risk (20-49)</option>
              <option value="HIGH">High Risk (50-79)</option>
              <option value="CRITICAL">Critical Risk (&ge;80)</option>
            </select>
          </div>
        </form>
      </div>

      {/* Log Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-3 font-semibold">Status</th>
                <th className="py-3 px-3 font-semibold">Time</th>
                <th className="py-3 px-3 font-semibold">Request ID</th>
                <th className="py-3 px-3 font-semibold">Endpoint</th>
                <th className="py-3 px-3 font-semibold">Domain</th>
                <th className="py-3 px-3 font-semibold">IP / Geo</th>
                <th className="py-3 px-3 font-semibold">Risk Score</th>
                <th className="py-3 px-3 font-semibold">Latency</th>
                <th className="py-3 px-3 font-semibold">Blocked?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    <div className="animate-spin w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full mx-auto mb-2" />
                    Loading request records...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    No request logs found for selected query.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                          log.statusCode >= 200 && log.statusCode < 300
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : log.blocked
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {log.statusCode}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>

                    <td className="py-2.5 px-3 font-mono text-slate-300 whitespace-nowrap text-[11px]">
                      {log.requestId.slice(0, 16)}...
                    </td>

                    <td className="py-2.5 px-3 font-mono">
                      <span className="font-semibold text-sky-400 mr-1">{log.method}</span>
                      <span className="text-slate-200">{log.endpoint}</span>
                    </td>

                    <td className="py-2.5 px-3 font-mono text-slate-300">
                      {log.domain || <span className="text-slate-500 italic">None</span>}
                    </td>

                    <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap font-mono">
                      {log.ip} <span className="text-slate-500">({log.country})</span>
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap font-semibold">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] ${
                          log.riskScore >= 70
                            ? 'bg-rose-500/20 text-rose-400'
                            : log.riskScore >= 35
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-emerald-500/10 text-emerald-400'
                        }`}
                      >
                        {log.riskScore}/100
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap font-mono">
                      {log.responseTimeMs}ms
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {log.blocked ? (
                        <span className="text-rose-400 font-bold text-[11px]">BLOCKED</span>
                      ) : (
                        <span className="text-emerald-400 font-medium text-[11px]">ALLOWED</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 bg-slate-950/70 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing {logs.length} of {total} total records
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-slate-200">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
