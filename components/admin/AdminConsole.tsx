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
import { EduAppView } from '../player/EduAppView';
import { Shield, Lock, User, Key, AlertTriangle, ArrowRight } from 'lucide-react';

export default function AdminConsole() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [adminUser, setAdminUser] = useState<{ username: string; role: string } | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Login form state
  const [loginUsername, setLoginUsername] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('Admin@Shield2026!');
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
      fetch('/api/admin/stats')
        .then((r) => r.json())
        .then((d) => {
          if (d.metrics) setMetrics(d.metrics);
        })
        .catch(() => {});
    }, 10000);
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
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl relative z-10 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center mx-auto shadow-lg shadow-sky-500/25">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              API Shield & Gateway Console
            </h1>
            <p className="text-xs text-slate-400">
              Domain Authorization • Cryptographic Defense • Analytics
            </p>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Administrator Username</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-sky-500 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Security Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-sky-500 text-xs font-mono"
                />
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-[11px] text-slate-400">
              <span className="text-slate-300 font-semibold">Pre-configured Admin:</span> <code className="text-sky-400">admin</code> / <code className="text-sky-400">Admin@Shield2026!</code>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs transition-all shadow-md shadow-sky-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoggingIn ? (
                <span>Authenticating Gateway Session...</span>
              ) : (
                <>
                  <span>Sign In to Admin Console</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        adminUser={adminUser}
        onLogout={handleLogout}
        metrics={metrics}
      />

      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto">
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
          {activeTab === 'edu-preview' && <EduAppView />}
        </main>
      </div>
    </div>
  );
}
