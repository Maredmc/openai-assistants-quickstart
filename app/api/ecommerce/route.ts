import { NextRequest, NextResponse } from "next/server";
import { syncProducts, getCacheStatus } from "@/app/lib/ecommerce";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'test';

  console.log(`🧪 E-commerce test endpoint - Action: ${action}`);

  try {
    switch (action) {
      case 'test':
        // Test completo del sistema
        const cacheStatus = getCacheStatus();
        let testResults = {
          system: 'E-commerce Integration Test',
          timestamp: new Date().toISOString(),
          cache: cacheStatus,
          tests: {}
        };

        // Test 1: Sync prodotti
        console.log('🔄 Testing product sync...');
        const syncStart = Date.now();
        const syncResult = await syncProducts(false); // Use cache if available
        const syncTime = Date.now() - syncStart;

        testResults.tests = {
          sync: {
            success: syncResult.products.length > 0,
            duration: `${syncTime}ms`,
            productsFound: syncResult.totalProducts,
            lastSync: syncResult.lastSync,
            sampleProduct: syncResult.products[0] || null
          }
        };

        return NextResponse.json(testResults);

      case 'force-sync':
        // Forza sync completa
        console.log('🔄 Force syncing all products...');
        const forceStart = Date.now();
        const forceResult = await syncProducts(true);
        const forceTime = Date.now() - forceStart;

        return NextResponse.json({
          success: true,
          message: 'Force sync completed',
          duration: `${forceTime}ms`,
          productsFound: forceResult.totalProducts,
          lastSync: forceResult.lastSync,
          products: forceResult.products.slice(0, 5) // Show first 5
        });

      case 'status':
        // Status rapido
        const status = getCacheStatus();
        return NextResponse.json({
          system: 'E-commerce Status',
          ...status,
          endpoints: {
            products: '/api/products',
            sync: '/api/products?action=sync',
            search: '/api/products?action=search&q=letto'
          }
        });

      default:
        return NextResponse.json({
          error: 'Invalid action',
          availableActions: ['test', 'force-sync', 'status']
        }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ E-commerce test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
