import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit, RATE_LIMIT_CONFIGS, type RateLimitStore, sanitizeString } from "@/app/lib/security";
import { secureLog } from "@/app/lib/secure-logger";

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || 'nabecreation.myshopify.com';
const checkoutRateLimitStore: RateLimitStore = new Map();

interface CartItem {
  productId: string;
  quantity: number;
}

export async function POST(request: NextRequest) {
  // 🚦 Rate Limiting
  const rateResult = applyRateLimit({
    headers: request.headers,
    store: checkoutRateLimitStore,
    ...RATE_LIMIT_CONFIGS.normal,
  });

  if (rateResult.limited) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(rateResult.retryAfter) },
      }
    );
  }

  try {
    const { items } = await request.json();

    // ✅ Validazione input
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Cart is empty' },
        { status: 400 }
      );
    }

    if (items.length > 100) {
      secureLog.warn('Suspicious cart size', { itemsCount: items.length });
      return NextResponse.json(
        { error: 'Cart size limit exceeded' },
        { status: 400 }
      );
    }

    // Valida ogni item
    const validatedItems: CartItem[] = [];
    for (const item of items) {
      if (!item.productId || !item.quantity) {
        continue;
      }

      const productId = sanitizeString(String(item.productId), 100);
      const quantity = Math.max(1, Math.min(parseInt(item.quantity) || 1, 99));

      validatedItems.push({ productId, quantity });
    }

    if (validatedItems.length === 0) {
      return NextResponse.json(
        { error: 'No valid items in cart' },
        { status: 400 }
      );
    }

    // Crea URL carrello Shopify
    const cartUrl = createShopifyCartUrl(validatedItems);

    secureLog.event('checkout_created', {
      itemsCount: validatedItems.length
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: cartUrl,
    });

  } catch (error) {
    secureLog.error('Error creating checkout', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Funzione per creare URL carrello Shopify
function createShopifyCartUrl(items: CartItem[]): string {
  const baseUrl = `https://nabecreation.com/cart/`;
  
  // Formato: /cart/PRODUCT_HANDLE:QUANTITY,PRODUCT_HANDLE:QUANTITY
  const cartItems = items
    .map(item => `${item.productId}:${item.quantity}`)
    .join(',');
  
  return `${baseUrl}${cartItems}`;
}
