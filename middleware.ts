/**
 * 🔒 Next.js Middleware - Security Headers & Protection
 *
 * Questo middleware viene eseguito su TUTTE le richieste
 * e aggiunge header di sicurezza critici.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // 🛡️ Security Headers
  const headers = response.headers;

  // Content Security Policy (CSP)
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://va.vercel-scripts.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.openai.com https://*.myshopify.com https://resend.com https://vercel.live https://va.vercel-scripts.com",
    "frame-ancestors 'self' https://*.myshopify.com https://*", // Permetti embedding da Shopify e altri domini
    "base-uri 'self'",
    "form-action 'self'",
  ];

  if (IS_PRODUCTION) {
    headers.set('Content-Security-Policy', cspDirectives.join('; '));
  } else {
    // In development, CSP più permissivo per hot reload
    headers.set('Content-Security-Policy-Report-Only', cspDirectives.join('; '));
  }

  // X-Frame-Options: Previeni clickjacking
  // X-Frame-Options: Permetti embedding in iframe (per widget Shopify)
  // Nota: questo header è deprecato, usa frame-ancestors in CSP
  headers.set('X-Frame-Options', 'ALLOWALL');

  // X-Content-Type-Options: Previeni MIME sniffing
  headers.set('X-Content-Type-Options', 'nosniff');

  // X-XSS-Protection: Abilita filtro XSS browser
  headers.set('X-XSS-Protection', '1; mode=block');

  // Referrer-Policy: Controlla info inviate in Referer header
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions-Policy: Disabilita feature browser non necessarie
  headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  // Strict-Transport-Security: Forza HTTPS (solo in production)
  if (IS_PRODUCTION) {
    headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // X-DNS-Prefetch-Control: Controlla DNS prefetching
  headers.set('X-DNS-Prefetch-Control', 'on');

  // 🚫 Rimuovi header che espongono info sul server
  headers.delete('X-Powered-By');
  headers.delete('Server');

  // 📊 Aggiungi header custom per tracking request ID
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  headers.set('X-Request-ID', requestId);

  return response;
}

// Applica middleware a tutte le route tranne assets statici
export const config = {
  matcher: [
    /*
     * Match tutte le richieste eccetto:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
