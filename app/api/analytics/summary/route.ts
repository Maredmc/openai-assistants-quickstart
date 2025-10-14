import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from 'fs';
import path from 'path';

// Percorso file analytics (salviamo in un JSON semplice)
const ANALYTICS_FILE = path.join(process.cwd(), 'analytics-data.json');

interface AnalyticsEvent {
  type: string;
  timestamp: string;
  sessionId: string;
  data: any;
}

interface AnalyticsData {
  events: AnalyticsEvent[];
}

// Inizializza file se non esiste
async function initAnalyticsFile() {
  try {
    await fs.access(ANALYTICS_FILE);
  } catch {
    await fs.writeFile(ANALYTICS_FILE, JSON.stringify({ events: [] }));
  }
}

// Leggi analytics
async function readAnalytics(): Promise<AnalyticsData> {
  await initAnalyticsFile();
  const data = await fs.readFile(ANALYTICS_FILE, 'utf-8');
  return JSON.parse(data);
}

// Salva evento
export async function saveEvent(event: AnalyticsEvent) {
  const data = await readAnalytics();
  data.events.push(event);
  
  // Mantieni solo ultimi 1000 eventi
  if (data.events.length > 1000) {
    data.events = data.events.slice(-1000);
  }
  
  await fs.writeFile(ANALYTICS_FILE, JSON.stringify(data, null, 2));
}

export async function GET(request: NextRequest) {
  try {
    const data = await readAnalytics();
    const events = data.events;

    // Calcola statistiche
    const totalSessions = new Set(events.map(e => e.sessionId)).size;
    const totalProductRecommendations = events.filter(e => e.type === 'product_recommended').length;
    const totalProductClicks = events.filter(e => e.type === 'product_clicked').length;
    const totalAddToCarts = events.filter(e => e.type === 'product_added_to_cart').length;
    const totalConversions = events.filter(e => e.type === 'contact_form_submitted').length;
    const totalCheckouts = events.filter(e => e.type === 'checkout_started').length;

    // Prodotti più consigliati
    const recommendedProducts = events
      .filter(e => e.type === 'product_recommended')
      .reduce((acc, event) => {
        const product = event.data;
        const key = product.productId;
        if (!acc[key]) {
          acc[key] = {
            productId: product.productId,
            productName: product.productName,
            productPrice: product.productPrice,
            count: 0
          };
        }
        acc[key].count++;
        return acc;
      }, {} as Record<string, any>);

    const topRecommendedProducts = Object.values(recommendedProducts)
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 10);

    // Prodotti più cliccati
    const clickedProducts = events
      .filter(e => e.type === 'product_clicked')
      .reduce((acc, event) => {
        const product = event.data;
        const key = product.productId;
        if (!acc[key]) {
          acc[key] = {
            productId: product.productId,
            productName: product.productName,
            count: 0
          };
        }
        acc[key].count++;
        return acc;
      }, {} as Record<string, any>);

    const topClickedProducts = Object.values(clickedProducts)
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 10);

    // Prodotti più aggiunti al carrello
    const cartProducts = events
      .filter(e => e.type === 'product_added_to_cart')
      .reduce((acc, event) => {
        const product = event.data;
        const key = product.productId;
        if (!acc[key]) {
          acc[key] = {
            productId: product.productId,
            productName: product.productName,
            productPrice: product.productPrice,
            count: 0
          };
        }
        acc[key].count++;
        return acc;
      }, {} as Record<string, any>);

    const topCartProducts = Object.values(cartProducts)
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 10);

    // Conversazioni raggruppate per sessione
    const sessionMap = events.reduce((acc, event) => {
      if (!acc[event.sessionId]) {
        acc[event.sessionId] = {
          sessionId: event.sessionId,
          events: [],
          startTime: event.timestamp,
          endTime: event.timestamp,
          productsRecommended: [],
          productsAddedToCart: [],
          converted: false
        };
      }
      
      acc[event.sessionId].events.push(event);
      acc[event.sessionId].endTime = event.timestamp;
      
      if (event.type === 'product_recommended') {
        acc[event.sessionId].productsRecommended.push(event.data.productName);
      }
      
      if (event.type === 'product_added_to_cart') {
        acc[event.sessionId].productsAddedToCart.push(event.data.productName);
      }
      
      if (event.type === 'contact_form_submitted') {
        acc[event.sessionId].converted = true;
        acc[event.sessionId].userEmail = event.data.email;
        acc[event.sessionId].userPhone = event.data.phone;
      }
      
      return acc;
    }, {} as Record<string, any>);

    const conversations = Object.values(sessionMap)
      .sort((a: any, b: any) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, 50); // Ultime 50 conversazioni

    // Tasso di conversione
    const conversionRate = totalSessions > 0 
      ? ((totalConversions / totalSessions) * 100).toFixed(2) 
      : '0.00';

    return NextResponse.json({
      success: true,
      summary: {
        totalSessions,
        totalProductRecommendations,
        totalProductClicks,
        totalAddToCarts,
        totalConversions,
        totalCheckouts,
        conversionRate: `${conversionRate}%`
      },
      topRecommendedProducts,
      topClickedProducts,
      topCartProducts,
      conversations
    });

  } catch (error) {
    console.error('❌ Error fetching analytics summary:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
