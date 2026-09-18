'use client';

import React from 'react';
import {
  LiquidGlobeIcon,
  CrystalKeyIcon,
  PulseRadarIcon,
  DefenseMatrixIcon,
  GlassShieldIcon,
  QuantumCpuIcon,
  LiquidLockIcon,
} from '../ui/PremiumIcons';
import {
  LayoutDashboard,
  FileText,
  Ban,
  Sliders,
  History,
  BookOpen,
  PlusCircle,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  badgeCounts?: {
    securityEvents?: number;
    blockedIps?: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, badgeCounts }) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, isCustom: false },
    { id: 'add-apis', label: 'Add APIs (Proxy & Crypt)', icon: LiquidLockIcon, isCustom: true },
    { id: 'live', label: 'Live Monitor', icon: PulseRadarIcon, isCustom: true, pulse: true },
    { id: 'domains', label: 'Authorized Domains', icon: LiquidGlobeIcon, isCustom: true },
    { id: 'clients', label: 'API Clients & Keys', icon: CrystalKeyIcon, isCustom: true },
    { id: 'requests', label: 'Request Logs', icon: FileText, isCustom: false },
    {
      id: 'security',
      label: 'Security Events',
      icon: DefenseMatrixIcon,
      isCustom: true,
      badge: badgeCounts?.securityEvents,
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.2)]',
    },
    {
      id: 'ips',
      label: 'IP Management',
      icon: Ban,
      isCustom: false,
      badge: badgeCounts?.blockedIps,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    { id: 'testing', label: 'Security Simulator', icon: GlassShieldIcon, isCustom: true },
    { id: 'settings', label: 'Rate & Risk Policies', icon: Sliders, isCustom: false },
    { id: 'audit', label: 'Admin Audit Trail', icon: History, isCustom: false },
    { id: 'integration', label: 'Integration Guide', icon: BookOpen, isCustom: false },
  ];

  return (
    <aside className="w-full md:w-64 liquid-glass-subtle border-r border-white/10 p-3.5 shrink-0 backdrop-blur-2xl">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-2 flex items-center justify-between">
        <span>Gateway Navigation</span>
        <QuantumCpuIcon size={14} className="text-cyan-400/80" />
      </div>

      <nav className="space-y-1 mt-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? 'liquid-badge text-cyan-300 font-semibold border-cyan-500/30 shadow-[0_4px_16px_rgba(6,182,212,0.15)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {item.isCustom ? (
                  <Icon size={16} className={isActive ? 'text-cyan-400' : 'text-slate-400'} />
                ) : (
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                )}
                <span className="truncate">{item.label}</span>
              </div>

              <div className="flex items-center gap-1.5">
                {item.pulse && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                  </span>
                )}
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border font-mono ${
                      item.badgeColor || 'bg-slate-800 text-slate-300 border-white/10'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Security Engine Specs footer */}
      <div className="mt-8 p-3.5 rounded-2xl liquid-glass-subtle text-[11px] text-slate-400">
        <div className="flex items-center justify-between font-semibold text-slate-200 mb-2">
          <span className="text-xs">Active Defenses</span>
          <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            ARMED
          </span>
        </div>
        <ul className="space-y-1.5 text-[10px] text-slate-400">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" /> Domain Whitelist Enclave
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_6px_#818cf8]" /> Nonce Anti-Replay Guard
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" /> 4-Tier Rate Limiting
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24]" /> MongoDB Atlas Storage
          </li>
        </ul>
      </div>
    </aside>
  );
};
