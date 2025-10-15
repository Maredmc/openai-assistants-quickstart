import { NextRequest, NextResponse } from "next/server";
import { fetchShopifyProducts, searchShopifyProducts, getShopifyCacheStatus } from "@/app/lib/shopify";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'list';
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const forceRefresh = searchParams.get('refresh') === 'true';

  try {
    console.log(`📡 Products API called - Action: ${action}, Query: "${query}"`);

    switch (action) {
      case 'status':
        // Ritorna lo status della cache
        const cacheStatus = getShopifyCacheStatus();
        return NextResponse.json({
          success: true,
          ...cacheStatus
        });

      case 'sync':
        // Forza sincronizzazione prodotti da Shopify
        console.log('🔄 Force syncing products from Shopify...');
        const syncResult = await fetchShopifyProducts(true);
        return NextResponse.json({
          success: true,
          message: 'Products synchronized successfully from Shopify',
          totalProducts: syncResult.totalProducts,
          lastSync: syncResult.lastSync
        });

      case 'search':
        // Cerca prodotti
        if (!query.trim()) {
          return NextResponse.json({
            success: false,
            error: 'Search query is required'
          }, { status: 400 });
        }

        const productsData = await fetchShopifyProducts(forceRefresh);
        const searchResults = searchShopifyProducts(query, productsData.products);

        return NextResponse.json({
          success: true,
          query,
          results: searchResults,
          totalFound: searchResults.length,
          lastSync: productsData.lastSync
        });

      case 'list':
      default:
        // Lista tutti i prodotti (o filtrati per categoria)
        const allProductsData = await fetchShopifyProducts(forceRefresh);
        let products = allProductsData.products;

        if (category) {
          products = products.filter(p => 
            p.category.toLowerCase().includes(category.toLowerCase())
          );
        }

        // Ottieni il limite dalla query (default 500, max 500)
        const limit = Math.min(parseInt(searchParams.get('limit') || '500'), 500);
        
        return NextResponse.json({
          success: true,
          products: products.slice(0, limit),
          totalProducts: allProductsData.totalProducts,
          filteredProducts: products.length,
          returnedProducts: Math.min(products.length, limit),
          category: category || 'all',
          lastSync: allProductsData.lastSync
        });
    }

  } catch (error) {
    console.error('❌ Error in products API:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === 'sync') {
      console.log('🔄 Manual sync triggered via POST');
      const syncResult = await fetchShopifyProducts(true);
      
      return NextResponse.json({
        success: true,
        message: 'Manual sync completed successfully from Shopify',
        totalProducts: syncResult.totalProducts,
        lastSync: syncResult.lastSync
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 });

  } catch (error) {
    console.error('❌ Error in products POST API:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
