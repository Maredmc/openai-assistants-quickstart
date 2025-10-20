// 🧪 Simple Product Sync Test
// Test synchronization via API endpoints

async function testProductSync() {
  console.log('🔄 TESTING PRODUCT SYNCHRONIZATION VIA API...\n');
  
  const baseUrl = 'http://localhost:3000';
  
  try {
    // 1. Test sync status
    console.log('📋 1. CHECKING SYNC STATUS:');
    const statusResponse = await fetch(`${baseUrl}/api/sync?action=status`);
    const statusData = await statusResponse.json();
    
    if (statusData.success) {
      console.log(`✅ Sync Status: ${statusData.isSync ? 'SYNCHRONIZED' : 'NEEDS SYNC'}`);
      console.log(`📦 Configured Products: ${statusData.configuredProducts}`);
      
      if (!statusData.isSync) {
        console.log('\n⚠️ SYNC ISSUES DETECTED:');
        console.log(statusData.report);
      }
    } else {
      console.log('❌ Failed to get sync status:', statusData.error);
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // 2. Test products list
    console.log('📋 2. CONFIGURED PRODUCTS:');
    const productsResponse = await fetch(`${baseUrl}/api/sync?action=products`);
    const productsData = await productsResponse.json();
    
    if (productsData.success) {
      console.log(`Total: ${productsData.totalProducts} products`);
      console.log('By category:');
      Object.entries(productsData.byCategory).forEach(([category, count]) => {
        console.log(`   ${category}: ${count} products`);
      });
      
      console.log('\nFirst 10 products:');
      productsData.products.slice(0, 10).forEach((product, index) => {
        console.log(`${index + 1}. ${product.shortName} (${product.fullName})`);
        console.log(`   Handle: ${product.handle}`);
        console.log(`   Category: ${product.category}`);
        console.log('');
      });
    } else {
      console.log('❌ Failed to get products:', productsData.error);
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // 3. Test detailed report
    console.log('📋 3. DETAILED REPORT:');
    const reportResponse = await fetch(`${baseUrl}/api/sync?action=report`);
    const reportData = await reportResponse.json();
    
    if (reportData.success) {
      const report = reportData.report;
      console.log('📊 Validation:', report.validation.isSync ? '✅ Synchronized' : '❌ Issues detected');
      console.log('📡 API Status:', report.apiStatus.available ? '✅ Available' : '❌ Not available');
      
      if (report.apiStatus.available) {
        console.log(`   Products in API: ${report.apiStatus.products}`);
        console.log(`   Last sync: ${report.apiStatus.lastSync || 'Unknown'}`);
      }
      
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach(rec => console.log(`   ${rec}`));
    } else {
      console.log('❌ Failed to get report:', reportData.error);
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // 4. Summary and actions
    console.log('📋 4. SUMMARY & AVAILABLE ACTIONS:');
    console.log('\n🔧 Available sync actions:');
    console.log('   POST /api/sync { "action": "validate" }        - Validate sync status');
    console.log('   POST /api/sync { "action": "sync-products" }   - Sync from Shopify');
    console.log('   POST /api/sync { "action": "update-assistant" } - Update AI assistant');
    console.log('   POST /api/sync { "action": "full-sync" }       - Complete sync');
    
    console.log('\n✅ Product sync test completed!');
    console.log('\n🎯 Next steps:');
    if (!statusData.isSync) {
      console.log('   1. Run full sync to fix issues');
      console.log('   2. Test assistant with products');
    } else {
      console.log('   1. Products are synchronized');
      console.log('   2. Test assistant to verify it shows products correctly');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   - Make sure server is running: npm run dev');
    console.log('   - Check if API endpoints are accessible');
    console.log('   - Verify environment variables are set');
  }
}

// 🚀 Run test function
if (typeof window === 'undefined') {
  // Node.js environment
  const fetch = require('node-fetch');
  testProductSync();
} else {
  // Browser environment  
  console.log('🌐 Product sync test available in browser console');
  window.testProductSync = testProductSync;
}

module.exports = { testProductSync };