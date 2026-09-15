'use client';

import React from 'react';
import {
  GlassShieldIcon,
  LiquidGlobeIcon,
  PulseRadarIcon,
  DefenseMatrixIcon,
  QuantumCpuIcon,
} from '../ui/PremiumIcons';
import {
  Activity,
  ShieldCheck,
  ShieldAlert,
  Globe,
  AlertOctagon,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Server,
  Zap,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

interface OverviewProps {
  metrics: any;
  onNavigate: (tab: string) => void;
}

export const OverviewDashboard: React.FC<OverviewProps> = ({ metrics, onNavigate }) => {
  if (!metrics) {
    return (
      <div className="p-12 text-center text-slate-400">
        <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto mb-3 animate-spin" />
        <span className="text-xs tracking-wider uppercase font-semibold text-slate-400">Streaming Telemetry...</span>
      </div>
    );
  }

  const successRate =
    metrics.totalRequests > 0
      ? ((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(1)
      : '100.0';

  return (
    <div className="space-y-6">
      {/* Top Banner / Quick Action Bar */}
      <div className="p-6 rounded-3xl liquid-glass border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2.5">
            <GlassShieldIcon size={22} className="text-cyan-400" />
            Gateway Security Posture
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
              OPTIMAL ENCLAVE DEFENSE
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl font-medium">
            Unauthorized origins and direct scrape bots are intercepted at edge. High-risk traffic is
            rate-limited and video CDN streams remain protected under signed token contracts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate('domains')}
            className="px-4 py-2.5 rounded-2xl text-xs font-semibold liquid-btn-primary text-white transition-all shadow-lg flex items-center gap-2 cursor-pointer"
          >
            <LiquidGlobeIcon size={16} />
            <span>Manage Domains</span>
          </button>
          <button
            onClick={() => onNavigate('testing')}
            className="px-4 py-2.5 rounded-2xl text-xs font-semibold liquid-btn-glass text-slate-200 transition-all flex items-center gap-2 cursor-pointer"
          >
            <DefenseMatrixIcon size={16} className="text-cyan-400" />
            <span>Security Diagnostics</span>
          </button>
        </div>
      </div>

      {/* Primary Metric KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 lg:gap-4">
        {/* Total Requests */}
        <div className="p-5 rounded-2xl liquid-glass-card space-y-2 border border-white/10">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium tracking-wide">Total Requests</span>
            <PulseRadarIcon size={18} className="text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {metrics.totalRequests?.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
            <span className="text-emerald-400 font-semibold">{metrics.requestsToday}</span> today •{' '}
            <span className="text-slate-300 font-semibold">{metrics.requestsThisHour}</span>/hr
          </div>
        </div>

        {/* Success Rate */}
        <div className="p-5 rounded-2xl liquid-glass-card space-y-2 border border-white/10">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium tracking-wide">Success Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 tracking-tight">{successRate}%</div>
          <div className="text-[11px] text-slate-400 font-medium">
            {metrics.successfulRequests?.toLocaleString()} passed • {metrics.failedRequests} blocked
          </div>
        </div>

        {/* Unauthorized & Blocked */}
        <div className="p-5 rounded-2xl liquid-glass-card space-y-2 border border-white/10">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium tracking-wide">Security Blocks</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 tracking-tight">
            {metrics.count403 + metrics.count401}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">
            403 Intercepts: <span className="text-rose-300 font-semibold">{metrics.count403}</span> • 401:{' '}
            <span className="text-amber-300 font-semibold">{metrics.count401}</span>
          </div>
        </div>

        {/* Rate-Limit Violations */}
        <div className="p-5 rounded-2xl liquid-glass-card space-y-2 border border-white/10">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium tracking-wide">Rate-Limit 429s</span>
            <AlertOctagon className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 tracking-tight">{metrics.count429}</div>
          <div className="text-[11px] text-slate-400 font-medium">
            Avg Latency: <span className="text-slate-200 font-semibold">{metrics.avgLatencyMs}ms</span>
          </div>
        </div>
      </div>

      {/* Secondary Status Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs">
        <div className="p-3.5 rounded-2xl liquid-glass-subtle flex items-center justify-between border border-white/10">
          <div>
            <div className="text-slate-400 text-[11px] font-medium">Active Domains</div>
            <div className="text-base font-bold text-white mt-0.5">{metrics.activeDomains}</div>
          </div>
          <LiquidGlobeIcon size={20} className="text-emerald-400" />
        </div>

        <div className="p-3.5 rounded-2xl liquid-glass-subtle flex items-center justify-between border border-white/10">
          <div>
            <div className="text-slate-400 text-[11px] font-medium">Blocked Origins</div>
            <div className="text-base font-bold text-rose-400 mt-0.5">{metrics.blockedDomains}</div>
          </div>
          <ShieldAlert className="w-5 h-5 text-rose-400/80" />
        </div>

        <div className="p-3.5 rounded-2xl liquid-glass-subtle flex items-center justify-between border border-white/10">
          <div>
            <div className="text-slate-400 text-[11px] font-medium">Client IPs Tracked</div>
            <div className="text-base font-bold text-white mt-0.5">{metrics.uniqueIps}</div>
          </div>
          <Server className="w-5 h-5 text-cyan-400/80" />
        </div>

        <div className="p-3.5 rounded-2xl liquid-glass-subtle flex items-center justify-between border border-white/10">
          <div>
            <div className="text-slate-400 text-[11px] font-medium">High Risk Score</div>
            <div className="text-base font-bold text-amber-400 mt-0.5">{metrics.highRiskRequests}</div>
          </div>
          <Zap className="w-5 h-5 text-amber-400/80" />
        </div>
      </div>

      {/* Traffic Trends Chart */}
      <div className="p-6 rounded-3xl liquid-glass border border-white/10 shadow-[0_16px_36px_rgba(0,0,0,0.4)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <PulseRadarIcon size={16} className="text-cyan-400" />
              Live Traffic & Interception Timeline
            </h3>
            <p className="text-xs text-slate-400 font-medium">Total API throughput vs rejected origin traffic</p>
          </div>
          <div className="flex items-center gap-3.5 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
              <span className="text-slate-300">Total Volume</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
              <span className="text-slate-300">Blocked / Throttled</span>
            </div>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={metrics.chartData || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorBlocked" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(10, 16, 32, 0.95)',
                  backdropFilter: 'blur(16px)',
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                  borderRadius: '1rem',
                  fontSize: '12px',
                  color: '#f8fafc',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
                }}
              />
              <Area type="monotone" dataKey="requests" name="Total Requests" stroke="#06b6d4" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRequests)" />
              <Area type="monotone" dataKey="blocked" name="Blocked/Throttled" stroke="#f43f5e" strokeWidth={2.5} fillOpacity={1} fill="url(#colorBlocked)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Requesters & Endpoints Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Top Authorized Domains */}
        <div className="p-5 rounded-2xl liquid-glass border border-white/10 shadow-lg">
          <div className="flex items-center justify-between mb-3.5">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <LiquidGlobeIcon size={14} className="text-cyan-400" />
              Top Domains
            </h4>
            <button
              onClick={() => onNavigate('domains')}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5 cursor-pointer font-semibold"
            >
              View all <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            {metrics.topDomains?.map((d: any) => (
              <div key={d.domain}>
                <div className="flex justify-between text-slate-300 mb-1 font-medium">
                  <span className="font-mono text-slate-200 truncate max-w-[180px]">{d.domain}</span>
                  <span className="font-semibold text-slate-400">{d.count}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-sky-400 rounded-full"
                    style={{
                      width: `${Math.min(100, (d.count / (metrics.topDomains[0]?.count || 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Endpoints */}
        <div className="p-5 rounded-2xl liquid-glass border border-white/10 shadow-lg">
          <div className="flex items-center justify-between mb-3.5">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <QuantumCpuIcon size={14} className="text-indigo-400" />
              Protected Endpoints
            </h4>
            <button
              onClick={() => onNavigate('requests')}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5 cursor-pointer font-semibold"
            >
              Logs <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            {metrics.topEndpoints?.map((e: any) => (
              <div key={e.endpoint}>
                <div className="flex justify-between text-slate-300 mb-1 font-medium">
                  <span className="font-mono text-slate-200 truncate max-w-[180px]">{e.endpoint}</span>
                  <span className="font-semibold text-slate-400">{e.count}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-400 rounded-full"
                    style={{
                      width: `${Math.min(100, (e.count / (metrics.topEndpoints[0]?.count || 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Countries */}
        <div className="p-5 rounded-2xl liquid-glass border border-white/10 shadow-lg">
          <div className="flex items-center justify-between mb-3.5">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <LiquidGlobeIcon size={14} className="text-emerald-400" />
              Geo Distribution
            </h4>
            <span className="text-[11px] text-slate-400 font-mono">GeoIP</span>
          </div>

          <div className="space-y-3 text-xs">
            {metrics.topCountries?.map((c: any) => (
              <div key={c.country}>
                <div className="flex justify-between text-slate-300 mb-1 font-medium">
                  <span className="text-slate-200">{c.country}</span>
                  <span className="font-semibold text-slate-400">{c.count}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                    style={{
                      width: `${Math.min(100, (c.count / (metrics.topCountries[0]?.count || 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
