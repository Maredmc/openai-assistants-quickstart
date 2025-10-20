# 🚀 API Assistant Manager - Documentazione

## 📋 Overview
Sistema centralizzato e sicuro per la gestione degli assistenti OpenAI Nabè.

**Un solo endpoint**: `/api/assistant`
**Una sola configurazione**: `app/lib/assistant-manager.ts`

## 🎯 Endpoint Unificato

### POST /api/assistant

Gestisce tutte le operazioni sugli assistenti tramite il parametro `action`.

#### ✨ Crea Nuovo Assistente
```javascript
fetch('/api/assistant', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'create' })
});

// Risposta:
{
  "success": true,
  "assistantId": "asst_abc123..."
}
```

#### 🔄 Aggiorna Assistente Esistente
```javascript
fetch('/api/assistant', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    action: 'update',
    assistantId: 'asst_abc123...' // opzionale, usa quello da config se non specificato
  })
});
```

#### 📋 Ottieni Informazioni
```javascript
fetch('/api/assistant', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    action: 'info',
    assistantId: 'asst_abc123...'
  })
});

// Risposta:
{
  "success": true,
  "assistant": {
    "id": "asst_abc123...",
    "name": "Nabè - Consulente Letti Evolutivi",
    "model": "gpt-4-turbo-preview",
    "created_at": 1234567890,
    "tools": [],
    "instructions": "Ruolo: Sei l'assistente virtuale..."
  }
}
```

#### 📋 Lista Tutti gli Assistenti
```javascript
fetch('/api/assistant', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'list' })
});
```

#### 🗑️ Elimina Assistente
```javascript
fetch('/api/assistant', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    action: 'delete',
    assistantId: 'asst_abc123...'
  })
});
```

### GET /api/assistant

#### 📖 Documentazione API
```
GET /api/assistant
```
Restituisce la documentazione completa dell'API.

#### 📋 Info Assistente (GET)
```
GET /api/assistant?action=info&assistantId=asst_abc123...
```

#### 📋 Lista Assistenti (GET)
```
GET /api/assistant?action=list
```

## ⚙️ Configurazione Centralizzata

### File: app/lib/assistant-manager.ts

Tutte le configurazioni degli assistenti sono centralizzate in questo file:

- **Istruzioni**: Tutte le regole, tono, prodotti
- **Modello**: GPT-4 Turbo Preview
- **Tools**: Disabilitati per sicurezza
- **Validazioni**: Controlli di sicurezza

### Vantaggi
✅ **Un solo punto di modifica** per tutte le istruzioni
✅ **Sicurezza**: Validazioni integrate
✅ **Manutenzione**: Codice pulito e organizzato
✅ **Debugging**: Log dettagliati
✅ **Type Safety**: TypeScript completo

## 🛡️ Sicurezza

### Validazioni
- ✅ Formato ID assistente (`asst_[a-zA-Z0-9]{24}`)
- ✅ Azioni permesse validate
- ✅ Gestione errori completa
- ✅ Sanitizzazione input JSON

### Logs
Tutti i log sono prefissati con emoji per facile identificazione:
- 🚀 Operazioni di creazione
- 🔄 Operazioni di aggiornamento  
- 📋 Operazioni di lettura
- 🗑️ Operazioni di eliminazione
- ❌ Errori

## 🔄 Migrazione dai Vecchi Endpoint

### ❌ Vecchi Endpoint (DEPRECATI)
- `/api/create-clean-assistant` → spostato in `_deprecated/`
- `/api/create-improved-assistant` → spostato in `_deprecated/`
- `/api/create-perfect-assistant` → spostato in `_deprecated/`
- `/api/update-assistant` → spostato in `_deprecated/`

### ✅ Nuovo Endpoint Unificato
- `/api/assistant` con `action: 'create'`
- `/api/assistant` con `action: 'update'`
- `/api/assistant` con `action: 'info'`
- `/api/assistant` con `action: 'delete'`
- `/api/assistant` con `action: 'list'`

## 🧪 Testing

### Esempio Script di Test
```javascript
// Test completo del nuovo sistema
async function testAssistantAPI() {
  try {
    // 1. Crea assistente
    const createResponse = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create' })
    });
    const { assistantId } = await createResponse.json();
    console.log('✅ Assistente creato:', assistantId);
    
    // 2. Ottieni info
    const infoResponse = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'info', assistantId })
    });
    const info = await infoResponse.json();
    console.log('✅ Info ottenute:', info.assistant.name);
    
    // 3. Aggiorna
    const updateResponse = await fetch('/api/assistant', {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', assistantId })
    });
    console.log('✅ Assistente aggiornato');
    
    // 4. Lista
    const listResponse = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list' })
    });
    const list = await listResponse.json();
    console.log('✅ Lista assistenti:', list.assistants.length);
    
  } catch (error) {
    console.error('❌ Errore test:', error);
  }
}
```

## 📝 Note Importanti

1. **ID Assistente**: Se non specificato, usa quello dal file `assistant-config.ts`
2. **Formato Risposta**: Sempre JSON con `success: boolean`
3. **Gestione Errori**: Codici HTTP appropriati (400, 500)
4. **Cache**: Nessuna cache per garantire dati aggiornati
5. **Rate Limiting**: Da implementare se necessario

## 🎯 Best Practices

1. **Sempre controllare `success` nella risposta**
2. **Gestire gli errori appropriatamente**
3. **Usare TypeScript per type safety**
4. **Log delle operazioni per debugging**
5. **Testare ogni modifica alle istruzioni**

---

**Versione**: 2.0.0  
**Ultima modifica**: $(date)  
**Status**: ✅ Produzione