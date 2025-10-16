import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  console.log('🧪 QUICK TEST - Starting...');
  
  try {
    // Test 1: Sitemap access
    console.log('📡 Testing sitemap access...');
    const sitemapResponse = await fetch('https://nabecreation.com/sitemap.xml', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NabeBot/1.0)',
      }
    });
    
    const sitemapWorking = sitemapResponse.ok;
    console.log(`Sitemap access: ${sitemapWorking ? '✅' : '❌'} (${sitemapResponse.status})`);
    
    // Test 2: Products API
    console.log('🛍️ Testing products API...');
    const productsResponse = await fetch(`${request.nextUrl.origin}/api/products?action=status`, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    let productsData = null;
    if (productsResponse.ok) {
      productsData = await productsResponse.json();
    }
    
    // Test 3: Force small sync
    console.log('🔄 Testing small product sync...');
    const syncResponse = await fetch(`${request.nextUrl.origin}/api/products?action=list`, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    let syncData = null;
    if (syncResponse.ok) {
      syncData = await syncResponse.json();
    }
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      tests: {
        sitemap: {
          working: sitemapWorking,
          status: sitemapResponse.status,
          size: sitemapWorking ? (await sitemapResponse.text()).length : 0
        },
        productsAPI: {
          working: productsResponse.ok,
          status: productsResponse.status,
          data: productsData
        },
        productSync: {
          working: syncResponse.ok,
          status: syncResponse.status,
          productsFound: syncData?.products?.length || 0,
          sampleProduct: syncData?.products?.[0] || null
        }
      },
      summary: {
        allWorking: sitemapWorking && productsResponse.ok && syncResponse.ok,
        recommendation: sitemapWorking ? 'System should work!' : 'Check CORS/network issues'
      }
    });
    
  } catch (error) {
    console.error('❌ Quick test failed:', error);
    return NextResponse.json({
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
