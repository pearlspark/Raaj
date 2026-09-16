'use client';

import React from 'react';
import { GlassShieldIcon } from '../ui/PremiumIcons';
import { ShieldAlert, Activity, LogOut, Terminal, GraduationCap } from 'lucide-react';

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
    <header className="sticky top-0 z-40 liquid-glass border-b border-white/10 px-4 lg:px-7 py-3.5 backdrop-blur-2xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand & Status */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl liquid-badge flex items-center justify-center relative group shadow-lg shadow-cyan-500/10">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 blur-sm" />
            <GlassShieldIcon size={26} className="relative z-10 liquid-glow-cyan" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-bold text-white tracking-tight text-base lg:text-lg">
                API Shield <span className="text-cyan-400 font-light">Enclave</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ACTIVE PROTECTION
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block font-medium">
              Zero-Trust Whitelist • Ed25519/HMAC Crypto • Anti-Scrape Layer
            </p>
          </div>
        </div>

        {/* Telemetry quick badges */}
        <div className="hidden md:flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl liquid-glass-subtle text-slate-300">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400 text-[11px]">Throughput:</span>
            <span className="font-semibold text-slate-100 font-mono text-xs">{metrics?.requestsThisMinute ?? 0} req/m</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl liquid-glass-subtle text-slate-300">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-slate-400 text-[11px]">Shielded:</span>
            <span className="font-semibold text-rose-300 font-mono text-xs">{metrics?.suspiciousRequests ?? 0}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Admin user info & Logout */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-slate-300 font-mono font-medium hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl liquid-glass-subtle border border-white/10">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              {adminUser?.username || 'admin'}
            </span>
            <button
              onClick={onLogout}
              title="Terminate Security Session"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-white/5 hover:border-rose-500/20 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
