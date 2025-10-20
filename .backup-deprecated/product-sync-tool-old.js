// 🔧 Maintenance Tool - Product Synchronization
// Strumento per mantenere sincronizzati assistente e prodotti

// Note: This is a Node.js script - for ES6 imports, use the API endpoint instead

interface SyncResult {
  success: boolean;
  message: string;
  details?: any;
}

export class ProductSyncTool {
  
  // 🔍 Diagnosi completa della sincronizzazione
  static async diagnose(): Promise<{validation: any, report: string, apiStatus: any}> {
    console.log('🔍 Running complete product synchronization diagnosis...');
    
    const validation = validateProductSync();
    const report = getSyncReport();
    
    // Test API status
    let apiStatus = { available: false, error: null, products: [] };
    try {
      const response = await fetch('/api/products?action=status');
      if (response.ok) {
        const data = await response.json();
        apiStatus = { available: true, error: null, ...data };
      }
    } catch (error) {
      apiStatus.error = error.message;
    }
    
    return { validation, report, apiStatus };
  }
  
  // 🔄 Sincronizza prodotti da Shopify
  static async syncFromShopify(): Promise<SyncResult> {
    try {
      console.log('🔄 Syncing products from Shopify...');
      
      const response = await fetch('/api/products?action=sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' })
      });
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        return {
          success: true,
          message: 'Products synchronized successfully from Shopify',
          details: {
            totalProducts: result.totalProducts,
            lastSync: result.lastSync
          }
        };
      } else {
        throw new Error(result.error || 'Unknown sync error');
      }
      
    } catch (error) {
      return {
        success: false,
        message: `Failed to sync from Shopify: ${error.message}`
      };
    }
  }
  
  // 🤖 Aggiorna assistente con nuova configurazione
  static async updateAssistant(assistantId?: string): Promise<SyncResult> {
    try {
      console.log('🤖 Updating assistant with synchronized product configuration...');
      
      const result = await AssistantManager.update(assistantId || process.env.OPENAI_ASSISTANT_ID);
      
      if (result.success) {
        return {
          success: true,
          message: 'Assistant updated with synchronized products',
          details: {
            assistantId: result.assistantId,
            totalProducts: Object.keys(PRODUCT_MAPPING).length
          }
        };
      } else {
        throw new Error(result.error || 'Unknown assistant update error');
      }
      
    } catch (error) {
      return {
        success: false,
        message: `Failed to update assistant: ${error.message}`
      };
    }
  }
  
  // 🚀 Sincronizzazione completa (tutto in uno)
  static async fullSync(assistantId?: string): Promise<{
    shopifySync: SyncResult;
    assistantUpdate: SyncResult;
    finalDiagnosis: any;
  }> {
    console.log('🚀 Starting full product synchronization...');
    
    // 1. Sync da Shopify
    const shopifySync = await this.syncFromShopify();
    
    // 2. Aggiorna assistente
    const assistantUpdate = await this.updateAssistant(assistantId);
    
    // 3. Diagnosi finale
    const finalDiagnosis = await this.diagnose();
    
    console.log('✅ Full synchronization completed');
    
    return {
      shopifySync,
      assistantUpdate,
      finalDiagnosis
    };
  }
  
  // 📊 Report dettagliato
  static async generateDetailedReport(): Promise<string> {
    const diagnosis = await this.diagnose();
    
    let report = '📊 DETAILED PRODUCT SYNCHRONIZATION REPORT\n';
    report += '='.repeat(60) + '\n\n';
    
    // Validation status
    report += '🔍 VALIDATION STATUS:\n';
    report += diagnosis.report + '\n\n';
    
    // API Status
    report += '📡 API STATUS:\n';
    if (diagnosis.apiStatus.available) {
      report += '✅ API is available\n';
      report += `   Total products: ${diagnosis.apiStatus.totalProducts || 'Unknown'}\n`;
      report += `   Last sync: ${diagnosis.apiStatus.lastSync || 'Unknown'}\n`;
    } else {
      report += '❌ API is not available\n';
      report += `   Error: ${diagnosis.apiStatus.error || 'Server not running'}\n`;
    }
    report += '\n';
    
    // Configured products
    report += '⚙️ CONFIGURED PRODUCTS:\n';
    Object.entries(PRODUCT_MAPPING).forEach(([key, product], index) => {
      report += `${index + 1}. ${key}\n`;
      report += `   Handle: ${product.handle}\n`;
      report += `   Category: ${product.category}\n`;
      report += `   Description: ${product.description}\n\n`;
    });
    
    // Recommendations
    report += '💡 RECOMMENDATIONS:\n';
    if (diagnosis.validation.isSync) {
      report += '✅ All products are synchronized - no action needed\n';
    } else {
      if (diagnosis.validation.missing.length > 0) {
        report += '🔧 Add missing products to assistant configuration\n';
      }
      if (diagnosis.validation.incorrect.length > 0) {
        report += '🔧 Fix incorrect handles in assistant configuration\n';
      }
      if (!diagnosis.apiStatus.available) {
        report += '🔧 Start the development server: npm run dev\n';
        report += '🔧 Run product sync: npm run sync-products\n';
      }
    }
    
    report += '\n' + '='.repeat(60);
    report += `\nGenerated at: ${new Date().toISOString()}`;
    
    return report;
  }
}

// 🧪 CLI Testing Interface
if (typeof window === 'undefined' && require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'diagnose':
      ProductSyncTool.diagnose().then(result => {
        console.log(result.report);
        console.log('\nAPI Status:', result.apiStatus.available ? '✅ Available' : '❌ Not available');
      });
      break;
      
    case 'sync':
      ProductSyncTool.fullSync().then(result => {
        console.log('Shopify Sync:', result.shopifySync.success ? '✅' : '❌', result.shopifySync.message);
        console.log('Assistant Update:', result.assistantUpdate.success ? '✅' : '❌', result.assistantUpdate.message);
      });
      break;
      
    case 'report':
      ProductSyncTool.generateDetailedReport().then(report => {
        console.log(report);
      });
      break;
      
    default:
      console.log('🔧 Product Sync Tool');
      console.log('Usage:');
      console.log('  node product-sync-tool.js diagnose  - Run diagnosis');
      console.log('  node product-sync-tool.js sync      - Full synchronization');
      console.log('  node product-sync-tool.js report    - Detailed report');
  }
}