// Analytics tracking system
export interface AnalyticsEvent {
  type: 'chat_started' | 'product_recommended' | 'product_clicked' | 'product_added_to_cart' | 'contact_form_submitted' | 'checkout_started';
  timestamp: string;
  sessionId: string;
  data: any;
}

export interface ProductRecommendation {
  productId: string;
  productName: string;
  productPrice: string;
  userQuery: string;
  timestamp: Date;
}

export interface ConversationSummary {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  messageCount: number;
  productsRecommended: string[];
  productsAddedToCart: string[];
  converted: boolean;
  userEmail?: string;
  userPhone?: string;
}

const ANALYTICS_KEY = 'nabe_analytics_session';
const EVENTS_KEY = 'nabe_analytics_events';

// Genera o recupera session ID
export const getSessionId = (): string => {
  if (typeof window === 'undefined') return '';
  
  let sessionId = localStorage.getItem(ANALYTICS_KEY);
  
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(ANALYTICS_KEY, sessionId);
  }
  
  return sessionId;
};

// Traccia evento
export const trackEvent = (type: AnalyticsEvent['type'], data: any = {}) => {
  if (typeof window === 'undefined') return;
  
  const event: AnalyticsEvent = {
    type,
    timestamp: new Date().toISOString(), // Converti in stringa ISO
    sessionId: getSessionId(),
    data
  };
  
  // Salva in localStorage
  const events = getEvents();
  events.push(event);
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events.slice(-100))); // Mantieni solo ultimi 100
  
  // Invia al backend
  sendEventToBackend(event);
  
  console.log('📊 Analytics Event:', type, data);
};

// Recupera eventi
const getEvents = (): AnalyticsEvent[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const events = localStorage.getItem(EVENTS_KEY);
    return events ? JSON.parse(events) : [];
  } catch {
    return [];
  }
};

// Invia evento al backend
const sendEventToBackend = async (event: AnalyticsEvent) => {
  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    });
  } catch (error) {
    console.error('Failed to send analytics event:', error);
  }
};

// Traccia raccomandazione prodotto
export const trackProductRecommendation = (productId: string, productName: string, productPrice: string, userQuery: string) => {
  trackEvent('product_recommended', {
    productId,
    productName,
    productPrice,
    userQuery
  });
};

// Traccia click prodotto
export const trackProductClick = (productId: string, productName: string) => {
  trackEvent('product_clicked', {
    productId,
    productName
  });
};

// Traccia aggiunta al carrello
export const trackAddToCart = (productId: string, productName: string, productPrice: string) => {
  trackEvent('product_added_to_cart', {
    productId,
    productName,
    productPrice
  });
};

// Traccia invio form contatti
export const trackContactFormSubmission = (email: string, phone: string) => {
  trackEvent('contact_form_submitted', {
    email,
    phone,
    converted: true
  });
};

// Traccia inizio checkout
export const trackCheckoutStarted = (cartTotal: number, itemCount: number) => {
  trackEvent('checkout_started', {
    cartTotal,
    itemCount
  });
};

// Ottieni summary conversazione
export const getConversationSummary = (): ConversationSummary => {
  const events = getEvents();
  const sessionId = getSessionId();
  
  const chatStarted = events.find(e => e.type === 'chat_started');
  const productsRecommended = events
    .filter(e => e.type === 'product_recommended')
    .map(e => e.data.productName);
  
  const productsAddedToCart = events
    .filter(e => e.type === 'product_added_to_cart')
    .map(e => e.data.productName);
  
  const contactSubmitted = events.find(e => e.type === 'contact_form_submitted');
  
  return {
    sessionId,
    startTime: chatStarted ? new Date(chatStarted.timestamp) : new Date(),
    messageCount: events.filter(e => e.type === 'chat_started').length,
    productsRecommended: [...new Set(productsRecommended)],
    productsAddedToCart: [...new Set(productsAddedToCart)],
    converted: !!contactSubmitted,
    userEmail: contactSubmitted?.data.email,
    userPhone: contactSubmitted?.data.phone
  };
};

// Pulisci sessione (dopo checkout completato)
export const clearSession = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ANALYTICS_KEY);
    localStorage.removeItem(EVENTS_KEY);
  }
};
