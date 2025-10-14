import { NextRequest, NextResponse } from "next/server";

// Endpoint leggero per tracking eventi Shopify
// Non salva nulla - solo logga per Vercel Analytics

export async function POST(request: NextRequest) {
  try {
    const { event, data, timestamp } = await request.json();
    
    // Log strutturato per Vercel Analytics
    console.log(JSON.stringify({
      type: 'SHOPIFY_EVENT',
      event,
      data,
      timestamp,
      user_agent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
    }));

    // OPZIONALE: Invia a Shopify Customer Events API
    // Decommentare se hai configurato SHOPIFY_ADMIN_API_TOKEN
    /*
    if (process.env.SHOPIFY_ADMIN_API_TOKEN) {
      try {
        const shopifyResponse = await fetch(
          `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2024-10/events.json`,
          {
            method: 'POST',
            headers: {
              'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_API_TOKEN,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              event: {
                verb: event,
                subject_id: data.product_id || 'chatbot',
                subject_type: 'Product',
                body: JSON.stringify(data),
                created_at: timestamp,
              },
            }),
          }
        );

        if (!shopifyResponse.ok) {
          console.error('Shopify API error:', await shopifyResponse.text());
        }
      } catch (shopifyError) {
        console.error('Shopify API request failed:', shopifyError);
      }
    }
    */

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Tracking error:', error);
    // Ritorna successo comunque - non vogliamo bloccare l'UX
    return NextResponse.json({ success: true });
  }
}
