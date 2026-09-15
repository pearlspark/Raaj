'use client';

import React from 'react';
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
  BarChart,
  Bar,
} from 'recharts';

interface OverviewProps {
  metrics: any;
  onNavigate: (tab: string) => void;
}

export const OverviewDashboard: React.FC<OverviewProps> = ({ metrics, onNavigate }) => {
  if (!metrics) {
    return (
      <div className="p-8 text-center text-slate-400">
        <div className="animate-spin w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full mx-auto mb-3" />
        Loading telemetry metrics...
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
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Gateway Security Posture
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              OPTIMAL DEFENSE
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Unauthorized domains and direct scripts are intercepted at edge. High-risk traffic is
            rate-limited or temporarily quarantined.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('domains')}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-white transition-all shadow-md shadow-sky-500/20 flex items-center gap-1.5"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Manage Domains</span>
          </button>
          <button
            onClick={() => onNavigate('testing')}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Run Security Tests</span>
          </button>
        </div>
      </div>

      {/* Primary Metric KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
        {/* Total Requests */}
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Total Requests</span>
            <Activity className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {metrics.totalRequests?.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span className="text-emerald-400 font-semibold">{metrics.requestsToday}</span> today •{' '}
            <span className="text-slate-300 font-semibold">{metrics.requestsThisHour}</span>/hr
          </div>
        </div>

        {/* Success Rate */}
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Success Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 tracking-tight">{successRate}%</div>
          <div className="text-[11px] text-slate-400 mt-1">
            {metrics.successfulRequests?.toLocaleString()} passed • {metrics.failedRequests} rejected
          </div>
        </div>

        {/* Unauthorized & Blocked */}
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Security Interceptions</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 tracking-tight">
            {metrics.count403 + metrics.count401}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            403 Block: <span className="text-rose-300 font-semibold">{metrics.count403}</span> • 401 Unauth:{' '}
            <span className="text-amber-300 font-semibold">{metrics.count401}</span>
          </div>
        </div>

        {/* Rate-Limit Violations */}
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Rate-Limit 429s</span>
            <AlertOctagon className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 tracking-tight">{metrics.count429}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Avg Latency: <span className="text-slate-200 font-semibold">{metrics.avgLatencyMs}ms</span>
          </div>
        </div>
      </div>

      {/* Secondary Status Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-[11px]">Active Domains</div>
            <div className="text-base font-bold text-white">{metrics.activeDomains}</div>
          </div>
          <Globe className="w-5 h-5 text-emerald-400/80" />
        </div>

        <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-[11px]">Blocked Domains</div>
            <div className="text-base font-bold text-rose-400">{metrics.blockedDomains}</div>
          </div>
          <ShieldAlert className="w-5 h-5 text-rose-400/80" />
        </div>

        <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-[11px]">Unique Client IPs</div>
            <div className="text-base font-bold text-white">{metrics.uniqueIps}</div>
          </div>
          <Server className="w-5 h-5 text-sky-400/80" />
        </div>

        <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-[11px]">High Risk Requests</div>
            <div className="text-base font-bold text-amber-400">{metrics.highRiskRequests}</div>
          </div>
          <Zap className="w-5 h-5 text-amber-400/80" />
        </div>
      </div>

      {/* Traffic Trends Chart */}
      <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">Live Traffic & Blocked Requests Timeline</h3>
            <p className="text-xs text-slate-400">Total API volume vs rejected/quarantined traffic</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
              <span className="text-slate-300">Total Volume</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="text-slate-300">Blocked / Throttled</span>
            </div>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={metrics.chartData || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorBlocked" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                  color: '#f8fafc',
                }}
              />
              <Area type="monotone" dataKey="requests" name="Total Requests" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#colorRequests)" />
              <Area type="monotone" dataKey="blocked" name="Blocked/Throttled" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorBlocked)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Requesters & Endpoints Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Top Authorized Domains */}
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Top Domains</h4>
            <button
              onClick={() => onNavigate('domains')}
              className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-0.5"
            >
              View all <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            {metrics.topDomains?.map((d: any) => (
              <div key={d.domain}>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span className="font-mono text-slate-200 truncate max-w-[180px]">{d.domain}</span>
                  <span className="font-semibold text-slate-400">{d.count}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-sky-500 rounded-full"
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
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Top Protected Endpoints</h4>
            <button
              onClick={() => onNavigate('requests')}
              className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-0.5"
            >
              Logs <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            {metrics.topEndpoints?.map((e: any) => (
              <div key={e.endpoint}>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span className="font-mono text-slate-200 truncate max-w-[180px]">{e.endpoint}</span>
                  <span className="font-semibold text-slate-400">{e.count}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
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
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Geographic Distribution</h4>
            <span className="text-[11px] text-slate-400">GeoIP</span>
          </div>

          <div className="space-y-3 text-xs">
            {metrics.topCountries?.map((c: any) => (
              <div key={c.country}>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span className="text-slate-200">{c.country}</span>
                  <span className="font-semibold text-slate-400">{c.count}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
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
