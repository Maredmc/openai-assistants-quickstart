// 📁 app/api/sync/route.ts
// Endpoint per gestire la sincronizzazione prodotti via API

import { NextRequest, NextResponse } from 'next/server';
import { AssistantManager } from '@/app/lib/assistant-manager';
import { validateProductSync, getSyncReport, PRODUCT_MAPPING, ALL_PRODUCT_NAMES } from '@/app/lib/product-sync';
import { assistantId } from '@/app/assistant-config';

export const runtime = "nodejs";

// 🔍 GET - Diagnosi e status
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'status';

    switch (action) {
      case 'status':
        // Status generale sincronizzazione
        const validation = validateProductSync();
        const report = getSyncReport();
        
        return NextResponse.json({
          success: true,
          isSync: validation.isSync,
          validation,
          report,
          configuredProducts: Object.keys(PRODUCT_MAPPING).length,
          allProductNames: ALL_PRODUCT_NAMES
        });

      case 'products':
        // Lista prodotti configurati
        return NextResponse.json({
          success: true,
          products: ALL_PRODUCT_NAMES,
          totalProducts: ALL_PRODUCT_NAMES.length,
          byCategory: {
            letto: ALL_PRODUCT_NAMES.filter(p => p.category === 'letto').length,
            accessorio: ALL_PRODUCT_NAMES.filter(p => p.category === 'accessorio').length,
            comfort: ALL_PRODUCT_NAMES.filter(p => p.category === 'comfort').length
          }
        });

      case 'report':
        // Report dettagliato
        const detailedValidation = validateProductSync();
        
        // Test API prodotti
        let apiStatus = { available: false, error: null, products: 0, lastSync: null };
        try {
          const apiResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/products?action=status`);
          if (apiResponse.ok) {
            const apiData = await apiResponse.json();
            apiStatus = { 
              available: true, 
              error: null, 
              products: apiData.totalProducts || 0,
              lastSync: apiData.lastSync
            };
          }
        } catch (error) {
          apiStatus.error = error.message;
        }

        return NextResponse.json({
          success: true,
          report: {
            validation: detailedValidation,
            textReport: report,
            apiStatus,
            recommendations: generateRecommendations(detailedValidation, apiStatus)
          }
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use: status, products, report'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Error in sync GET:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// 🔄 POST - Operazioni di sincronizzazione
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { action, assistantId: targetAssistantId } = body;

    switch (action) {
      case 'sync-products':
        // Sincronizza prodotti da Shopify
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'sync' })
          });

          if (!response.ok) {
            throw new Error(`Products API returned ${response.status}`);
          }

          const result = await response.json();
          
          return NextResponse.json({
            success: true,
            message: 'Products synchronized successfully from Shopify',
            details: {
              totalProducts: result.totalProducts,
              lastSync: result.lastSync
            }
          });

        } catch (error) {
          return NextResponse.json({
            success: false,
            error: `Failed to sync products: ${error.message}`
          }, { status: 500 });
        }

      case 'update-assistant':
        // Aggiorna assistente con nuova configurazione
        try {
          const updateAssistantId = targetAssistantId || assistantId;
          
          if (!updateAssistantId) {
            return NextResponse.json({
              success: false,
              error: 'Assistant ID required'
            }, { status: 400 });
          }

          const result = await AssistantManager.update(updateAssistantId);
          
          if (result.success) {
            return NextResponse.json({
              success: true,
              message: 'Assistant updated with synchronized products',
              details: {
                assistantId: result.assistantId,
                configuredProducts: Object.keys(PRODUCT_MAPPING).length
              }
            });
          } else {
            throw new Error(result.error || 'Unknown error');
          }

        } catch (error) {
          return NextResponse.json({
            success: false,
            error: `Failed to update assistant: ${error.message}`
          }, { status: 500 });
        }

      case 'full-sync':
        // Sincronizzazione completa
        const results = {
          productsSync: { success: false, message: '', details: null },
          assistantUpdate: { success: false, message: '', details: null }
        };

        // 1. Sync prodotti
        try {
          const productsResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'sync' })
          });

          if (productsResponse.ok) {
            const productsResult = await productsResponse.json();
            results.productsSync = {
              success: true,
              message: 'Products synchronized from Shopify',
              details: {
                totalProducts: productsResult.totalProducts,
                lastSync: productsResult.lastSync
              }
            };
          } else {
            throw new Error(`Products API error: ${productsResponse.status}`);
          }
        } catch (error) {
          results.productsSync = {
            success: false,
            message: `Products sync failed: ${error.message}`,
            details: null
          };
        }

        // 2. Aggiorna assistente
        try {
          const updateAssistantId = targetAssistantId || assistantId;
          if (updateAssistantId) {
            const assistantResult = await AssistantManager.update(updateAssistantId);
            if (assistantResult.success) {
              results.assistantUpdate = {
                success: true,
                message: 'Assistant updated successfully',
                details: {
                  assistantId: assistantResult.assistantId,
                  configuredProducts: Object.keys(PRODUCT_MAPPING).length
                }
              };
            } else {
              throw new Error(assistantResult.error || 'Unknown error');
            }
          }
        } catch (error) {
          results.assistantUpdate = {
            success: false,
            message: `Assistant update failed: ${error.message}`,
            details: null
          };
        }

        // Risposta finale
        const allSuccess = results.productsSync.success && results.assistantUpdate.success;
        return NextResponse.json({
          success: allSuccess,
          message: allSuccess ? 'Full synchronization completed successfully' : 'Synchronization completed with some errors',
          results
        });

      case 'validate':
        // Solo validazione
        const currentValidation = validateProductSync();
        return NextResponse.json({
          success: true,
          validation: currentValidation,
          isSync: currentValidation.isSync,
          report: getSyncReport()
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use: sync-products, update-assistant, full-sync, validate'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Error in sync POST:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// 💡 Genera raccomandazioni
function generateRecommendations(validation: any, apiStatus: any): string[] {
  const recommendations: string[] = [];

  if (validation.isSync) {
    recommendations.push('✅ All products are synchronized - no action needed');
  } else {
    if (validation.missing.length > 0) {
      recommendations.push('🔧 Add missing products to assistant configuration');
    }
    if (validation.incorrect.length > 0) {
      recommendations.push('🔧 Fix incorrect handles in assistant configuration');
    }
    if (validation.extra.length > 0) {
      recommendations.push('🔧 Remove invalid handles from assistant configuration');
    }
  }

  if (!apiStatus.available) {
    recommendations.push('🔧 Start the development server to enable API access');
    recommendations.push('🔧 Run product sync to update from Shopify');
  } else if (apiStatus.products === 0) {
    recommendations.push('🔧 No products found in API - sync from Shopify');
  }

  if (recommendations.length === 0) {
    recommendations.push('🎉 Everything looks good!');
  }

  return recommendations;
}