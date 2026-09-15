import fs from 'fs';
import path from 'path';
import {
  DomainRecord,
  ApiClientRecord,
  RequestLog,
  SecurityEvent,
  BlockedIP,
  AdminAuditLog,
  SystemSettings,
  Severity,
} from './types';
import { generateClientCredentials, hashAdminPassword, hashSecret } from './crypto';
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

      const [remoteDomains, remoteClients, remoteSettings, remoteBlockedIps] = await Promise.all([
        db.collection('authorized_domains').find({}).toArray().catch(() => []),
        db.collection('api_clients').find({}).toArray().catch(() => []),
        db.collection('system_settings').findOne({ _id: 'global_settings' as any }).catch(() => null),
        db.collection('blocked_ips').find({}).toArray().catch(() => []),
      ]);

      let changed = false;
      if (remoteDomains && remoteDomains.length > 0) {
        for (const rd of remoteDomains) {
          const { _id, ...domData } = rd as any;
          const existingIdx = this.data.domains.findIndex((d) => d.id === domData.id);
          if (existingIdx >= 0) {
            this.data.domains[existingIdx] = { ...this.data.domains[existingIdx], ...domData };
          } else {
            this.data.domains.push(domData as DomainRecord);
          }
        }
        changed = true;
      }

      if (remoteClients && remoteClients.length > 0) {
        for (const rc of remoteClients) {
          const { _id, ...clientData } = rc as any;
          const existingIdx = this.data.clients.findIndex((c) => c.clientId === clientData.clientId);
          if (existingIdx >= 0) {
            this.data.clients[existingIdx] = { ...this.data.clients[existingIdx], ...clientData };
          } else {
            this.data.clients.push(clientData as ApiClientRecord);
          }
        }
        changed = true;
      }

      if (remoteSettings) {
        const { _id, ...settingsData } = remoteSettings as any;
        this.data.settings = { ...this.data.settings, ...settingsData };
        changed = true;
      }

      if (remoteBlockedIps && remoteBlockedIps.length > 0) {
        for (const rb of remoteBlockedIps) {
          const { _id, ...ipData } = rb as any;
          if (!this.data.blockedIps.some((b) => b.ip === ipData.ip)) {
            this.data.blockedIps.push(ipData as BlockedIP);
          }
        }
        changed = true;
      }

      if (changed) {
        try {
          fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
        } catch {
          // ignore
        }
      } else {
        // First-time database population
        await this.syncToMongo();
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

  private asyncMongoSync(): void {
    if (this.mongoSyncTimeout) return;
    this.mongoSyncTimeout = setTimeout(async () => {
      this.mongoSyncTimeout = null;
      await this.syncToMongo().catch(() => {});
    }, 1500);
  }

  private loadData(): StoreData {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          ...parsed,
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
        };
      }
    } catch (err) {
      console.warn('Could not read persistent store, initializing seed data:', err);
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
    this.asyncMongoSync();
  }

  private createSeedData(): StoreData {
    const defaultPassword = 'Admin@Shield2026!';
    const { hash, salt } = hashAdminPassword(defaultPassword);

    const now = new Date();
    const nowIso = now.toISOString();

    // Generate seed authorized domain: example.com
    const exampleCreds = generateClientCredentials();
    const exampleDomain: DomainRecord = {
      id: 'dom_example_001',
      domain: 'https://example.com',
      normalizedDomain: 'example.com',
      mode: 'SUBDOMAIN',
      status: 'ACTIVE',
      clientId: exampleCreds.clientId,
      clientSecretHash: exampleCreds.secretHash,
      clientSecretPrefix: exampleCreds.secretPrefix,
      rateLimitPerMin: 1000,
      totalRequests: 87431,
      successfulRequests: 86910,
      failedRequests: 521,
      rateLimitViolations: 12,
      lastIp: '103.14.88.22',
      uniqueIps: ['103.14.88.22', '49.36.120.5', '152.58.33.10'],
      uniqueUserAgents: ['Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4)'],
      lastEndpoint: '/api/video-url',
      lastActiveAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
      updatedAt: nowIso,
    };

    // Generate seed local/current domain for live app preview
    const localCreds = generateClientCredentials();
    const localDomain: DomainRecord = {
      id: 'dom_local_002',
      domain: 'http://localhost:3000',
      normalizedDomain: 'localhost',
      mode: 'EXACT',
      status: 'ACTIVE',
      clientId: localCreds.clientId,
      clientSecretHash: localCreds.secretHash,
      clientSecretPrefix: localCreds.secretPrefix,
      rateLimitPerMin: 500,
      totalRequests: 3410,
      successfulRequests: 3380,
      failedRequests: 30,
      rateLimitViolations: 1,
      lastIp: '127.0.0.1',
      uniqueIps: ['127.0.0.1'],
      uniqueUserAgents: ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'],
      lastEndpoint: '/api/batches',
      lastActiveAt: nowIso,
      createdAt: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
      updatedAt: nowIso,
    };

    // Blocked domain example
    const badCreds = generateClientCredentials();
    const blockedDomain: DomainRecord = {
      id: 'dom_pirate_003',
      domain: 'https://pirate-streams.net',
      normalizedDomain: 'pirate-streams.net',
      mode: 'SUBDOMAIN',
      status: 'BLOCKED',
      clientId: badCreds.clientId,
      clientSecretHash: badCreds.secretHash,
      clientSecretPrefix: badCreds.secretPrefix,
      rateLimitPerMin: 100,
      totalRequests: 1420,
      successfulRequests: 40,
      failedRequests: 1380,
      rateLimitViolations: 85,
      lastIp: '185.220.101.5',
      uniqueIps: ['185.220.101.5', '185.220.101.6'],
      uniqueUserAgents: ['Python-urllib/3.10', 'curl/8.1.2'],
      lastEndpoint: '/api/video-url',
      lastActiveAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
      updatedAt: nowIso,
    };

    const clients: ApiClientRecord[] = [
      {
        clientId: exampleCreds.clientId,
        name: 'Example Production Web Portal',
        domainId: exampleDomain.id,
        domainName: exampleDomain.domain,
        status: 'ACTIVE',
        permissions: ['read:batches', 'read:schedule', 'read:video', 'read:khazana'],
        createdAt: exampleDomain.createdAt,
        lastUsedAt: exampleDomain.lastActiveAt,
      },
      {
        clientId: localCreds.clientId,
        name: 'Local Dev / AI Studio Preview',
        domainId: localDomain.id,
        domainName: localDomain.domain,
        status: 'ACTIVE',
        permissions: ['*'],
        createdAt: localDomain.createdAt,
        lastUsedAt: localDomain.lastActiveAt,
      },
      {
        clientId: badCreds.clientId,
        name: 'Revoked Scraper Client',
        domainId: blockedDomain.id,
        domainName: blockedDomain.domain,
        status: 'REVOKED',
        permissions: ['read:video'],
        createdAt: blockedDomain.createdAt,
        lastUsedAt: blockedDomain.lastActiveAt,
      },
    ];

    // Seed realistic recent request logs
    const endpoints = [
      '/api/batches',
      '/api/batch-details',
      '/api/video-url',
      '/api/todays-schedule',
      '/api/contents',
      '/api/slides',
      '/api/health',
    ];
    const cities = [
      { city: 'Mumbai', country: 'India', region: 'Maharashtra', ip: '103.14.88.22' },
      { city: 'Delhi', country: 'India', region: 'Delhi', ip: '49.36.120.5' },
      { city: 'Bengaluru', country: 'India', region: 'Karnataka', ip: '152.58.33.10' },
      { city: 'Frankfurt', country: 'Germany', region: 'Hesse', ip: '185.220.101.5' },
      { city: 'Singapore', country: 'Singapore', region: 'Singapore', ip: '13.250.44.11' },
      { city: 'Ashburn', country: 'United States', region: 'Virginia', ip: '54.210.12.98' },
    ];

    const requestLogs: RequestLog[] = [];
    for (let i = 0; i < 40; i++) {
      const pastTime = new Date(Date.now() - i * 45 * 1000).toISOString();
      const loc = cities[i % cities.length];
      const isBad = loc.ip === '185.220.101.5';
      const ep = endpoints[i % endpoints.length];
      const statusCode = isBad ? (i % 2 === 0 ? 403 : 429) : 200;
      const riskScore = isBad ? 85 : Math.floor(Math.random() * 20);

      requestLogs.push({
        id: `log_${i + 1}`,
        requestId: `req_live_${1000 + i}`,
        timestamp: pastTime,
        ip: loc.ip,
        country: loc.country,
        region: loc.region,
        city: loc.city,
        userAgent: isBad
          ? 'Python-requests/2.31.0'
          : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
        origin: isBad ? 'https://pirate-streams.net' : 'https://example.com',
        referer: isBad ? 'https://pirate-streams.net/watch' : 'https://example.com/learn',
        clientId: isBad ? badCreds.clientId : exampleCreds.clientId,
        domain: isBad ? 'pirate-streams.net' : 'example.com',
        endpoint: ep,
        method: 'GET',
        statusCode,
        responseTimeMs: Math.floor(Math.random() * 120) + 30,
        responseSizeBytes: statusCode === 200 ? 1420 + i * 50 : 210,
        riskScore,
        riskFactors: isBad ? ['Unauthorized Domain', 'Blocked Client', 'Suspicious Bot User-Agent'] : [],
        blocked: isBad,
        blockReason: isBad ? 'Domain is permanently blocked by administrator' : undefined,
      });
    }

    const securityEvents: SecurityEvent[] = [
      {
        id: 'sec_evt_001',
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        severity: 'CRITICAL',
        type: 'UNAUTHORIZED_DOMAIN_ACCESS',
        clientId: badCreds.clientId,
        domain: 'pirate-streams.net',
        ip: '185.220.101.5',
        endpoint: '/api/video-url',
        reason: 'Client attempted video extraction from blocked unauthorized domain',
        actionTaken: 'Request rejected with 403 Forbidden. IP added to high-risk watchlist.',
        requestId: 'req_live_1012',
      },
      {
        id: 'sec_evt_002',
        timestamp: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
        severity: 'HIGH',
        type: 'RATE_LIMIT_EXCEEDED',
        clientId: exampleCreds.clientId,
        domain: 'example.com',
        ip: '49.36.120.5',
        endpoint: '/api/video-url',
        reason: 'Client exceeded 20 requests/minute video endpoint threshold',
        actionTaken: 'HTTP 429 Too Many Requests with Retry-After: 35s header',
        requestId: 'req_live_1025',
      },
      {
        id: 'sec_evt_003',
        timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
        severity: 'WARN',
        type: 'EXPIRED_TOKEN_SUBMISSION',
        clientId: exampleCreds.clientId,
        domain: 'example.com',
        ip: '103.14.88.22',
        endpoint: '/api/todays-schedule',
        reason: 'Authorization header presented expired signed token (clock delta > 900s)',
        actionTaken: 'HTTP 401 Unauthorized with token refresh challenge',
        requestId: 'req_live_1038',
      },
    ];

    const blockedIps: BlockedIP[] = [
      {
        ip: '185.220.101.5',
        reason: 'Automated video URL scraping and crawler enumeration',
        blockedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        isPermanent: true,
        blockedBy: 'system_risk_engine',
      },
      {
        ip: '194.26.29.112',
        reason: 'Repeated 403 authorization failures (14 attempts in 1 minute)',
        blockedAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
        isPermanent: false,
        blockedBy: 'admin',
      },
    ];

    const auditLogs: AdminAuditLog[] = [
      {
        id: 'aud_001',
        timestamp: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
        admin: 'admin',
        action: 'DOMAIN_ADDED',
        target: 'https://example.com',
        ip: '127.0.0.1',
        details: 'Added authorized domain in SUBDOMAIN mode with limit 1000 req/min',
        result: 'SUCCESS',
      },
      {
        id: 'aud_002',
        timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        admin: 'system',
        action: 'IP_BLOCKED',
        target: '185.220.101.5',
        ip: '127.0.0.1',
        details: 'Automatic block triggered by CRITICAL risk score >= 80',
        result: 'SUCCESS',
      },
      {
        id: 'aud_003',
        timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
        admin: 'admin',
        action: 'DOMAIN_BLOCKED',
        target: 'https://pirate-streams.net',
        ip: '127.0.0.1',
        details: 'Manually blocked malicious clone domain',
        result: 'SUCCESS',
      },
    ];

    const adminUsers = [
      {
        id: 'usr_admin_001',
        username: 'admin',
        passwordHash: hash,
        passwordSalt: salt,
        role: 'SUPER_ADMIN',
        createdAt: nowIso,
        lastLoginAt: nowIso,
      },
    ];

    const seeded: StoreData = {
      domains: [exampleDomain, localDomain, blockedDomain],
      clients,
      requestLogs,
      securityEvents,
      blockedIps,
      auditLogs,
      settings: DEFAULT_SETTINGS,
      adminUsers,
    };

    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(seeded, null, 2), 'utf-8');
    } catch {
      // ignore
    }

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

    return { domainRecord: record, rawSecret: creds.rawSecret };
  }

  public updateDomain(id: string, updates: Partial<DomainRecord>): DomainRecord {
    const idx = this.data.domains.findIndex((d) => d.id === id);
    if (idx === -1) throw new Error('Domain not found: ' + id);

    this.data.domains[idx] = {
      ...this.data.domains[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveData();
    return this.data.domains[idx];
  }

  public rotateClientSecret(domainId: string): { newRawSecret: string; domainRecord: DomainRecord } {
    const domain = this.getDomainById(domainId);
    if (!domain) throw new Error('Domain not found: ' + domainId);

    const creds = generateClientCredentials();
    domain.clientId = creds.clientId;
    domain.clientSecretHash = creds.secretHash;
    domain.clientSecretPrefix = creds.secretPrefix;
    domain.updatedAt = new Date().toISOString();

    // Update associated client
    const client = this.data.clients.find((c) => c.domainId === domainId);
    if (client) {
      client.clientId = creds.clientId;
      client.status = 'ACTIVE';
    }

    this.saveData();
    return { newRawSecret: creds.rawSecret, domainRecord: domain };
  }

  public deleteDomain(id: string): void {
    const idx = this.data.domains.findIndex((d) => d.id === id);
    if (idx === -1) throw new Error('Domain not found');

    const domain = this.data.domains[idx];
    this.data.domains.splice(idx, 1);
    this.data.clients = this.data.clients.filter((c) => c.domainId !== id);
    this.saveData();
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
    return this.data.settings;
  }

  // --- ADMIN USERS ---
  public getAdminByUsername(username: string) {
    return this.data.adminUsers.find((u) => u.username.toLowerCase() === username.toLowerCase());
  }

  public updateAdminLastLogin(username: string) {
    const u = this.getAdminByUsername(username);
    if (u) {
      u.lastLoginAt = new Date().toISOString();
      this.saveData();
    }
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
}

// Singleton security store
export const securityStore = new SecurityStore();
