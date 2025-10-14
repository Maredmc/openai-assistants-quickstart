// Sistema di tracking leggero per Shopify
// Invia eventi analytics senza appesantire il codice

export interface ShopifyEvent {
  event: string;
  data: any;
  timestamp: string;
}

// Funzione principale per tracciare eventi
export const trackShopifyEvent = async (eventName: string, data: any = {}) => {
  try {
    // Aggiungi metadata
    const event: ShopifyEvent = {
      event: eventName,
      data: {
        ...data,
        source: 'ai_chatbot',
        url: typeof window !== 'undefined' ? window.location.href : '',
      },
      timestamp: new Date().toISOString(),
    };

    // Log in console (visibile in Vercel logs)
    console.log(`📊 [SHOPIFY] ${eventName}:`, data);

    // Invia al backend (non bloccante)
    if (typeof window !== 'undefined') {
      fetch('/api/shopify/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      }).catch((error) => {
        // Fail silently - non vogliamo bloccare l'UX
        console.error('Shopify tracking error:', error);
      });
    }
  } catch (error) {
    // Fail silently
    console.error('Shopify tracking error:', error);
  }
};

// Funzioni helper per eventi specifici
export const trackProductView = (productId: string, productName: string) => {
  trackShopifyEvent('product_viewed', {
    product_id: productId,
    product_name: productName,
  });
};

export const trackAddToCart = (productId: string, productName: string, quantity: number = 1) => {
  trackShopifyEvent('add_to_cart', {
    product_id: productId,
    product_name: productName,
    quantity,
  });
};

export const trackRemoveFromCart = (productId: string, productName: string) => {
  trackShopifyEvent('remove_from_cart', {
    product_id: productId,
    product_name: productName,
  });
};

export const trackCheckoutStarted = (totalAmount: number, itemCount: number) => {
  trackShopifyEvent('checkout_started', {
    total_amount: totalAmount,
    item_count: itemCount,
  });
};

export const trackContactSubmit = (email?: string, phone?: string) => {
  trackShopifyEvent('contact_submitted', {
    email: email || '',
    phone: phone || '',
  });
};

// Esponi funzioni globalmente per uso in componenti (opzionale)
if (typeof window !== 'undefined') {
  (window as any).trackProductView = trackProductView;
  (window as any).trackAddToCart = trackAddToCart;
  (window as any).trackRemoveFromCart = trackRemoveFromCart;
  (window as any).trackCheckoutStarted = trackCheckoutStarted;
  (window as any).trackContactSubmit = trackContactSubmit;
}
