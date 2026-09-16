'use client';

import React, { useState, useEffect } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { OverviewDashboard } from './OverviewDashboard';
import { LiveMonitor } from './LiveMonitor';
import { DomainManager } from './DomainManager';
import { RequestExplorer } from './RequestExplorer';
import { SecurityEvents } from './SecurityEvents';
import { IpManager } from './IpManager';
import { TestingSuite } from './TestingSuite';
import { SettingsView } from './SettingsView';
import { AuditLogsView } from './AuditLogsView';
import { IntegrationGuide } from './IntegrationGuide';
import { GlassShieldIcon, LiquidLockIcon } from '../ui/PremiumIcons';
import { User, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';

export default function AdminConsole() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [adminUser, setAdminUser] = useState<{ username: string; role: string } | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // App data state
  const [metrics, setMetrics] = useState<any>(null);
  const [domains, setDomains] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [securityEvents, setSecurityEvents] = useState<any[]>([]);
  const [blockedIps, setBlockedIps] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const loadDashboardData = async () => {
    try {
      const [statsRes, domainsRes, eventsRes, ipsRes, settingsRes, auditRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/domains'),
        fetch('/api/admin/security-events'),
        fetch('/api/admin/ips'),
        fetch('/api/admin/settings'),
        fetch('/api/admin/audit-logs'),
      ]);

      if (statsRes.ok) {
        const d = await statsRes.json();
        setMetrics(d.metrics);
      }
      if (domainsRes.ok) {
        const d = await domainsRes.json();
        setDomains(d.domains || []);
        setClients(d.clients || []);
      }
      if (eventsRes.ok) {
        const d = await eventsRes.json();
        setSecurityEvents(d.events || []);
      }
      if (ipsRes.ok) {
        const d = await ipsRes.json();
        setBlockedIps(d.blockedIps || []);
      }
      if (settingsRes.ok) {
        const d = await settingsRes.json();
        setSettings(d.settings);
      }
      if (auditRes.ok) {
        const d = await auditRes.json();
        setAuditLogs(d.auditLogs || []);
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    let ignore = false;
    const init = async () => {
      try {
        const res = await fetch('/api/admin/me');
        if (res.ok) {
          const data = await res.json();
          if (!ignore) {
            if (data.authenticated) {
              setIsAuthenticated(true);
              setAdminUser(data.user);
              loadDashboardData();
              return;
            }
            setIsAuthenticated(false);
          }
        } else {
          if (!ignore) setIsAuthenticated(false);
        }
      } catch (e) {
        if (!ignore) setIsAuthenticated(false);
      }
    };

    init();
    return () => {
      ignore = true;
    };
  }, []);

  // Periodic metrics refresh
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetch('/api/admin/stats')
        .then((r) => {
          if (!r.ok) return null;
          return r.json();
        })
        .then((d) => {
          if (d?.metrics) setMetrics(d.metrics);
        })
        .catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Login failed');
      }

      setIsAuthenticated(true);
      setAdminUser(data.user);
      loadDashboardData();
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch (e) {}
    setIsAuthenticated(false);
    setAdminUser(undefined);
  };

  const handleBlockIpDirect = async (ip: string, reason: string) => {
    try {
      const res = await fetch('/api/admin/ips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip, reason, isPermanent: false, durationMinutes: 60 }),
      });
      if (res.ok) {
        loadDashboardData();
      }
    } catch (e) {}
  };

  // Loading screen
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="animate-spin w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#070b16] flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
        {/* Dynamic Liquid Ambient Light Auras */}
        <div className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 -right-20 w-[550px] h-[550px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-sky-500/10 rounded-full blur-[90px] pointer-events-none" />

        {/* Liquid Glass Login Shell */}
        <div className="w-full max-w-md liquid-glass rounded-3xl p-8 sm:p-9 shadow-[0_24px_64px_rgba(0,0,0,0.7)] relative z-10 space-y-7">
          {/* Header Brand */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl liquid-badge flex items-center justify-center mx-auto shadow-2xl relative group">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 blur-md group-hover:blur-lg transition-all" />
              <GlassShieldIcon size={34} className="relative z-10 liquid-glow-cyan" />
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center justify-center gap-2">
                <span>Enterprise Gateway</span>
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                Cryptographic Access Enclave & Real-Time Traffic Defense
              </p>
            </div>
          </div>

          {loginError && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-300 flex items-center gap-2.5 backdrop-blur-md">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5 text-xs">
            <div className="space-y-1.5">
              <label className="block text-slate-300 font-medium text-xs tracking-wide">
                Administrator Identifier
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-3 text-slate-400 pointer-events-none">
                  <User className="w-4 h-4 text-cyan-400/70" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="admin username"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl liquid-glass-input text-slate-100 placeholder-slate-500 text-xs font-mono transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-slate-300 font-medium text-xs tracking-wide">
                Security Password
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-3 text-slate-400 pointer-events-none">
                  <LiquidLockIcon size={16} className="text-cyan-400/70" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl liquid-glass-input text-slate-100 placeholder-slate-500 text-xs font-mono transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 rounded-2xl liquid-btn-primary text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2 cursor-pointer"
            >
              {isLoggingIn ? (
                <span>Verifying Security Enclave...</span>
              ) : (
                <>
                  <span>Authenticate Session</span>
                  <ArrowRight className="w-4 h-4 text-white/90" />
                </>
              )}
            </button>
          </form>

          {/* Secure Enclave Trust Notice */}
          <div className="pt-2 border-t border-white/5 flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Encrypted with TLS 1.3 & Argon2/SHA-256 HMAC Enclave</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b16] text-slate-100 flex flex-col font-sans relative selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background Liquid Light Orbs */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[350px] bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[350px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        adminUser={adminUser}
        onLogout={handleLogout}
        metrics={metrics}
      />

      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto relative z-10">
        {activeTab !== 'edu-preview' && (
          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            badgeCounts={{
              securityEvents: securityEvents.length,
              blockedIps: blockedIps.length,
            }}
          />
        )}

        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">
          {activeTab === 'overview' && (
            <OverviewDashboard metrics={metrics} onNavigate={setActiveTab} />
          )}
          {activeTab === 'live' && <LiveMonitor onBlockIp={handleBlockIpDirect} />}
          {activeTab === 'domains' && (
            <DomainManager domains={domains} clients={clients} onRefresh={loadDashboardData} />
          )}
          {activeTab === 'clients' && (
            <DomainManager domains={domains} clients={clients} onRefresh={loadDashboardData} />
          )}
          {activeTab === 'requests' && <RequestExplorer />}
          {activeTab === 'security' && (
            <SecurityEvents
              events={securityEvents}
              onRefresh={loadDashboardData}
              onBlockIp={handleBlockIpDirect}
            />
          )}
          {activeTab === 'ips' && (
            <IpManager blockedIps={blockedIps} onRefresh={loadDashboardData} />
          )}
          {activeTab === 'testing' && <TestingSuite />}
          {activeTab === 'settings' && settings && (
            <SettingsView settings={settings} onRefresh={loadDashboardData} />
          )}
          {activeTab === 'audit' && <AuditLogsView auditLogs={auditLogs} />}
          {activeTab === 'integration' && <IntegrationGuide />}
        </main>
      </div>
    </div>
  );
}
