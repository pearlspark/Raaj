import { RiskLevel, Severity } from './types';
import { securityStore } from './store';

export interface RiskEvaluationContext {
  ip: string;
  userAgent?: string;
  origin?: string;
  referer?: string;
  hasValidToken?: boolean;
  tokenError?: string;
  hasValidSignature?: boolean;
  signatureError?: string;
  isAuthorizedDomain?: boolean;
  domainError?: string;
  rateLimitViolated?: boolean;
  replayDetected?: boolean;
  isMissingHeaders?: boolean;
  method: string;
  endpoint: string;
}

export interface RiskEvaluationResult {
  score: number;
  level: RiskLevel;
  factors: string[];
  action: 'ALLOW' | 'MONITOR' | 'RESTRICT' | 'BLOCK';
  shouldBlock: boolean;
  blockReason?: string;
}

export function evaluateRisk(ctx: RiskEvaluationContext): RiskEvaluationResult {
  const settings = securityStore.getSettings();
  let score = 0;
  const factors: string[] = [];

  // 1. Replay Attempt (+50)
  if (ctx.replayDetected) {
    score += 50;
    factors.push('Replay Attack Attempt (+50)');
  }

  // 2. Unknown or Unauthorized Domain (+50)
  if (ctx.isAuthorizedDomain === false) {
    score += 50;
    factors.push(`Unauthorized Domain Access: ${ctx.domainError || 'Origin not whitelisted'} (+50)`);
  }

  // 3. Invalid Token (+30)
  if (ctx.tokenError) {
    score += 30;
    factors.push(`Invalid/Expired Token: ${ctx.tokenError} (+30)`);
  }

  // 4. Invalid HMAC Request Signature (+40)
  if (ctx.signatureError) {
    score += 40;
    factors.push(`Signature Verification Failure: ${ctx.signatureError} (+40)`);
  }

  // 5. Rate Limit Exceeded (+20)
  if (ctx.rateLimitViolated) {
    score += 20;
    factors.push('Rate Limit Threshold Exceeded (+20)');
  }

  // 6. Suspicious User-Agent (+15)
  const ua = (ctx.userAgent || '').toLowerCase();
  const botKeywords = [
    'curl',
    'python',
    'scrapy',
    'httpclient',
    'postmanruntime',
    'go-http-client',
    'libwww-perl',
    'nikto',
    'sqlmap',
    'masscan',
    'zgrab',
  ];
  if (!ua || ua.length < 5) {
    score += 15;
    factors.push('Missing or empty User-Agent header (+15)');
  } else if (botKeywords.some((k) => ua.includes(k))) {
    score += 15;
    factors.push(`Automated Bot User-Agent detected: "${ctx.userAgent}" (+15)`);
  }

  // 7. Missing standard headers when claiming to be a browser (+15)
  if (ctx.isMissingHeaders) {
    score += 15;
    factors.push('Missing standard browser handshake headers (+15)');
  }

  // Cap at 100
  score = Math.min(100, score);

  // Progressive Enforcement evaluation based on configured thresholds
  let level: RiskLevel = 'LOW';
  let action: 'ALLOW' | 'MONITOR' | 'RESTRICT' | 'BLOCK' = 'ALLOW';
  let shouldBlock = false;
  let blockReason: string | undefined;

  const { medium, high, critical } = settings.riskThresholds;

  if (score >= critical) {
    level = 'CRITICAL';
    action = 'BLOCK';
    shouldBlock = true;
    blockReason = ctx.isAuthorizedDomain === false
      ? 'Need APIs Contact on Telegram @sparkxflare'
      : `Security risk score (${score}) reached CRITICAL threshold. Request blocked.`;
  } else if (score >= high) {
    level = 'HIGH';
    action = 'RESTRICT';
    // If rate limit was violated or domain was unauthorized, block
    if (ctx.rateLimitViolated || ctx.isAuthorizedDomain === false) {
      shouldBlock = true;
      blockReason = ctx.isAuthorizedDomain === false
        ? 'Need APIs Contact on Telegram @sparkxflare'
        : `High-risk request (${score}): ${factors.join(', ')}`;
    }
  } else if (score >= medium) {
    level = 'MEDIUM';
    action = 'MONITOR';
    if (ctx.isAuthorizedDomain === false) {
      shouldBlock = true;
      blockReason = 'Need APIs Contact on Telegram @sparkxflare';
    }
  } else {
    level = 'LOW';
    action = 'ALLOW';
    // Even at low risk score, if domain is unauthorized, it must not pass
    if (ctx.isAuthorizedDomain === false) {
      shouldBlock = true;
      blockReason = 'Need APIs Contact on Telegram @sparkxflare';
    }
  }

  return {
    score,
    level,
    factors,
    action,
    shouldBlock,
    blockReason,
  };
}
