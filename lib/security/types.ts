export type DomainMode = 'EXACT' | 'SUBDOMAIN';
export type DomainStatus = 'ACTIVE' | 'DISABLED' | 'BLOCKED';
export type ClientStatus = 'ACTIVE' | 'REVOKED';
export type Severity = 'INFO' | 'WARN' | 'HIGH' | 'CRITICAL';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface DomainRecord {
  id: string;
  domain: string; // e.g. "https://example.com"
  normalizedDomain: string; // e.g. "example.com"
  mode: DomainMode; // EXACT vs SUBDOMAIN
  status: DomainStatus;
  clientId: string;
  clientSecretHash: string;
  clientSecretPrefix: string; // e.g. "sec_abc...****"
  rateLimitPerMin: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitViolations: number;
  lastIp: string;
  uniqueIps: string[];
  uniqueUserAgents: string[];
  lastEndpoint: string;
  lastActiveAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiClientRecord {
  clientId: string;
  name: string;
  domainId: string;
  domainName: string;
  status: ClientStatus;
  permissions: string[];
  createdAt: string;
  lastUsedAt?: string;
}

export interface RequestLog {
  id: string;
  requestId: string;
  timestamp: string;
  ip: string;
  country: string;
  region: string;
  city: string;
  userAgent: string;
  origin: string;
  referer: string;
  clientId: string;
  domain: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs: number;
  responseSizeBytes: number;
  riskScore: number;
  riskFactors: string[];
  blocked: boolean;
  blockReason?: string;
}

export interface SecurityEvent {
  id: string;
  timestamp: string;
  severity: Severity;
  type: string;
  clientId?: string;
  domain?: string;
  ip: string;
  endpoint: string;
  reason: string;
  actionTaken: string;
  requestId?: string;
}

export interface BlockedIP {
  ip: string;
  reason: string;
  blockedAt: string;
  expiresAt?: string;
  isPermanent: boolean;
  blockedBy: string;
}

export interface AdminAuditLog {
  id: string;
  timestamp: string;
  admin: string;
  action: string;
  target: string;
  ip: string;
  details?: string;
  result: 'SUCCESS' | 'FAILURE';
}

export interface SystemSettings {
  riskThresholds: {
    medium: number; // default 30
    high: number; // default 60
    critical: number; // default 80
  };
  rateLimits: {
    defaultDomainPerMin: number;
    defaultIpPerMin: number;
    videoEndpointPerMin: number;
    authEndpointPerMin: number;
  };
  defaultRateLimits?: {
    perIp: number;
    perDomain: number;
    perClient: number;
    sensitiveEndpoint: number;
  };
  autoBlockAbusiveIps?: boolean;
  retentionDays: number;
  enableAutoBlock: boolean;
  autoBlockDurationMinutes: number;
  clockSkewSeconds: number;
  upstreamBaseUrl: string;
  allowLocalhostTesting: boolean;
}

export interface TokenPayload {
  jti: string;
  sub: string; // clientId
  domain: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
  permissions: string[];
}

export type AuthorizedDomain = DomainRecord;
export type ApiClient = ApiClientRecord;
export type BlockedIpRecord = BlockedIP;
export type SecuritySettings = SystemSettings;
