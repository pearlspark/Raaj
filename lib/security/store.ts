import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  DomainRecord,
  ApiClientRecord,
  RequestLog,
  SecurityEvent,
  BlockedIP,
  AdminAuditLog,
  SystemSettings,
  Severity,
  ProtectedApiRoute,
} from './types';
import { generateClientCredentials, hashAdminPassword, hashSecret, generateEncryptionKey } from './crypto';
import { normalizeDomain } from './domainGuard';
import { getDatabase } from '@/lib/db/mongodb';

interface StoreData {
  domains: DomainRecord[];
  clients: ApiClientRecord[];
  requestLogs: RequestLog[];
  securityEvents: SecurityEvent[];
  blockedIps: BlockedIP[];
  auditLogs: AdminAuditLog[];
  settings: SystemSettings;
  protectedApis: ProtectedApiRoute[];
  adminUsers: {
    id: string;
    username: string;
    passwordHash: string;
    passwordSalt: string;
    role: string;
    createdAt: string;
    lastLoginAt?: string;
  }[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'api-shield-store.json');

// In-memory sliding window rate-limit tracking
// Key -> Array of timestamps in ms
const rateLimitBuckets = new Map<string, number[]>();

// In-memory nonce store for replay protection: Nonce -> Expiration timestamp ms
const activeNonces = new Map<string, number>();

// Temporary IP cooldowns (auto-triggered by high risk engine)
const ipCooldowns = new Map<string, number>();

// Default system settings
const DEFAULT_SETTINGS: SystemSettings = {
  riskThresholds: {
    medium: 30,
    high: 60,
    critical: 80,
  },
  rateLimits: {
    defaultDomainPerMin: 1000,
    defaultIpPerMin: 120,
    videoEndpointPerMin: 20,
    authEndpointPerMin: 30,
  },
  retentionDays: 30,
  enableAutoBlock: true,
  autoBlockDurationMinutes: 15,
  clockSkewSeconds: 300,
  upstreamBaseUrl: process.env.PW_BASE_URL || 'https://api.penpencil.co',
  allowLocalhostTesting: true,
  masterEncryptionKey: process.env.API_RESPONSE_ENCRYPTION_KEY || 'sec_8f49ad20e5c10b7b659c21ef458a01cd79a0b12c',
};

class SecurityStore {
  private data: StoreData;
  private initialized = false;
  private mongoSyncTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.data = this.loadData();
    this.initialized = true;
    this.cleanupExpiredNonces();
    // Fire background MongoDB sync/bootstrap
    this.initMongoSync().catch(() => {});
  }

  private async initMongoSync(): Promise<void> {
    try {
      const db = await getDatabase();
      if (!db) return;

      // 1. Purge any dummy records once and for all so they never reappear
      await Promise.all([
        db.collection('authorized_domains').deleteMany({
          $or: [
            { id: { $in: ['dom_example_001', 'dom_pirate_003'] } },
            { domain: { $in: ['https://example.com', 'https://pirate-streams.net'] } },
            { normalizedDomain: { $in: ['example.com', 'pirate-streams.net'] } },
          ],
        }).catch(() => {}),
        db.collection('api_clients').deleteMany({
          $or: [
            { clientId: { $in: ['client_2520d4e3d4271f6d37a010a1', 'client_aa02d7e7031ba4a44cb077f7'] } },
            { name: { $in: ['Example Production Web Portal', 'Revoked Scraper Client'] } },
            { domainName: { $in: ['https://example.com', 'https://pirate-streams.net'] } },
          ],
        }).catch(() => {}),
        db.collection('blocked_ips').deleteMany({
          ip: { $in: ['185.220.101.5', '194.26.29.112'] },
        }).catch(() => {}),
      ]);

      // 2. Fetch authoritative real records from MongoDB
      const [remoteDomains, remoteClients, remoteSettings, remoteBlockedIps, remoteProtectedApis] = await Promise.all([
        db.collection('authorized_domains').find({}).toArray().catch(() => []),
        db.collection('api_clients').find({}).toArray().catch(() => []),
        db.collection('system_settings').findOne({ _id: 'global_settings' as any }).catch(() => null),
        db.collection('blocked_ips').find({}).toArray().catch(() => []),
        db.collection('protected_apis').find({}).toArray().catch(() => []),
      ]);

      // Load remote data - MongoDB is the source of truth
      this.data.domains = remoteDomains.map((rd: any) => {
        const { _id, ...domData } = rd;
        return domData as DomainRecord;
      });

      this.data.clients = remoteClients.map((rc: any) => {
        const { _id, ...clientData } = rc;
        return clientData as ApiClientRecord;
      });

      if (remoteBlockedIps && remoteBlockedIps.length > 0) {
        this.data.blockedIps = remoteBlockedIps.map((rb: any) => {
          const { _id, ...ipData } = rb;
          return ipData as BlockedIP;
        });
      }

      if (remoteProtectedApis && remoteProtectedApis.length > 0) {
        this.data.protectedApis = remoteProtectedApis.map((ra: any) => {
          const { _id, ...apiData } = ra;
          return apiData as ProtectedApiRoute;
        });
      }

      if (remoteSettings) {
        const { _id, ...settingsData } = remoteSettings as any;
        this.data.settings = { ...DEFAULT_SETTINGS, ...settingsData };
      }

      try {
        if (!fs.existsSync(DATA_DIR)) {
          fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
      } catch {
        // ignore
      }
    } catch (err) {
      console.warn('[MongoDB] Init sync skipped:', (err as Error).message);
    }
  }

  public async syncToMongo(): Promise<{ success: boolean; syncedDomains: number; syncedClients: number }> {
    try {
      const db = await getDatabase();
      if (!db) {
        return { success: false, syncedDomains: 0, syncedClients: 0 };
      }

      for (const domain of this.data.domains) {
        await db.collection('authorized_domains').updateOne(
          { id: domain.id },
          { $set: domain },
          { upsert: true }
        );
      }

      for (const client of this.data.clients) {
        await db.collection('api_clients').updateOne(
          { clientId: client.clientId },
          { $set: client },
          { upsert: true }
        );
      }

      for (const blocked of this.data.blockedIps) {
        await db.collection('blocked_ips').updateOne(
          { ip: blocked.ip },
          { $set: blocked },
          { upsert: true }
        );
      }

      if (this.data.protectedApis && this.data.protectedApis.length > 0) {
        for (const api of this.data.protectedApis) {
          await db.collection('protected_apis').updateOne(
            { id: api.id },
            { $set: api },
            { upsert: true }
          );
        }
      }

      await db.collection('system_settings').updateOne(
        { _id: 'global_settings' as any },
        { $set: { ...this.data.settings, updatedAt: new Date().toISOString() } },
        { upsert: true }
      );

      return {
        success: true,
        syncedDomains: this.data.domains.length,
        syncedClients: this.data.clients.length,
      };
    } catch (err) {
      console.warn('[MongoDB] syncToMongo error:', (err as Error).message);
      return { success: false, syncedDomains: 0, syncedClients: 0 };
    }
  }

  private loadData(): StoreData {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        // Filter out any stale dummy data if present
        const cleanDomains = (parsed.domains || []).filter(
          (d: any) => !['dom_example_001', 'dom_pirate_003'].includes(d.id) &&
                      !['example.com', 'pirate-streams.net'].includes(d.normalizedDomain)
        );
        const cleanClients = (parsed.clients || []).filter(
          (c: any) => !['client_2520d4e3d4271f6d37a010a1', 'client_aa02d7e7031ba4a44cb077f7'].includes(c.clientId)
        );

        return {
          ...parsed,
          domains: cleanDomains,
          clients: cleanClients,
          protectedApis: parsed.protectedApis || [],
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
        };
      }
    } catch (err) {
      console.warn('Could not read persistent store, initializing clean store:', err);
    }

    return this.createSeedData();
  }

  private saveData(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save persistent store to disk:', err);
    }
  }

  private createSeedData(): StoreData {
    const configuredAdmin = process.env.ADMIN_USERNAME?.trim() || 'admin';
    const nowIso = new Date().toISOString();
    const adminUsers = [
      {
        id: 'usr_admin_001',
        username: configuredAdmin,
        passwordHash: '',
        passwordSalt: '',
        role: 'SUPER_ADMIN',
        createdAt: nowIso,
        lastLoginAt: nowIso,
      },
    ];

    const seeded: StoreData = {
      domains: [],
      clients: [],
      requestLogs: [],
      securityEvents: [],
      blockedIps: [],
      auditLogs: [],
      protectedApis: [],
      settings: DEFAULT_SETTINGS,
      adminUsers,
    };

    return seeded;
  }

  // --- NONCE MANAGEMENT FOR REPLAY ATTACKS ---
  public registerNonce(nonce: string, ttlSeconds: number = 300): boolean {
    const now = Date.now();
    if (activeNonces.has(nonce)) {
      const expiresAt = activeNonces.get(nonce)!;
      if (expiresAt > now) {
        return false; // Replay detected!
      }
    }
    activeNonces.set(nonce, now + ttlSeconds * 1000);
    return true;
  }

  private cleanupExpiredNonces(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [nonce, expiresAt] of activeNonces.entries()) {
        if (expiresAt <= now) {
          activeNonces.delete(nonce);
        }
      }
      for (const [ip, expiresAt] of ipCooldowns.entries()) {
        if (expiresAt <= now) {
          ipCooldowns.delete(ip);
        }
      }
    }, 60000);
  }

  // --- RATE LIMIT ENGINE (SLIDING WINDOW) ---
  public checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number = 60
  ): { allowed: boolean; remaining: number; resetTimeSeconds: number; currentCount: number } {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const windowStart = now - windowMs;

    let timestamps = rateLimitBuckets.get(key) || [];
    // filter out old timestamps outside the window
    timestamps = timestamps.filter((t) => t > windowStart);

    const currentCount = timestamps.length;
    const remaining = Math.max(0, limit - currentCount);
    const resetTimeSeconds = Math.ceil(windowSeconds - (currentCount > 0 ? (now - timestamps[0]) / 1000 : 0));

    if (currentCount >= limit) {
      rateLimitBuckets.set(key, timestamps);
      return {
        allowed: false,
        remaining: 0,
        resetTimeSeconds: Math.max(1, resetTimeSeconds),
        currentCount,
      };
    }

    timestamps.push(now);
    rateLimitBuckets.set(key, timestamps);

    return {
      allowed: true,
      remaining: limit - timestamps.length,
      resetTimeSeconds: Math.max(1, resetTimeSeconds),
      currentCount: timestamps.length,
    };
  }

  // --- DOMAINS ---
  public getDomains(): DomainRecord[] {
    return this.data.domains;
  }

  public getDomainById(id: string): DomainRecord | undefined {
    return this.data.domains.find((d) => d.id === id);
  }

  public getDomainByClientId(clientId: string): DomainRecord | undefined {
    return this.data.domains.find((d) => d.clientId === clientId);
  }

  public addDomain(params: {
    domain: string;
    mode: 'EXACT' | 'SUBDOMAIN';
    rateLimitPerMin?: number;
    clientName?: string;
  }): { domainRecord: DomainRecord; rawSecret: string } {
    const normalized = normalizeDomain(params.domain);
    if (!normalized.hostname) {
      throw new Error('Invalid domain: ' + (normalized.error || 'Empty hostname'));
    }

    // Check if domain already exists
    const existing = this.data.domains.find(
      (d) => d.normalizedDomain.toLowerCase() === normalized.hostname.toLowerCase()
    );
    if (existing) {
      throw new Error(`Domain ${normalized.hostname} is already registered (ID: ${existing.id})`);
    }

    const creds = generateClientCredentials();
    const nowIso = new Date().toISOString();

    const record: DomainRecord = {
      id: 'dom_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      domain: normalized.fullOrigin,
      normalizedDomain: normalized.hostname,
      mode: params.mode,
      status: 'ACTIVE',
      clientId: creds.clientId,
      clientSecretHash: creds.secretHash,
      clientSecretPrefix: creds.secretPrefix,
      rateLimitPerMin: params.rateLimitPerMin || this.data.settings.rateLimits.defaultDomainPerMin,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rateLimitViolations: 0,
      lastIp: 'None',
      uniqueIps: [],
      uniqueUserAgents: [],
      lastEndpoint: '/',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const clientRecord: ApiClientRecord = {
      clientId: creds.clientId,
      name: params.clientName || `${normalized.hostname} Client`,
      domainId: record.id,
      domainName: record.domain,
      status: 'ACTIVE',
      permissions: ['*'],
      createdAt: nowIso,
    };

    this.data.domains.unshift(record);
    this.data.clients.unshift(clientRecord);
    this.saveData();

    getDatabase().then(async (db) => {
      if (!db) return;
      await Promise.all([
        db.collection('authorized_domains').updateOne({ id: record.id }, { $set: record }, { upsert: true }),
        db.collection('api_clients').updateOne({ clientId: clientRecord.clientId }, { $set: clientRecord }, { upsert: true }),
      ]);
    }).catch((err) => console.warn('[MongoDB] addDomain write error:', (err as Error).message));

    return { domainRecord: record, rawSecret: creds.rawSecret };
  }

  public updateDomain(id: string, updates: Partial<DomainRecord>): DomainRecord {
    const idx = this.data.domains.findIndex((d) => d.id === id);
    if (idx === -1) throw new Error('Domain not found: ' + id);

    const nowIso = new Date().toISOString();
    this.data.domains[idx] = {
      ...this.data.domains[idx],
      ...updates,
      updatedAt: nowIso,
    };
    this.saveData();

    getDatabase().then(async (db) => {
      if (!db) return;
      await db.collection('authorized_domains').updateOne({ id }, { $set: { ...updates, updatedAt: nowIso } });
    }).catch((err) => console.warn('[MongoDB] updateDomain error:', (err as Error).message));

    return this.data.domains[idx];
  }

  public rotateClientSecret(domainId: string): { newRawSecret: string; domainRecord: DomainRecord } {
    const domain = this.getDomainById(domainId);
    if (!domain) throw new Error('Domain not found: ' + domainId);

    const creds = generateClientCredentials();
    const nowIso = new Date().toISOString();
    domain.clientId = creds.clientId;
    domain.clientSecretHash = creds.secretHash;
    domain.clientSecretPrefix = creds.secretPrefix;
    domain.updatedAt = nowIso;

    // Update associated client
    const client = this.data.clients.find((c) => c.domainId === domainId);
    if (client) {
      client.clientId = creds.clientId;
      client.status = 'ACTIVE';
    }

    this.saveData();

    getDatabase().then(async (db) => {
      if (!db) return;
      await db.collection('authorized_domains').updateOne(
        { id: domainId },
        {
          $set: {
            clientId: creds.clientId,
            clientSecretHash: creds.secretHash,
            clientSecretPrefix: creds.secretPrefix,
            updatedAt: nowIso,
          },
        }
      );
      if (client) {
        await db.collection('api_clients').updateOne(
          { domainId },
          { $set: { clientId: creds.clientId, status: 'ACTIVE' } }
        );
      }
    }).catch((err) => console.warn('[MongoDB] rotateClientSecret error:', (err as Error).message));

    return { newRawSecret: creds.rawSecret, domainRecord: domain };
  }

  public deleteDomain(id: string): void {
    const idx = this.data.domains.findIndex((d) => d.id === id);
    if (idx === -1) throw new Error('Domain not found');

    this.data.domains.splice(idx, 1);
    this.data.clients = this.data.clients.filter((c) => c.domainId !== id);
    this.saveData();

    // Immediately remove from MongoDB so it never reappears
    getDatabase().then(async (db) => {
      if (!db) return;
      await Promise.all([
        db.collection('authorized_domains').deleteOne({ id }),
        db.collection('api_clients').deleteMany({ domainId: id }),
      ]);
    }).catch((err) => console.warn('[MongoDB] deleteDomain error:', (err as Error).message));
  }

  // --- CLIENTS ---
  public getClients(): ApiClientRecord[] {
    return this.data.clients;
  }

  public getClientById(clientId: string): ApiClientRecord | undefined {
    return this.data.clients.find((c) => c.clientId === clientId);
  }

  public revokeClient(clientId: string): ApiClientRecord {
    const client = this.getClientById(clientId);
    if (!client) throw new Error('Client not found: ' + clientId);
    client.status = 'REVOKED';

    const domain = this.getDomainByClientId(clientId);
    if (domain) {
      domain.status = 'DISABLED';
    }

    this.saveData();

    getDatabase().then(async (db) => {
      if (!db) return;
      await Promise.all([
        db.collection('api_clients').updateOne({ clientId }, { $set: { status: 'REVOKED' } }),
        domain ? db.collection('authorized_domains').updateOne({ id: domain.id }, { $set: { status: 'DISABLED' } }) : Promise.resolve(),
      ]);
    }).catch((err) => console.warn('[MongoDB] revokeClient error:', (err as Error).message));

    return client;
  }

  // --- REQUEST LOGS ---
  public addRequestLog(log: RequestLog): void {
    this.data.requestLogs.unshift(log);

    // Update domain telemetry stats
    const domain = this.data.domains.find(
      (d) => d.normalizedDomain === log.domain || d.clientId === log.clientId
    );
    if (domain) {
      domain.totalRequests++;
      if (log.statusCode >= 200 && log.statusCode < 400) {
        domain.successfulRequests++;
      } else {
        domain.failedRequests++;
      }
      if (log.statusCode === 429) {
        domain.rateLimitViolations++;
      }
      domain.lastIp = log.ip;
      domain.lastEndpoint = log.endpoint;
      domain.lastActiveAt = log.timestamp;

      if (!domain.uniqueIps.includes(log.ip)) {
        domain.uniqueIps.push(log.ip);
      }
      if (log.userAgent && !domain.uniqueUserAgents.includes(log.userAgent)) {
        domain.uniqueUserAgents.push(log.userAgent);
      }
    }

    // Keep log table from growing indefinitely (max 10,000 in local memory)
    if (this.data.requestLogs.length > 5000) {
      this.data.requestLogs = this.data.requestLogs.slice(0, 5000);
    }

    // Periodic debounced persist
    this.scheduleSave();
  }

  private saveTimer: NodeJS.Timeout | null = null;
  private scheduleSave(): void {
    if (!this.saveTimer) {
      this.saveTimer = setTimeout(() => {
        this.saveData();
        this.saveTimer = null;
      }, 3000);
    }
  }

  public getRequestLogs(params: {
    search?: string;
    domain?: string;
    clientId?: string;
    ip?: string;
    endpoint?: string;
    statusCode?: number;
    riskLevel?: string;
    page?: number;
    limit?: number;
  }): { logs: RequestLog[]; total: number; page: number; totalPages: number } {
    let filtered = [...this.data.requestLogs];

    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.requestId.toLowerCase().includes(q) ||
          l.endpoint.toLowerCase().includes(q) ||
          l.ip.toLowerCase().includes(q) ||
          l.domain.toLowerCase().includes(q) ||
          l.country.toLowerCase().includes(q)
      );
    }

    if (params.domain) {
      filtered = filtered.filter((l) => l.domain.toLowerCase().includes(params.domain!.toLowerCase()));
    }
    if (params.clientId) {
      filtered = filtered.filter((l) => l.clientId === params.clientId);
    }
    if (params.ip) {
      filtered = filtered.filter((l) => l.ip === params.ip);
    }
    if (params.endpoint) {
      filtered = filtered.filter((l) => l.endpoint.toLowerCase().includes(params.endpoint!.toLowerCase()));
    }
    if (params.statusCode) {
      filtered = filtered.filter((l) => l.statusCode === params.statusCode);
    }
    if (params.riskLevel) {
      if (params.riskLevel === 'CRITICAL') filtered = filtered.filter((l) => l.riskScore >= 80);
      else if (params.riskLevel === 'HIGH') filtered = filtered.filter((l) => l.riskScore >= 60 && l.riskScore < 80);
      else if (params.riskLevel === 'MEDIUM') filtered = filtered.filter((l) => l.riskScore >= 30 && l.riskScore < 60);
      else if (params.riskLevel === 'LOW') filtered = filtered.filter((l) => l.riskScore < 30);
    }

    const page = params.page || 1;
    const limit = params.limit || 50;
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const start = (page - 1) * limit;
    const logs = filtered.slice(start, start + limit);

    return { logs, total, page, totalPages };
  }

  public clearRequestLogs(): void {
    this.data.requestLogs = [];
    this.saveData();
    getDatabase().then((db) => {
      if (db) db.collection('request_logs').deleteMany({}).catch(() => {});
    }).catch(() => {});
  }

  // --- SECURITY EVENTS ---
  public addSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): SecurityEvent {
    const fullEvent: SecurityEvent = {
      ...event,
      id: 'sec_evt_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      timestamp: new Date().toISOString(),
    };
    this.data.securityEvents.unshift(fullEvent);
    if (this.data.securityEvents.length > 2000) {
      this.data.securityEvents = this.data.securityEvents.slice(0, 2000);
    }
    this.scheduleSave();
    return fullEvent;
  }

  public getSecurityEvents(limit: number = 100): SecurityEvent[] {
    return this.data.securityEvents.slice(0, limit);
  }

  public clearSecurityEvents(): void {
    this.data.securityEvents = [];
    this.saveData();
    getDatabase().then((db) => {
      if (db) db.collection('security_events').deleteMany({}).catch(() => {});
    }).catch(() => {});
  }

  // --- IP BLOCKING & COOLDOWNS ---
  public isIpBlocked(ip: string): { blocked: boolean; reason?: string } {
    // Check cooldown
    const cooldownUntil = ipCooldowns.get(ip);
    if (cooldownUntil && cooldownUntil > Date.now()) {
      return {
        blocked: true,
        reason: `Temporary security cooldown active until ${new Date(cooldownUntil).toISOString()}`,
      };
    }

    // Check permanent / timed blocked list
    const found = this.data.blockedIps.find((b) => b.ip === ip);
    if (!found) return { blocked: false };

    if (!found.isPermanent && found.expiresAt) {
      if (new Date(found.expiresAt).getTime() < Date.now()) {
        // Expired, remove
        this.unblockIp(ip, 'system_expiration');
        return { blocked: false };
      }
    }

    return { blocked: true, reason: found.reason };
  }

  public blockIp(
    ip: string,
    reason: string,
    isPermanent: boolean = false,
    durationMinutes: number = 60,
    blockedBy: string = 'admin'
  ): BlockedIP {
    const existingIdx = this.data.blockedIps.findIndex((b) => b.ip === ip);
    const now = new Date();
    const expiresAt = isPermanent ? undefined : new Date(now.getTime() + durationMinutes * 60000).toISOString();

    const record: BlockedIP = {
      ip,
      reason,
      blockedAt: now.toISOString(),
      expiresAt,
      isPermanent,
      blockedBy,
    };

    if (existingIdx >= 0) {
      this.data.blockedIps[existingIdx] = record;
    } else {
      this.data.blockedIps.unshift(record);
    }

    this.saveData();

    getDatabase().then(async (db) => {
      if (!db) return;
      await db.collection('blocked_ips').updateOne({ ip: record.ip }, { $set: record }, { upsert: true });
    }).catch((err) => console.warn('[MongoDB] blockIp error:', (err as Error).message));

    return record;
  }

  public setTemporaryIpCooldown(ip: string, durationMinutes: number = 15): void {
    ipCooldowns.set(ip, Date.now() + durationMinutes * 60000);
  }

  public unblockIp(ip: string, admin: string = 'admin'): boolean {
    const initialLen = this.data.blockedIps.length;
    this.data.blockedIps = this.data.blockedIps.filter((b) => b.ip !== ip);
    ipCooldowns.delete(ip);
    this.saveData();

    getDatabase().then(async (db) => {
      if (!db) return;
      await db.collection('blocked_ips').deleteOne({ ip });
    }).catch((err) => console.warn('[MongoDB] unblockIp error:', (err as Error).message));

    this.addAuditLog({
      admin,
      action: 'IP_UNBLOCKED',
      target: ip,
      ip: '127.0.0.1',
      details: 'IP unblocked and removed from blacklist',
      result: 'SUCCESS',
    });
    return this.data.blockedIps.length !== initialLen;
  }

  public getBlockedIps(): BlockedIP[] {
    return this.data.blockedIps;
  }

  // --- AUDIT LOGS ---
  public addAuditLog(log: Omit<AdminAuditLog, 'id' | 'timestamp'>): void {
    const fullLog: AdminAuditLog = {
      ...log,
      id: 'aud_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      timestamp: new Date().toISOString(),
    };
    this.data.auditLogs.unshift(fullLog);
    if (this.data.auditLogs.length > 2000) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 2000);
    }
    this.scheduleSave();
  }

  public getAuditLogs(limit: number = 100): AdminAuditLog[] {
    return this.data.auditLogs.slice(0, limit);
  }

  // --- SETTINGS ---
  public getSettings(): SystemSettings {
    return this.data.settings;
  }

  public updateSettings(updates: Partial<SystemSettings>): SystemSettings {
    this.data.settings = {
      ...this.data.settings,
      ...updates,
    };
    this.saveData();

    getDatabase().then(async (db) => {
      if (!db) return;
      await db.collection('system_settings').updateOne(
        { _id: 'global_settings' as any },
        { $set: { ...this.data.settings, updatedAt: new Date().toISOString() } },
        { upsert: true }
      );
    }).catch((err) => console.warn('[MongoDB] updateSettings error:', (err as Error).message));

    return this.data.settings;
  }

  // --- ADMIN USERS ---
  public getAdminByUsername(username: string) {
    return this.data.adminUsers.find((u) => u.username.toLowerCase() === username.toLowerCase());
  }

  public updateAdminLastLogin(username: string) {
    let u = this.getAdminByUsername(username);
    if (u) {
      u.lastLoginAt = new Date().toISOString();
    } else {
      u = {
        id: 'usr_admin_' + Date.now().toString(36),
        username,
        passwordHash: '',
        passwordSalt: '',
        role: 'SUPER_ADMIN',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      this.data.adminUsers.push(u);
    }
    this.saveData();
  }

  // --- DASHBOARD AGGREGATED METRICS ---
  public getDashboardMetrics() {
    const logs = this.data.requestLogs;
    const now = Date.now();
    const oneHourAgo = now - 3600 * 1000;
    const oneDayAgo = now - 24 * 3600 * 1000;
    const oneMinuteAgo = now - 60 * 1000;

    let total = logs.length;
    let requestsToday = 0;
    let requestsHour = 0;
    let requestsMinute = 0;
    let successful = 0;
    let failed = 0;
    let count401 = 0;
    let count403 = 0;
    let count429 = 0;
    let count500 = 0;
    let suspiciousCount = 0;
    let highRiskCount = 0;

    const uniqueIpsSet = new Set<string>();
    const endpointCounts: Record<string, number> = {};
    const domainCounts: Record<string, number> = {};
    const countryCounts: Record<string, number> = {};
    let totalLatency = 0;

    // Time-bucket series for chart (last 24 hours / last 12 intervals)
    const intervalMinutes = 120; // 2 hour intervals
    const chartBuckets: { time: string; requests: number; blocked: number; latency: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const bucketTime = new Date(now - i * intervalMinutes * 60000);
      const label = bucketTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      chartBuckets.push({ time: label, requests: 0, blocked: 0, latency: 0 });
    }

    logs.forEach((log) => {
      const logTime = new Date(log.timestamp).getTime();
      uniqueIpsSet.add(log.ip);

      if (logTime >= oneDayAgo) requestsToday++;
      if (logTime >= oneHourAgo) requestsHour++;
      if (logTime >= oneMinuteAgo) requestsMinute++;

      if (log.statusCode >= 200 && log.statusCode < 400) successful++;
      else failed++;

      if (log.statusCode === 401) count401++;
      if (log.statusCode === 403) count403++;
      if (log.statusCode === 429) count429++;
      if (log.statusCode >= 500) count500++;

      if (log.riskScore >= 30) suspiciousCount++;
      if (log.riskScore >= 60) highRiskCount++;

      totalLatency += log.responseTimeMs || 0;

      // Groupings
      endpointCounts[log.endpoint] = (endpointCounts[log.endpoint] || 0) + 1;
      domainCounts[log.domain] = (domainCounts[log.domain] || 0) + 1;
      countryCounts[log.country || 'Unknown'] = (countryCounts[log.country || 'Unknown'] || 0) + 1;

      // Bucket attribution
      const diffHours = (now - logTime) / (1000 * 60 * intervalMinutes);
      const bucketIndex = 11 - Math.floor(diffHours);
      if (bucketIndex >= 0 && bucketIndex < 12) {
        chartBuckets[bucketIndex].requests++;
        if (log.blocked || log.statusCode === 403 || log.statusCode === 429) {
          chartBuckets[bucketIndex].blocked++;
        }
        chartBuckets[bucketIndex].latency += log.responseTimeMs;
      }
    });

    chartBuckets.forEach((b) => {
      if (b.requests > 0) {
        b.latency = Math.round(b.latency / b.requests);
      }
    });

    const activeDomains = this.data.domains.filter((d) => d.status === 'ACTIVE').length;
    const blockedDomains = this.data.domains.filter((d) => d.status === 'BLOCKED').length;
    const avgLatency = total > 0 ? Math.round(totalLatency / total) : 0;

    // Top lists
    const topEndpoints = Object.entries(endpointCounts)
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topDomains = Object.entries(domainCounts)
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topCountries = Object.entries(countryCounts)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalRequests: total,
      requestsToday,
      requestsThisHour: requestsHour,
      requestsThisMinute: requestsMinute,
      successfulRequests: successful,
      failedRequests: failed,
      count401,
      count403,
      count429,
      count500,
      uniqueDomains: this.data.domains.length,
      activeDomains,
      blockedDomains,
      uniqueIps: uniqueIpsSet.size,
      suspiciousRequests: suspiciousCount,
      highRiskRequests: highRiskCount,
      avgLatencyMs: avgLatency,
      topEndpoints,
      topDomains,
      topCountries,
      chartData: chartBuckets,
    };
  }

  // --- PROTECTED APIS MANAGEMENT ---
  public getProtectedApis(): ProtectedApiRoute[] {
    return [...(this.data.protectedApis || [])];
  }

  public getProtectedApi(id: string): ProtectedApiRoute | undefined {
    return (this.data.protectedApis || []).find((a) => a.id === id);
  }

  public getProtectedApiBySlug(slug: string): ProtectedApiRoute | undefined {
    const raw = (slug || '').trim().split('?')[0];
    const normalized = raw.startsWith('/') ? raw.toLowerCase() : `/${raw.toLowerCase()}`;
    return (this.data.protectedApis || []).find((a) => {
      const aSlug = a.slug.trim().split('?')[0];
      const apiSlug = aSlug.startsWith('/') ? aSlug.toLowerCase() : `/${aSlug.toLowerCase()}`;
      return apiSlug === normalized;
    });
  }

  public addProtectedApi(
    entry: Omit<ProtectedApiRoute, 'id' | 'createdAt' | 'updatedAt' | 'totalRequests' | 'successfulRequests' | 'failedRequests'>
  ): ProtectedApiRoute {
    const now = new Date().toISOString();
    const rawSlug = (entry.slug || '').trim().split('?')[0];
    const normalizedSlug = rawSlug.startsWith('/') ? rawSlug : `/${rawSlug}`;
    const newApi: ProtectedApiRoute = {
      id: 'api_' + crypto.randomBytes(8).toString('hex'),
      name: entry.name?.trim() || normalizedSlug,
      upstreamUrl: entry.upstreamUrl.trim(),
      slug: normalizedSlug,
      methods: entry.methods && entry.methods.length > 0 ? entry.methods : ['GET', 'POST'],
      encryptionEnabled: entry.encryptionEnabled !== undefined ? entry.encryptionEnabled : true,
      encryptionKey: entry.encryptionKey?.trim() || undefined,
      rateLimitPerMin: entry.rateLimitPerMin || 60,
      status: entry.status || 'ACTIVE',
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      createdAt: now,
      updatedAt: now,
    };

    if (!this.data.protectedApis) {
      this.data.protectedApis = [];
    }
    this.data.protectedApis.unshift(newApi);
    this.saveData();
    this.syncToMongo().catch(() => {});
    return newApi;
  }

  public updateProtectedApi(id: string, updates: Partial<ProtectedApiRoute>): ProtectedApiRoute | null {
    if (!this.data.protectedApis) this.data.protectedApis = [];
    const idx = this.data.protectedApis.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    const current = this.data.protectedApis[idx];
    let slug = current.slug;
    if (updates.slug) {
      const raw = updates.slug.trim().split('?')[0];
      slug = raw.startsWith('/') ? raw : `/${raw}`;
    }
    const updated: ProtectedApiRoute = {
      ...current,
      ...updates,
      slug,
      updatedAt: new Date().toISOString(),
    };
    this.data.protectedApis[idx] = updated;
    this.saveData();
    this.syncToMongo().catch(() => {});
    return updated;
  }

  public deleteProtectedApi(id: string): boolean {
    if (!this.data.protectedApis) return false;
    const initialLen = this.data.protectedApis.length;
    this.data.protectedApis = this.data.protectedApis.filter((a) => a.id !== id);
    if (this.data.protectedApis.length !== initialLen) {
      this.saveData();
      this.syncToMongo().catch(() => {});
      return true;
    }
    return false;
  }

  public recordProtectedApiMetrics(id: string, success: boolean, latencyMs: number): void {
    if (!this.data.protectedApis) return;
    const api = this.data.protectedApis.find((a) => a.id === id);
    if (!api) return;
    api.totalRequests = (api.totalRequests || 0) + 1;
    if (success) {
      api.successfulRequests = (api.successfulRequests || 0) + 1;
    } else {
      api.failedRequests = (api.failedRequests || 0) + 1;
    }
    api.lastLatencyMs = latencyMs;
    api.lastAccessedAt = new Date().toISOString();
    this.saveData();
  }
}

// Singleton security store
export const securityStore = new SecurityStore();
