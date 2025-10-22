/**
 * 🔒 Secure Logger - Sistema di logging sicuro senza esposizione di PII
 *
 * IMPORTANTE: Questo logger maschera automaticamente dati sensibili
 * per prevenire esposizione di informazioni personali nei log.
 *
 * Utilizzo:
 * - import { secureLog } from '@/app/lib/secure-logger';
 * - secureLog.info('message', { data });
 */

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

// Pattern per identificare dati sensibili
const EMAIL_PATTERN = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
const PHONE_PATTERN = /(\+?\d{1,4}[\s.-]?)?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{1,9}/g;
const IP_PATTERN = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const TOKEN_PATTERN = /(sk|pk|shpat|re)_[a-zA-Z0-9_-]{20,}/gi;

/**
 * Maschera dati sensibili in una stringa
 */
function maskSensitiveData(data: any): any {
  if (typeof data === 'string') {
    return data
      .replace(EMAIL_PATTERN, (match) => maskEmail(match))
      .replace(PHONE_PATTERN, '***-***-****')
      .replace(IP_PATTERN, '***.***.***.***')
      .replace(TOKEN_PATTERN, (match) => match.substring(0, 8) + '***');
  }

  if (Array.isArray(data)) {
    return data.map(item => maskSensitiveData(item));
  }

  if (data && typeof data === 'object') {
    const masked: any = {};
    for (const [key, value] of Object.entries(data)) {
      // Maschera completamente certi campi sensibili
      if (isSensitiveField(key)) {
        masked[key] = maskField(key, value);
      } else {
        masked[key] = maskSensitiveData(value);
      }
    }
    return masked;
  }

  return data;
}

/**
 * Identifica se un campo è sensibile
 */
function isSensitiveField(fieldName: string): boolean {
  const sensitiveFields = [
    'email', 'phone', 'password', 'token', 'api_key', 'secret',
    'credit_card', 'ssn', 'tax_id', 'ip', 'ip_address',
    'firstName', 'lastName', 'first_name', 'last_name',
    'address', 'street', 'city', 'zipcode', 'postal_code'
  ];

  const lowerField = fieldName.toLowerCase();
  return sensitiveFields.some(field => lowerField.includes(field));
}

/**
 * Maschera il valore di un campo sensibile
 */
function maskField(fieldName: string, value: any): string {
  if (!value) return '[REDACTED]';

  const str = String(value);
  const lowerField = fieldName.toLowerCase();

  if (lowerField.includes('email')) {
    return maskEmail(str);
  }

  if (lowerField.includes('phone')) {
    return `***${str.slice(-3)}`;
  }

  if (lowerField.includes('name')) {
    return str.charAt(0) + '***';
  }

  return '[REDACTED]';
}

/**
 * Maschera un indirizzo email
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***@***.***';

  const maskedLocal = local.length <= 2
    ? '***'
    : local.charAt(0) + '***' + local.charAt(local.length - 1);

  const [domainName, tld] = domain.split('.');
  const maskedDomain = domainName.length <= 2
    ? '***'
    : domainName.charAt(0) + '***';

  return `${maskedLocal}@${maskedDomain}.${tld || '***'}`;
}

/**
 * Formatta timestamp per i log
 */
function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Crea un ID di richiesta univoco
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Logger sicuro
 */
class SecureLogger {
  private requestId: string | null = null;

  setRequestId(id: string) {
    this.requestId = id;
  }

  clearRequestId() {
    this.requestId = null;
  }

  private log(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', message: string, data?: any) {
    // In produzione, non logghiamo DEBUG
    if (IS_PRODUCTION && level === 'DEBUG') {
      return;
    }

    const timestamp = getTimestamp();
    const reqId = this.requestId || generateRequestId();

    let logData: any = {
      timestamp,
      level,
      requestId: reqId,
      message
    };

    // Maschera i dati sensibili
    if (data) {
      logData.data = IS_PRODUCTION ? maskSensitiveData(data) : data;
    }

    // In development, log formattato
    if (IS_DEVELOPMENT) {
      const prefix = this.getPrefix(level);
      console.log(`${prefix} [${timestamp}] [${reqId}] ${message}`);
      if (data) {
        console.log('  Data:', logData.data);
      }
    } else {
      // In production, log JSON strutturato
      console.log(JSON.stringify(logData));
    }
  }

  private getPrefix(level: string): string {
    switch (level) {
      case 'INFO': return '✅';
      case 'WARN': return '⚠️';
      case 'ERROR': return '❌';
      case 'DEBUG': return '🔍';
      default: return '📝';
    }
  }

  info(message: string, data?: any) {
    this.log('INFO', message, data);
  }

  warn(message: string, data?: any) {
    this.log('WARN', message, data);
  }

  error(message: string, error?: any) {
    const errorData: any = {};

    if (error instanceof Error) {
      errorData.error = {
        name: error.name,
        message: error.message,
        // Stack trace solo in development
        ...(IS_DEVELOPMENT && { stack: error.stack })
      };
    } else if (error) {
      errorData.error = maskSensitiveData(error);
    }

    this.log('ERROR', message, errorData);
  }

  debug(message: string, data?: any) {
    this.log('DEBUG', message, data);
  }

  /**
   * Log di eventi business (analytics safe)
   */
  event(eventName: string, metadata?: Record<string, any>) {
    const safeMetadata = metadata ? maskSensitiveData(metadata) : {};

    this.log('INFO', `Event: ${eventName}`, {
      event: eventName,
      metadata: safeMetadata
    });
  }

  /**
   * Log API call (maschera automaticamente dati sensibili)
   */
  apiCall(method: string, endpoint: string, statusCode?: number, duration?: number) {
    this.log('INFO', 'API Call', {
      method,
      endpoint: this.sanitizeEndpoint(endpoint),
      statusCode,
      duration: duration ? `${duration}ms` : undefined
    });
  }

  /**
   * Rimuove parametri sensibili dagli URL
   */
  private sanitizeEndpoint(endpoint: string): string {
    try {
      const url = new URL(endpoint, 'http://dummy');

      // Rimuovi parametri sensibili
      const sensitiveParams = ['token', 'key', 'secret', 'password', 'email'];
      sensitiveParams.forEach(param => {
        if (url.searchParams.has(param)) {
          url.searchParams.set(param, '***');
        }
      });

      return url.pathname + (url.search || '');
    } catch {
      return endpoint.split('?')[0]; // Fallback: rimuovi tutti i query params
    }
  }

  /**
   * Log specifico per operazioni Shopify
   */
  shopify(operation: string, success: boolean, metadata?: Record<string, any>) {
    this.log(success ? 'INFO' : 'WARN', `Shopify: ${operation}`, {
      operation,
      success,
      // Non loggare MAI customer data
      metadata: metadata ? {
        hasEmail: Boolean(metadata.email),
        hasPhone: Boolean(metadata.phone),
        customerId: metadata.customerId,
        action: metadata.action
      } : undefined
    });
  }
}

// Export singleton
export const secureLog = new SecureLogger();

/**
 * Middleware helper per generare request ID
 */
export function withRequestId<T extends (...args: any[]) => any>(
  handler: T
): T {
  return (async (...args: any[]) => {
    const requestId = generateRequestId();
    secureLog.setRequestId(requestId);

    try {
      return await handler(...args);
    } finally {
      secureLog.clearRequestId();
    }
  }) as T;
}

/**
 * Helper per misurare performance
 */
export function measurePerformance() {
  const start = Date.now();

  return {
    end: (operation: string) => {
      const duration = Date.now() - start;
      secureLog.debug(`Performance: ${operation}`, { duration: `${duration}ms` });
      return duration;
    }
  };
}
