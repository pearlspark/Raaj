'use client';

import React from 'react';
import {
  LayoutDashboard,
  Radio,
  Globe,
  Key,
  FileText,
  AlertTriangle,
  Ban,
  ShieldCheck,
  Sliders,
  History,
  BookOpen,
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
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'live', label: 'Live Monitor', icon: Radio, pulse: true },
    { id: 'domains', label: 'Authorized Domains', icon: Globe },
    { id: 'clients', label: 'API Clients & Keys', icon: Key },
    { id: 'requests', label: 'Request Logs', icon: FileText },
    {
      id: 'security',
      label: 'Security Events',
      icon: AlertTriangle,
      badge: badgeCounts?.securityEvents,
      badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    },
    {
      id: 'ips',
      label: 'IP Management',
      icon: Ban,
      badge: badgeCounts?.blockedIps,
      badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    },
    { id: 'testing', label: 'Security Simulator', icon: ShieldCheck },
    { id: 'settings', label: 'Rate & Risk Policies', icon: Sliders },
    { id: 'audit', label: 'Admin Audit Trail', icon: History },
    { id: 'integration', label: 'Integration Guide', icon: BookOpen },
  ];

  return (
    <aside className="w-full md:w-64 bg-slate-900/60 border-r border-slate-800/80 p-3 shrink-0">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-3 py-2">
        Gateway Navigation
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>

              <div className="flex items-center gap-1.5">
                {item.pulse && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                )}
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-md border ${
                      item.badgeColor || 'bg-slate-700 text-slate-300'
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
      <div className="mt-8 p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-[11px] text-slate-400">
        <div className="flex items-center justify-between font-semibold text-slate-300 mb-1">
          <span>Active Defenses</span>
          <span className="text-emerald-400">Layered</span>
        </div>
        <ul className="space-y-1 text-[10px] text-slate-400">
          <li className="flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-sky-400" /> Domain Whitelist
          </li>
          <li className="flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-sky-400" /> Nonce Replay Lock
          </li>
          <li className="flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-sky-400" /> 4-Tier Rate Limiting
          </li>
          <li className="flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-sky-400" /> Dynamic Risk Scoring
          </li>
        </ul>
      </div>
    </aside>
  );
};
