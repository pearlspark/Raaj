'use client';

import React from 'react';
import { Shield, ShieldAlert, Activity, LogOut, Terminal, GraduationCap } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  adminUser?: { username: string; role: string };
  onLogout: () => void;
  metrics?: { requestsThisMinute: number; suspiciousRequests: number };
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  adminUser,
  onLogout,
  metrics,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 lg:px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand & Status */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-bold">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-100 tracking-tight text-base lg:text-lg">
                API Shield <span className="text-sky-400 font-normal">& Gateway</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ENFORCING
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Domain Whitelisting • HMAC Signing • Anti-Abuse Gateway
            </p>
          </div>
        </div>

        {/* Telemetry quick badges */}
        <div className="hidden md:flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300">
            <Activity className="w-3.5 h-3.5 text-sky-400" />
            <span>Traffic:</span>
            <span className="font-semibold text-slate-100">{metrics?.requestsThisMinute ?? 0} req/min</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Threats Filtered:</span>
            <span className="font-semibold text-amber-300">{metrics?.suspiciousRequests ?? 0}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Quick View Switcher: Admin Gateway vs Student App Preview */}
          <button
            onClick={() => setActiveTab(activeTab === 'edu-preview' ? 'overview' : 'edu-preview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'edu-preview'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            {activeTab === 'edu-preview' ? (
              <>
                <Terminal className="w-3.5 h-3.5" />
                <span>Security Console</span>
              </>
            ) : (
              <>
                <GraduationCap className="w-3.5 h-3.5 text-sky-400" />
                <span>Student App Preview</span>
              </>
            )}
          </button>

          {/* Admin user info & Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <span className="text-xs text-slate-300 font-medium hidden sm:inline-block">
              {adminUser?.username || 'admin'}
            </span>
            <button
              onClick={onLogout}
              title="Logout from console"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
