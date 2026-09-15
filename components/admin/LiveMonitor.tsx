'use client';

import React, { useState, useEffect } from 'react';
import {
  Radio,
  Pause,
  Play,
  Filter,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Ban,
  X,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { RequestLog } from '@/lib/security/types';

interface LiveMonitorProps {
  onBlockIp?: (ip: string, reason: string) => void;
}

export const LiveMonitor: React.FC<LiveMonitorProps> = ({ onBlockIp }) => {
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | 'BLOCKED' | 'SUSPICIOUS' | 'SUCCESS'>('ALL');
  const [selectedLog, setSelectedLog] = useState<RequestLog | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/admin/requests?limit=50');
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled && data.logs) {
            setLogs(data.logs);
          }
        }
      } catch {}
    };

    load();
    if (isPaused) {
      return () => {
        isCancelled = true;
      };
    }

    const interval = setInterval(load, 2000);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [isPaused]);

  const filteredLogs = logs.filter((log) => {
    if (filterType === 'BLOCKED') return log.blocked;
    if (filterType === 'SUSPICIOUS') return log.riskScore >= 40;
    if (filterType === 'SUCCESS') return log.statusCode >= 200 && log.statusCode < 300;
    return true;
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Control Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              {!isPaused ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
              )}
            </span>
            <span className="text-sm font-bold text-white">
              {isPaused ? 'Streaming Paused' : 'Live Request Feed'}
            </span>
          </div>

          <span className="text-xs text-slate-400">
            Showing {filteredLogs.length} recent events
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Status filter tabs */}
          <div className="flex items-center bg-slate-800/80 rounded-lg p-1 border border-slate-700/60 text-xs">
            {(['ALL', 'SUCCESS', 'BLOCKED', 'SUSPICIOUS'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  filterType === t ? 'bg-sky-500 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Pause / Resume Button */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              isPaused
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {isPaused ? (
              <>
                <Play className="w-3.5 h-3.5" /> Resume
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5" /> Pause
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stream Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Status</th>
                <th className="py-2.5 px-3 font-semibold">Time</th>
                <th className="py-2.5 px-3 font-semibold">Method & Endpoint</th>
                <th className="py-2.5 px-3 font-semibold">Domain / Origin</th>
                <th className="py-2.5 px-3 font-semibold">IP & Country</th>
                <th className="py-2.5 px-3 font-semibold">Risk Score</th>
                <th className="py-2.5 px-3 font-semibold">Latency</th>
                <th className="py-2.5 px-3 font-semibold text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No requests matching current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isBlocked = log.blocked;
                  const isSuspicious = log.riskScore >= 40;
                  const isSuccess = log.statusCode >= 200 && log.statusCode < 300;

                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className={`cursor-pointer hover:bg-slate-800/40 transition-colors ${
                        isBlocked ? 'bg-rose-950/10' : isSuspicious ? 'bg-amber-950/10' : ''
                      }`}
                    >
                      {/* Status badge */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                            isSuccess
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : isBlocked
                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {isSuccess && <CheckCircle2 className="w-3 h-3" />}
                          {isBlocked && <XCircle className="w-3 h-3" />}
                          {!isSuccess && !isBlocked && <AlertTriangle className="w-3 h-3" />}
                          {log.statusCode}
                        </span>
                      </td>

                      {/* Time */}
                      <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap font-mono text-[11px]">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>

                      {/* Method & Endpoint */}
                      <td className="py-2.5 px-3 font-mono">
                        <span className="font-semibold text-sky-400 mr-1.5">{log.method}</span>
                        <span className="text-slate-200">{log.endpoint}</span>
                      </td>

                      {/* Domain */}
                      <td className="py-2.5 px-3">
                        <span className="font-mono text-slate-300 truncate block max-w-[150px]">
                          {log.domain || <span className="text-slate-500 italic">None (Direct)</span>}
                        </span>
                      </td>

                      {/* IP & Country */}
                      <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                        <span className="font-mono text-slate-300">{log.ip}</span>{' '}
                        <span className="text-[10px] text-slate-500">({log.country})</span>
                      </td>

                      {/* Risk Score */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
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

                      {/* Latency */}
                      <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap font-mono">
                        {log.responseTimeMs}ms
                      </td>

                      {/* Action */}
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Drawer Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-lg bg-slate-900 border-l border-slate-800 p-6 overflow-y-auto space-y-6 animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Request Forensic Details
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold ${
                      selectedLog.blocked
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {selectedLog.blocked ? 'BLOCKED' : 'PASSED'}
                  </span>
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-1">
                  <span>{selectedLog.requestId}</span>
                  <button
                    onClick={() => handleCopy(selectedLog.requestId, 'reqId')}
                    className="hover:text-white"
                  >
                    {copiedId === 'reqId' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Core Summary Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-slate-500 block">Status Code</span>
                <span className="text-base font-bold text-white font-mono">{selectedLog.statusCode}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-slate-500 block">Latency</span>
                <span className="text-base font-bold text-sky-400 font-mono">{selectedLog.responseTimeMs}ms</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-slate-500 block">Risk Score</span>
                <span
                  className={`text-base font-bold font-mono ${
                    selectedLog.riskScore >= 70
                      ? 'text-rose-400'
                      : selectedLog.riskScore >= 35
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {selectedLog.riskScore} / 100
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-slate-500 block">Timestamp</span>
                <span className="text-xs font-medium text-slate-300 font-mono">
                  {new Date(selectedLog.timestamp).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Block Reason (if any) */}
            {selectedLog.blocked && selectedLog.blockReason && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                <div className="font-bold flex items-center gap-1.5 mb-1 text-rose-200">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  Interception Reason
                </div>
                <p>{selectedLog.blockReason}</p>
              </div>
            )}

            {/* Identity & Origin Info */}
            <div className="space-y-3 text-xs">
              <h4 className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">
                Identity & Origin
              </h4>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Domain / Origin:</span>
                  <span className="text-slate-200 font-semibold">{selectedLog.domain || 'N/A (Missing)'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Client ID:</span>
                  <span className="text-slate-200">{selectedLog.clientId || 'Anonymous'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Client IP:</span>
                  <span className="text-slate-200 font-semibold">{selectedLog.ip}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Geo Country:</span>
                  <span className="text-slate-200">{selectedLog.country}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Endpoint:</span>
                  <span className="text-sky-400 font-semibold">{selectedLog.method} {selectedLog.endpoint}</span>
                </div>
              </div>
            </div>

            {/* Client User Agent */}
            <div className="space-y-2 text-xs">
              <h4 className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">
                User Agent
              </h4>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 font-mono text-[11px] text-slate-300 break-all">
                {selectedLog.userAgent}
              </div>
            </div>

            {/* Quick Mitigations */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={() => {
                  if (onBlockIp) {
                    onBlockIp(selectedLog.ip, `Blocked from Live Monitor (Request ${selectedLog.requestId})`);
                  }
                  setSelectedLog(null);
                }}
                className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
              >
                <Ban className="w-4 h-4" />
                <span>Quarantine IP ({selectedLog.ip})</span>
              </button>

              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
