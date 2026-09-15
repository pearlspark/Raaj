'use client';

import React from 'react';
import { History, UserCheck, Clock, Shield } from 'lucide-react';
import { AdminAuditLog } from '@/lib/security/types';

interface AuditLogsProps {
  auditLogs: AdminAuditLog[];
}

export const AuditLogsView: React.FC<AuditLogsProps> = ({ auditLogs }) => {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <History className="w-4 h-4 text-sky-400" />
          Administrative Control Audit Trail
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Tamper-evident record of all domain authorizations, secret rotations, policy updates, and console logins.
        </p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-3.5 font-semibold">Time</th>
                <th className="py-3 px-3.5 font-semibold">Admin</th>
                <th className="py-3 px-3.5 font-semibold">Action</th>
                <th className="py-3 px-3.5 font-semibold">Target</th>
                <th className="py-3 px-3.5 font-semibold">Details</th>
                <th className="py-3 px-3.5 font-semibold">IP</th>
                <th className="py-3 px-3.5 font-semibold text-right">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No admin actions recorded yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3.5 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3.5 font-semibold text-white whitespace-nowrap">
                      {log.admin}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-sky-400 whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-slate-300">
                      {log.target}
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-300">
                      {log.details}
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-400 font-mono text-[11px]">
                      {log.ip}
                    </td>
                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.result === 'SUCCESS'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {log.result}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
