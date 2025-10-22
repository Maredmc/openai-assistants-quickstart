# 🔒 Security Documentation

## Overview

This project implements **enterprise-grade security** with multiple layers of protection against common web vulnerabilities, bot attacks, and data breaches.

## 🛡️ Security Features Implemented

### 1. **Secure Logging System** (`app/lib/secure-logger.ts`)

- ✅ **Automatic PII masking**: Emails, phones, IPs, tokens are automatically masked
- ✅ **Production-safe**: Debug logs disabled in production
- ✅ **Structured logging**: JSON format for easy parsing and monitoring
- ✅ **Performance tracking**: Built-in performance measurement

**Example:**
```typescript
import { secureLog } from '@/app/lib/secure-logger';

// ✅ SAFE: Email will be masked as "j***@g***.com"
secureLog.info('User registered', { email: 'john@gmail.com' });

// ✅ SAFE: No PII exposure
secureLog.event('purchase_completed', { amount: 100, hasEmail: true });
```

---

### 2. **Advanced Rate Limiting** (`app/lib/security.ts`)

- ✅ **IP-based limiting**: Tracks requests per IP
- ✅ **Auto-blacklisting**: IPs with 5+ violations are blacklisted for 1 hour
- ✅ **Configurable presets**: Strict, Normal, Generous
- ✅ **Distributed protection**: Each API has its own rate limiter

**Configuration:**
```typescript
RATE_LIMIT_CONFIGS = {
  strict: { limit: 5, windowMs: 15 * 60 * 1000 },   // 5 req / 15 min
  normal: { limit: 30, windowMs: 60 * 1000 },       // 30 req / 1 min
  generous: { limit: 100, windowMs: 60 * 1000 }     // 100 req / 1 min
}
```

**Protected endpoints:**
- `/api/contact` - Strict (5 requests / 15 min)
- `/api/products` - Generous (100 requests / min)
- `/api/sync` - Normal/Strict (admin operations)
- `/api/cart/checkout` - Normal (30 requests / min)
- `/api/shopify/track` - Generous (100 requests / min)

---

### 3. **Bot Detection & Honeypot**

#### Bot Detection (`detectBot()`)
- ✅ User-Agent validation
- ✅ Common headers check
- ✅ Bot pattern matching (curl, wget, scrapy, etc.)

#### Honeypot Field
- ✅ Hidden form field that humans can't see
- ✅ Bots auto-fill it, triggering silent rejection
- ✅ Returns fake success to avoid bot learning

**Implementation in Contact Form:**
```tsx
<input
  type="text"
  name="website"
  style={{ position: "absolute", left: "-9999px", opacity: 0 }}
  tabIndex={-1}
  autoComplete="off"
  aria-hidden="true"
/>
```

---

### 4. **Input Validation & Sanitization**

#### Email Validation (`isValidEmail()`)
- ✅ Format validation
- ✅ Length limits (local: 64, domain: 255)
- ✅ **Disposable email blocking**: Blocks tempmail.com, 10minutemail.com, etc.

#### Phone Validation (`isValidPhone()`)
- ✅ International format support
- ✅ Length validation (8-15 digits)

#### String Sanitization (`sanitizeString()`)
- ✅ Removes `<script>`, `<iframe>`, `<object>`, `<embed>` tags
- ✅ Strips event handlers (`onclick`, etc.)
- ✅ Removes `javascript:` protocol
- ✅ Length limiting

---

### 5. **Security Headers** (`middleware.ts`)

Automatically applies to all responses:

| Header | Purpose | Value |
|--------|---------|-------|
| `Content-Security-Policy` | Prevents XSS, injection attacks | Strict CSP rules |
| `X-Frame-Options` | Prevents clickjacking | `DENY` |
| `X-Content-Type-Options` | Prevents MIME sniffing | `nosniff` |
| `X-XSS-Protection` | Browser XSS filter | `1; mode=block` |
| `Referrer-Policy` | Controls referer information | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Disables unnecessary features | Blocks camera, microphone, geolocation |
| `Strict-Transport-Security` | Forces HTTPS (production) | `max-age=31536000` |

---

### 6. **Admin Authentication**

Protected endpoints require `ADMIN_API_TOKEN`:

```bash
# Generate secure token
openssl rand -hex 32

# Add to .env
ADMIN_API_TOKEN="your-generated-token-here"
```

**Protected endpoints:**
- `POST /api/sync/*` - All sync operations require admin auth

**Usage:**
```bash
curl -X POST https://your-domain.com/api/sync \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"sync-products"}'
```

---

### 7. **CSRF Protection**

- ✅ Token generation: `generateCSRFToken()`
- ✅ Token validation: `validateCSRFToken()`
- ✅ 1-hour expiration
- ⚠️ **Note**: Currently in-memory. For production with multiple instances, use Redis.

---

### 8. **Error Handling**

- ✅ **Generic error messages** in production (no internal details exposed)
- ✅ **Detailed errors** only in development
- ✅ **No stack traces** in production logs
- ✅ **Sanitized error responses**

**Example:**
```typescript
// ❌ BAD (exposes internals)
return { error: `Database error: ${err.message}` }

// ✅ GOOD (generic)
secureLog.error('Database error', err);
return { error: 'Internal server error' }
```

---

## 🚨 Security Checklist

### Before Production Deployment

- [ ] Set `NODE_ENV=production`
- [ ] Generate and set strong `ADMIN_API_TOKEN`
- [ ] Verify all API keys are in `.env` (not committed)
- [ ] Test rate limiting with load testing tool
- [ ] Verify security headers with [securityheaders.com](https://securityheaders.com)
- [ ] Test honeypot with automated form submission
- [ ] Review all logs to ensure no PII exposure
- [ ] Set up monitoring/alerting for security events
- [ ] Configure Redis for distributed rate limiting (multi-instance deployments)
- [ ] Enable HTTPS and configure HSTS
- [ ] Review and update CSP rules based on your needs

---

## 🔧 Configuration

### Environment Variables

```bash
# Required
NODE_ENV=production
OPENAI_API_KEY=sk-...
RESEND_API_KEY=re_...
SHOPIFY_STORE_DOMAIN=yourstore.myshopify.com
SHOPIFY_ADMIN_API_TOKEN=shpat_...
ADMIN_API_TOKEN=your-secure-token

# Optional
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Rate Limit Customization

Edit `app/lib/security.ts`:

```typescript
export const RATE_LIMIT_CONFIGS = {
  strict: { limit: 5, windowMs: 15 * 60 * 1000 },
  normal: { limit: 30, windowMs: 60 * 1000 },
  generous: { limit: 100, windowMs: 60 * 1000 },
  // Add custom configs
  custom: { limit: 50, windowMs: 5 * 60 * 1000 }
};
```

---

## 📊 Monitoring

### Key Metrics to Monitor

1. **Rate limit violations**: Track IPs with frequent violations
2. **Bot detections**: Monitor honeypot triggers and bot patterns
3. **Failed authentications**: Alert on multiple admin auth failures
4. **Error rates**: Track 4xx and 5xx responses
5. **API response times**: Detect performance issues

### Recommended Tools

- **Sentry**: Error tracking and monitoring
- **Vercel Analytics**: Built-in analytics
- **Uptime Robot**: Uptime monitoring
- **Cloudflare**: DDoS protection and WAF

---

## 🐛 Known Limitations

### 1. In-Memory Stores
**Issue**: Rate limiting and CSRF tokens are stored in memory.

**Impact**: Resets on server restart, doesn't work across multiple instances.

**Solution**: For production with multiple instances, use Redis:
```typescript
// Pseudo-code
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

// Replace Map with Redis
const bucket = await redis.get(key);
await redis.set(key, JSON.stringify(bucket), 'EX', windowMs / 1000);
```

### 2. No CAPTCHA
**Issue**: Honeypot and bot detection can be bypassed by sophisticated bots.

**Recommendation**: Add Cloudflare Turnstile or reCAPTCHA for critical forms:
```tsx
import { Turnstile } from '@marsidev/react-turnstile';

<Turnstile
  siteKey="your-site-key"
  onSuccess={(token) => setCaptchaToken(token)}
/>
```

---

## 🔐 Best Practices

### 1. Never Log PII
```typescript
// ❌ BAD
console.log('User email:', user.email);

// ✅ GOOD
secureLog.info('User action', { hasEmail: Boolean(user.email) });
```

### 2. Always Validate & Sanitize Input
```typescript
// ❌ BAD
const email = body.email;

// ✅ GOOD
const email = sanitizeString(body.email, 254);
if (!isValidEmail(email)) {
  return error('Invalid email');
}
```

### 3. Use Rate Limiting on All Public APIs
```typescript
// Add to every API route
const rateResult = applyRateLimit({
  headers: request.headers,
  store: rateLimitStore,
  ...RATE_LIMIT_CONFIGS.normal
});

if (rateResult.limited) {
  return NextResponse.json(
    { error: "Too many requests" },
    { status: 429, headers: { "Retry-After": String(rateResult.retryAfter) } }
  );
}
```

### 4. Sanitize All User Input
```typescript
// Even "safe" fields should be sanitized
const productId = sanitizeString(body.productId, 100);
const quantity = Math.max(1, Math.min(parseInt(body.quantity) || 1, 99));
```

---

## 📞 Security Incident Response

If you suspect a security breach:

1. **Immediate Actions**:
   - Review recent logs for suspicious activity
   - Check rate limit violations and blacklisted IPs
   - Verify no unauthorized admin access

2. **Investigation**:
   - Check `secureLog` events for anomalies
   - Review error logs for injection attempts
   - Inspect database for unauthorized changes

3. **Mitigation**:
   - Rotate `ADMIN_API_TOKEN` immediately
   - Temporarily increase rate limits strictness
   - Add suspicious IPs to permanent blacklist
   - Update security measures as needed

---

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
- [Shopify API Security](https://shopify.dev/docs/api/usage/authentication)
- [Content Security Policy Reference](https://content-security-policy.com/)

---

## ✅ Compliance

This security implementation helps meet requirements for:

- **GDPR**: PII protection and data minimization
- **PCI DSS**: Secure data transmission and logging
- **SOC 2**: Access controls and monitoring
- **ISO 27001**: Information security management

---

**Last Updated**: 2025-10-22
**Security Level**: Production-Ready ✅

For questions or to report security issues, contact: [your-security-email]
