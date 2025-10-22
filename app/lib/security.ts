type RateLimitBucket = {
  count: number;
  firstHit: number;
};

export type RateLimitStore = Map<string, RateLimitBucket>;

const ADMIN_TOKEN = process.env.ADMIN_API_TOKEN;

const BEARER_PREFIX = "Bearer ";

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

export function applyRateLimit(params: {
  headers: Headers;
  store: RateLimitStore;
  limit: number;
  windowMs: number;
}): { limited: boolean; retryAfter: number } {
  const key = getClientIdentifier(params.headers);
  const now = Date.now();
  const bucket = params.store.get(key);

  if (!bucket || now - bucket.firstHit > params.windowMs) {
    params.store.set(key, { count: 1, firstHit: now });
    return { limited: false, retryAfter: 0 };
  }

  if (bucket.count >= params.limit) {
    const retryAfter = Math.ceil((bucket.firstHit + params.windowMs - now) / 1000);
    return { limited: true, retryAfter: retryAfter > 0 ? retryAfter : 1 };
  }

  bucket.count += 1;
  return { limited: false, retryAfter: 0 };
}

export function requireAdminAuth(request: Request): Response | null {
  if (!ADMIN_TOKEN) {
    console.error("ADMIN_API_TOKEN non configurato");
    return new Response(
      JSON.stringify({ success: false, error: "Configurazione server mancante" }),
      {
        status: 500,
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
    return new Response(
      JSON.stringify({ success: false, error: "Accesso non autorizzato" }),
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
