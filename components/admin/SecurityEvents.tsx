'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Flame,
  AlertOctagon,
  Ban,
  Clock,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { SecurityEvent } from '@/lib/security/types';

interface SecurityEventsProps {
  events: SecurityEvent[];
  onRefresh: () => void;
  onBlockIp?: (ip: string, reason: string) => void;
}

export const SecurityEvents: React.FC<SecurityEventsProps> = ({ events, onRefresh, onBlockIp }) => {
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  const filtered = events.filter((e) => {
    if (severityFilter === 'ALL') return true;
    return e.severity === severityFilter;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            Security Events & Threat Intelligence Timeline
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cryptographic failures, origin violations, replay attacks, and rate-limit triggers.
          </p>
        </div>

        {/* Severity Filter */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700/60 text-xs">
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                severityFilter === sev
                  ? 'bg-rose-500 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Events Stream */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-12 text-center rounded-xl border border-slate-800 bg-slate-900/40 text-slate-500">
            <ShieldCheck className="w-8 h-8 text-emerald-400/60 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">Zero Security Threats Detected</p>
            <p className="text-xs text-slate-500 mt-1">No anomalous security violations recorded in current filter.</p>
          </div>
        ) : (
          filtered.map((evt) => {
            const isCritical = evt.severity === 'CRITICAL';
            const isHigh = evt.severity === 'HIGH';

            return (
              <div
                key={evt.id}
                className={`p-4 rounded-xl border transition-all ${
                  isCritical
                    ? 'bg-rose-950/20 border-rose-500/40'
                    : isHigh
                    ? 'bg-amber-950/20 border-amber-500/40'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isCritical
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : isHigh
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {evt.severity}
                    </span>
                    <span className="font-bold text-white text-xs sm:text-sm font-mono">{evt.type}</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(evt.timestamp).toLocaleString()}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 mb-3">{evt.reason}</p>

                {/* Metadata tags */}
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400">
                  <span className="px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800">
                    IP: <span className="text-slate-200 font-semibold">{evt.ip}</span>
                  </span>

                  {evt.endpoint && (
                    <span className="px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800">
                      Endpoint: <span className="text-sky-400 font-semibold">{evt.endpoint}</span>
                    </span>
                  )}

                  {evt.domain && (
                    <span className="px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800">
                      Domain: <span className="text-slate-200">{evt.domain}</span>
                    </span>
                  )}

                  {evt.actionTaken && (
                    <span className="px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800">
                      Action: <span className="text-rose-400 font-semibold">{evt.actionTaken}</span>
                    </span>
                  )}

                  {onBlockIp && evt.ip && evt.ip !== '127.0.0.1' && (
                    <button
                      onClick={() => onBlockIp(evt.ip, `Automated trigger from event ${evt.type}`)}
                      className="ml-auto px-2 py-0.5 rounded bg-rose-900/30 hover:bg-rose-900/50 text-rose-300 border border-rose-700/40 text-[10px] flex items-center gap-1 font-sans font-semibold"
                    >
                      <Ban className="w-3 h-3" /> Quarantine IP
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
