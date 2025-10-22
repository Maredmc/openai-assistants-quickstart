import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit, RATE_LIMIT_CONFIGS, type RateLimitStore, sanitizeString } from "@/app/lib/security";
import { secureLog } from "@/app/lib/secure-logger";

const trackingRateLimitStore: RateLimitStore = new Map();

export async function POST(request: NextRequest) {
  // 🚦 Rate Limiting
  const rateResult = applyRateLimit({
    headers: request.headers,
    store: trackingRateLimitStore,
    ...RATE_LIMIT_CONFIGS.generous,
  });

  if (rateResult.limited) {
    // Ritorna successo comunque per non bloccare UX
    return NextResponse.json({ success: true });
  }

  try {
    const { event, data, timestamp } = await request.json();

    // ✅ Validazione input
    const sanitizedEvent = sanitizeString(String(event || ''), 100);

    if (!sanitizedEvent) {
      return NextResponse.json({ success: true }); // Silent fail
    }

    // ⚠️ Log sicuro senza PII, IP o user agent
    secureLog.event(`shopify_${sanitizedEvent}`, {
      timestamp,
      hasData: Boolean(data)
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // Silent fail - non vogliamo bloccare l'UX
    return NextResponse.json({ success: true });
  }
}
