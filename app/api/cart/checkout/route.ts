import { NextRequest, NextResponse } from "next/server";

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || 'nabecreation.myshopify.com';

export async function POST(request: NextRequest) {
  try {
    const { items } = await request.json();

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Cart is empty' },
        { status: 400 }
      );
    }

    // Crea URL carrello Shopify
    // Formato: https://store.com/cart/VARIANT_ID:QUANTITY,VARIANT_ID:QUANTITY
    const cartUrl = createShopifyCartUrl(items);
    
    return NextResponse.json({
      success: true,
      checkoutUrl: cartUrl,
    });

  } catch (error) {
    console.error('❌ Error creating checkout:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Funzione per creare URL carrello Shopify
function createShopifyCartUrl(items: any[]): string {
  const baseUrl = `https://nabecreation.com/cart/`;
  
  // Formato: /cart/PRODUCT_HANDLE:QUANTITY,PRODUCT_HANDLE:QUANTITY
  const cartItems = items
    .map(item => `${item.productId}:${item.quantity}`)
    .join(',');
  
  return `${baseUrl}${cartItems}`;
}
