import { NextRequest, NextResponse } from "next/server";
import { syncProducts, searchProducts, getCacheStatus } from "@/app/lib/ecommerce";

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
        const cacheStatus = getCacheStatus();
        return NextResponse.json({
          success: true,
          ...cacheStatus
        });

      case 'sync':
        // Forza sincronizzazione prodotti
        console.log('🔄 Force syncing products...');
        const syncResult = await syncProducts(true);
        return NextResponse.json({
          success: true,
          message: 'Products synchronized successfully',
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

        const productsData = await syncProducts(forceRefresh);
        const searchResults = searchProducts(query, productsData.products);

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
        const allProductsData = await syncProducts(forceRefresh);
        let products = allProductsData.products;

        if (category) {
          products = products.filter(p => 
            p.category.toLowerCase().includes(category.toLowerCase())
          );
        }

        return NextResponse.json({
          success: true,
          products: products.slice(0, 20), // Limita a 20 per performance
          totalProducts: allProductsData.totalProducts,
          filteredProducts: products.length,
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
      const syncResult = await syncProducts(true);
      
      return NextResponse.json({
        success: true,
        message: 'Manual sync completed successfully',
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
