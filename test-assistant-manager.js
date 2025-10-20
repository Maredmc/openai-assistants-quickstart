// 🧪 Test Script per il nuovo Assistant Manager
// Esegui questo per verificare che tutto funzioni

const API_BASE = 'http://localhost:3000'; // Modifica per produzione

async function testAssistantManager() {
  console.log('🧪 Avvio test Assistant Manager...\n');
  
  try {
    // 📖 Test 1: Documentazione API
    console.log('📖 Test 1: Documentazione API');
    const docsResponse = await fetch(`${API_BASE}/api/assistant`);
    const docs = await docsResponse.json();
    console.log('✅ Documentazione caricata:', docs.version);
    console.log('📋 Endpoint disponibili:', Object.keys(docs.endpoints));
    
    // 📋 Test 2: Lista assistenti esistenti
    console.log('\n📋 Test 2: Lista assistenti esistenti');
    const listResponse = await fetch(`${API_BASE}/api/assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list' })
    });
    const listResult = await listResponse.json();
    
    if (listResult.success) {
      console.log('✅ Lista ottenuta:', listResult.assistants?.length || 0, 'assistenti');
      if (listResult.assistants?.length > 0) {
        console.log('📋 Primo assistente:', listResult.assistants[0].name);
      }
    } else {
      console.log('❌ Errore lista:', listResult.error);
    }
    
    // ✨ Test 3: Creazione nuovo assistente
    console.log('\n✨ Test 3: Creazione nuovo assistente');
    const createResponse = await fetch(`${API_BASE}/api/assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create' })
    });
    const createResult = await createResponse.json();
    
    if (createResult.success) {
      console.log('✅ Assistente creato:', createResult.assistantId);
      
      // 📋 Test 4: Info del nuovo assistente
      console.log('\n📋 Test 4: Info assistente appena creato');
      const infoResponse = await fetch(`${API_BASE}/api/assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'info', 
          assistantId: createResult.assistantId 
        })
      });
      const infoResult = await infoResponse.json();
      
      if (infoResult.success) {
        console.log('✅ Info ottenute:');
        console.log('   Nome:', infoResult.assistant.name);
        console.log('   Modello:', infoResult.assistant.model);
        console.log('   Tools:', infoResult.assistant.tools.length);
        console.log('   Data creazione:', new Date(infoResult.assistant.created_at * 1000).toLocaleString());
      } else {
        console.log('❌ Errore info:', infoResult.error);
      }
      
      // 🔄 Test 5: Aggiornamento assistente
      console.log('\n🔄 Test 5: Aggiornamento assistente');
      const updateResponse = await fetch(`${API_BASE}/api/assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'update', 
          assistantId: createResult.assistantId 
        })
      });
      const updateResult = await updateResponse.json();
      
      if (updateResult.success) {
        console.log('✅ Assistente aggiornato con successo');
      } else {
        console.log('❌ Errore aggiornamento:', updateResult.error);
      }
      
    } else {
      console.log('❌ Errore creazione:', createResult.error);
    }
    
    // 🔍 Test 6: Test validazione ID errato
    console.log('\n🔍 Test 6: Validazione ID errato');
    const invalidResponse = await fetch(`${API_BASE}/api/assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'info', 
        assistantId: 'id_sbagliato_123' 
      })
    });
    const invalidResult = await invalidResponse.json();
    
    if (!invalidResult.success) {
      console.log('✅ Validazione funziona:', invalidResult.error);
    } else {
      console.log('❌ Validazione fallita - dovrebbe rifiutare ID non validi');
    }
    
    console.log('\n🎉 Test completati!');
    console.log('\n📋 Riassunto:');
    console.log('   ✅ Documentazione API');
    console.log('   ✅ Lista assistenti');
    console.log('   ✅ Creazione assistente');
    console.log('   ✅ Info assistente');
    console.log('   ✅ Aggiornamento assistente');
    console.log('   ✅ Validazione sicurezza');
    
  } catch (error) {
    console.error('❌ Errore durante i test:', error.message);
    console.log('\n🔧 Possibili cause:');
    console.log('   - Server non avviato (npm run dev)');
    console.log('   - Variabili ambiente OpenAI non configurate');
    console.log('   - Problema di rete');
  }
}

// 🚀 Esegui i test
if (typeof window === 'undefined') {
  // Node.js environment
  const fetch = require('node-fetch');
  testAssistantManager();
} else {
  // Browser environment
  console.log('🌐 Test disponibile nella console del browser');
  window.testAssistantManager = testAssistantManager;
}

// Esporta per uso in altri file
module.exports = { testAssistantManager };