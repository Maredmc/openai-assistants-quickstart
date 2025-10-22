/**
 * 🔒 Security Module - Protezione avanzata per tutte le API
 *
 * Features:
 * - Rate limiting globale
 * - Validazione input avanzata
 * - Honeypot detection
 * - CSRF protection
 * - Admin authentication
 * - Bot detection
 */

import { secureLog } from './secure-logger';
import crypto from 'crypto';

type RateLimitBucket = {
  count: number;
  firstHit: number;
  violations: number; // Track numero violazioni
};

export type RateLimitStore = Map<string, RateLimitBucket>;

// Cache per token CSRF (in produzione usare Redis)
const csrfTokenStore = new Map<string, { token: string; expiresAt: number }>();

// Blacklist IP temporanea (in produzione usare Redis)
const ipBlacklist = new Map<string, number>();

const ADMIN_TOKEN = process.env.ADMIN_API_TOKEN;
const BEARER_PREFIX = "Bearer ";

// Configurazione rate limiting
export const RATE_LIMIT_CONFIGS = {
  strict: { limit: 5, windowMs: 15 * 60 * 1000 }, // 5 richieste / 15 min
  normal: { limit: 30, windowMs: 60 * 1000 }, // 30 richieste / 1 min
  generous: { limit: 100, windowMs: 60 * 1000 }, // 100 richieste / 1 min
};

/**
 * 🔍 Ottieni identificatore client (IP)
 */
export function getClientIdentifier(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const client = forwardedFor.split(",")[0]?.trim();
    if (client) {
      return client;
    }
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  return "unknown";
}

/**
 * 🚫 Verifica se un IP è in blacklist
 */
export function isBlacklisted(headers: Headers): boolean {
  const ip = getClientIdentifier(headers);
  const blacklistedUntil = ipBlacklist.get(ip);

  if (blacklistedUntil && Date.now() < blacklistedUntil) {
    secureLog.warn('Blacklisted IP attempted access', { ip: ip.substring(0, 8) + '***' });
    return true;
  }

  // Cleanup expired entries
  if (blacklistedUntil && Date.now() >= blacklistedUntil) {
    ipBlacklist.delete(ip);
  }

  return false;
}

/**
 * 🛡️ Aggiungi IP a blacklist temporanea (1 ora)
 */
function blacklistIP(ip: string) {
  const blacklistDuration = 60 * 60 * 1000; // 1 ora
  ipBlacklist.set(ip, Date.now() + blacklistDuration);
  secureLog.warn('IP blacklisted', { ip: ip.substring(0, 8) + '***', duration: '1h' });
}

/**
 * 🚦 Rate limiting avanzato con auto-blacklist
 */
export function applyRateLimit(params: {
  headers: Headers;
  store: RateLimitStore;
  limit: number;
  windowMs: number;
}): { limited: boolean; retryAfter: number } {
  // Check blacklist prima
  if (isBlacklisted(params.headers)) {
    return { limited: true, retryAfter: 3600 };
  }

  const key = getClientIdentifier(params.headers);
  const now = Date.now();
  const bucket = params.store.get(key);

  if (!bucket || now - bucket.firstHit > params.windowMs) {
    params.store.set(key, { count: 1, firstHit: now, violations: 0 });
    return { limited: false, retryAfter: 0 };
  }

  if (bucket.count >= params.limit) {
    bucket.violations += 1;

    // Se supera 5 violazioni, blacklist
    if (bucket.violations >= 5) {
      blacklistIP(key);
    }

    const retryAfter = Math.ceil((bucket.firstHit + params.windowMs - now) / 1000);
    secureLog.warn('Rate limit exceeded', {
      ip: key.substring(0, 8) + '***',
      violations: bucket.violations
    });

    return { limited: true, retryAfter: retryAfter > 0 ? retryAfter : 1 };
  }

  bucket.count += 1;
  return { limited: false, retryAfter: 0 };
}

/**
 * 🔐 Autenticazione admin
 */
export function requireAdminAuth(request: Request): Response | null {
  if (!ADMIN_TOKEN) {
    secureLog.error("ADMIN_API_TOKEN not configured");
    return new Response(
      JSON.stringify({ success: false, error: "Service temporarily unavailable" }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const headerToken = request.headers.get("x-admin-token")?.trim();
  const authorization = request.headers.get("authorization");
  const bearerToken =
    authorization && authorization.startsWith(BEARER_PREFIX)
      ? authorization.slice(BEARER_PREFIX.length).trim()
      : null;

  const token = bearerToken || headerToken;

  if (!token || token !== ADMIN_TOKEN) {
    secureLog.warn('Unauthorized admin access attempt');
    return new Response(
      JSON.stringify({ success: false, error: "Unauthorized" }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "WWW-Authenticate": "Bearer",
        },
      }
    );
  }

  return null;
}

/**
 * ✅ Validazione email
 */
export function isValidEmail(email: string): boolean {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    return false;
  }

  // Controlla lunghezza parti
  const [local, domain] = email.split('@');
  if (local.length > 64 || domain.length > 255) {
    return false;
  }

  // Blocca email temporanee comuni (anti-spam)
  const disposableDomains = [
    'tempmail.com', 'throwaway.email', '10minutemail.com',
    'guerrillamail.com', 'mailinator.com', 'trashmail.com'
  ];

  const emailDomain = domain.toLowerCase();
  if (disposableDomains.some(d => emailDomain.includes(d))) {
    secureLog.warn('Disposable email detected', { domain: emailDomain });
    return false;
  }

  return true;
}

/**
 * ✅ Validazione telefono (formato internazionale)
 */
export function isValidPhone(phone: string): boolean {
  // Rimuovi spazi, trattini, parentesi
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');

  // Deve essere tra 8 e 15 cifre, può iniziare con +
  const phonePattern = /^\+?\d{8,15}$/;

  return phonePattern.test(cleaned);
}

/**
 * 🧹 Sanitizza stringa (rimuove HTML, script, XSS)
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  if (typeof input !== 'string') {
    return '';
  }

  let sanitized = input
    .trim()
    .slice(0, maxLength)
    // Rimuovi tag HTML
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*>/gi, '')
    // Rimuovi event handlers
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]*/gi, '')
    // Rimuovi javascript: protocol
    .replace(/javascript:/gi, '');

  return sanitized;
}

/**
 * 🍯 Verifica honeypot (campo nascosto che i bot riempiono)
 */
export function isHoneypotFilled(honeypotValue: any): boolean {
  // Se il campo honeypot è compilato, è un bot
  if (honeypotValue && String(honeypotValue).trim().length > 0) {
    secureLog.warn('Honeypot triggered - bot detected');
    return true;
  }

  return false;
}

/**
 * 🤖 Bot detection basica
 */
export function detectBot(headers: Headers): { isBot: boolean; reason?: string } {
  const userAgent = headers.get('user-agent')?.toLowerCase() || '';

  // Lista bot comuni
  const botPatterns = [
    'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget',
    'python-requests', 'scrapy', 'axios', 'postman'
  ];

  for (const pattern of botPatterns) {
    if (userAgent.includes(pattern)) {
      return { isBot: true, reason: `Bot detected: ${pattern}` };
    }
  }

  // User agent vuoto o troppo corto
  if (userAgent.length < 10) {
    return { isBot: true, reason: 'Suspicious user agent' };
  }

  // Mancano headers comuni
  const acceptHeader = headers.get('accept');
  const acceptLanguage = headers.get('accept-language');

  if (!acceptHeader || !acceptLanguage) {
    return { isBot: true, reason: 'Missing common headers' };
  }

  return { isBot: false };
}

/**
 * 🔑 Genera token CSRF
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * ✅ Valida token CSRF
 */
export function validateCSRFToken(token: string, sessionId: string): boolean {
  const stored = csrfTokenStore.get(sessionId);

  if (!stored) {
    return false;
  }

  if (Date.now() > stored.expiresAt) {
    csrfTokenStore.delete(sessionId);
    return false;
  }

  return stored.token === token;
}

/**
 * 💾 Salva token CSRF
 */
export function storeCSRFToken(sessionId: string, token: string) {
  const expiresAt = Date.now() + (60 * 60 * 1000); // 1 ora
  csrfTokenStore.set(sessionId, { token, expiresAt });
}

/**
 * 🧪 Valida payload JSON generico
 */
export function validateJSONPayload(
  payload: any,
  schema: Record<string, { type: string; required?: boolean; maxLength?: number }>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const [field, rules] of Object.entries(schema)) {
    const value = payload[field];

    // Required check
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`Field '${field}' is required`);
      continue;
    }

    if (value === undefined || value === null) {
      continue; // Campo opzionale non fornito
    }

    // Type check
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== rules.type) {
      errors.push(`Field '${field}' must be of type ${rules.type}`);
      continue;
    }

    // MaxLength check per stringhe
    if (rules.type === 'string' && rules.maxLength && value.length > rules.maxLength) {
      errors.push(`Field '${field}' exceeds maximum length of ${rules.maxLength}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 🧹 Cleanup periodico delle cache (chiamare in background)
 */
export function cleanupSecurityCaches() {
  const now = Date.now();

  // Cleanup CSRF tokens scaduti
  Array.from(csrfTokenStore.entries()).forEach(([sessionId, data]) => {
    if (now > data.expiresAt) {
      csrfTokenStore.delete(sessionId);
    }
  });

  // Cleanup blacklist scaduti
  Array.from(ipBlacklist.entries()).forEach(([ip, expiresAt]) => {
    if (now >= expiresAt) {
      ipBlacklist.delete(ip);
    }
  });

  secureLog.debug('Security caches cleaned');
}
