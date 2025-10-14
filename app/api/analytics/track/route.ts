import { NextRequest, NextResponse } from "next/server";
import { saveEvent } from "../summary/route";

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || 'nabecreation.myshopify.com';
const SHOPIFY_ADMIN_API_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN;
const SHOPIFY_API_VERSION = '2024-10';

interface AnalyticsEvent {
  type: string;
  timestamp: Date;
  sessionId: string;
  data: any;
}

export async function POST(request: NextRequest) {
  try {
    const event: AnalyticsEvent = await request.json();
    
    console.log('📊 Received analytics event:', event.type);

    // Salva evento in file JSON
    await saveEvent(event);

    // Invia a Shopify come Customer Event (se configurato)
    if (SHOPIFY_ADMIN_API_TOKEN) {
      await sendToShopify(event);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error tracking event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Salva evento localmente
async function saveEventLocally(event: AnalyticsEvent) {
  // Per ora solo log, ma puoi salvare in un file JSON o database
  console.log(`
📊 ANALYTICS EVENT
Type: ${event.type}
Session: ${event.sessionId}
Time: ${new Date(event.timestamp).toLocaleString()}
Data: ${JSON.stringify(event.data, null, 2)}
---
  `);
}

// Invia evento a Shopify
async function sendToShopify(event: AnalyticsEvent) {
  try {
    // Crea un Customer Event in Shopify
    // Nota: questo richiede l'API Customer Events che potrebbe non essere disponibile in tutti i piani
    
    // Per ora, salviamo come metafield sul cliente o come note
    // Questo è un esempio semplificato
    
    const metafield = {
      namespace: 'nabe_analytics',
      key: `event_${event.type}_${Date.now()}`,
      value: JSON.stringify({
        sessionId: event.sessionId,
        timestamp: event.timestamp,
        data: event.data
      }),
      type: 'json'
    };

    console.log('📤 Would send to Shopify:', metafield);
    
    // NOTA: Per implementare completamente, servirà:
    // 1. Customer ID (se l'utente è autenticato)
    // 2. API call a Shopify Customer Metafields
    // 3. O usare Shopify Analytics API se disponibile
    
  } catch (error) {
    console.error('Error sending to Shopify:', error);
  }
}

// GET endpoint per recuperare analytics summary
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    // Qui potresti leggere da un database o file
    // Per ora restituiamo un esempio
    
    return NextResponse.json({
      success: true,
      message: 'Analytics data would be here',
      sessionId
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
