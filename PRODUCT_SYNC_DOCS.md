# 🔄 Product Synchronization System

## 🎯 Overview

Sistema completo per mantenere sincronizzati i prodotti tra:
- **Shopify** (fonte dati)
- **API interna** (cache prodotti)  
- **Assistant OpenAI** (raccomandazioni AI)

## 🚨 **PROBLEMA RISOLTO**

**PRIMA**: L'assistente aveva handle prodotti non allineati con i dati disponibili
**DOPO**: Sistema di sincronizzazione automatica che mantiene tutto allineato

## ✅ **CORREZIONI IMPLEMENTATE**

### 🔧 Handle Corretti
- ❌ `letto-soppalco-evolutivo-zeropiu-up` (errato)
- ✅ `letto-a-soppalco-zeropiu-up` (corretto)

### ➕ Prodotti Aggiunti
- ✅ `coppia-cuscini-zeropiu-camomilla` (Cuscini Camomilla)
- ✅ `coppia-cuscini-zeropiu-plin` (Cuscini Plin)

### 📊 Totale Prodotti
- **PRIMA**: 10 prodotti configurati nell'assistente
- **DOPO**: 12 prodotti sincronizzati e organizzati per categoria

## 🏗️ **Architettura del Sistema**

```
📦 Product Sync System
├── 🎯 app/lib/product-sync.ts        # Manager sincronizzazione
├── 🤖 app/lib/assistant-manager.ts   # Assistente con prodotti corretti
├── 🌐 app/api/sync/route.ts          # Endpoint gestione sync
├── 📋 app/data/nabe-product-handles.ts # Dati prodotti fonte
└── 🧪 test-product-sync.js           # Test automatici
```

## 🛠️ **API Endpoints**

### 📊 Diagnostica (GET)
```bash
# Status sincronizzazione
GET /api/sync?action=status

# Lista prodotti configurati  
GET /api/sync?action=products

# Report dettagliato
GET /api/sync?action=report
```

### 🔄 Operazioni (POST)
```bash
# Valida solo sincronizzazione
curl -X POST /api/sync \\
  -H "Content-Type: application/json" \\
  -d '{"action": "validate"}'

# Sincronizza da Shopify
curl -X POST /api/sync \\
  -H "Content-Type: application/json" \\
  -d '{"action": "sync-products"}'

# Aggiorna assistente
curl -X POST /api/sync \\
  -H "Content-Type: application/json" \\
  -d '{"action": "update-assistant"}'

# Sincronizzazione completa
curl -X POST /api/sync \\
  -H "Content-Type: application/json" \\
  -d '{"action": "full-sync"}'
```

## 🧪 **Testing**

### Test Automatico
```bash
# Avvia server
npm run dev

# Test sincronizzazione  
node test-product-sync.js
```

### Test Manuale Browser
```javascript
// Console del browser
fetch('/api/sync?action=status')
  .then(r => r.json())
  .then(data => console.log(data));
```

## 📋 **Prodotti Configurati**

### 🛏️ **Letti Evolutivi (6 prodotti)**
1. **zero+ Earth** - `letto-zeropiu-earth-con-kit-piedini-omaggio`
2. **zero+ Dream** - `letto-montessori-casetta-baldacchino-zeropiu`
3. **zero+ Fun** - `letto-evolutivo-fun`
4. **zero+ Family** - `letto-montessori-evolutivo-zeropiu-family`
5. **zero+ Duo** - `letto-castello-evolutivo-zeropiu-duo`
6. **zero+ Up** - `letto-a-soppalco-zeropiu-up` ✅ CORRETTO

### 🔧 **Accessori (3 prodotti)**
7. **Sponde** - `kit-sponde-di-sicurezza-per-letto-zeropiu`
8. **Kit piedOni** - `kit-piedoni-zeropiu`
9. **Cassettone** - `cassettone-estraibile-letto-zeropiu`

### 💤 **Comfort e Riposo (3 prodotti)**
10. **Materasso** - `materasso-evolutivo-letto-zeropiu`
11. **Cuscini Camomilla** - `coppia-cuscini-zeropiu-camomilla` ✅ AGGIUNTO
12. **Cuscini Plin** - `coppia-cuscini-zeropiu-plin` ✅ AGGIUNTO

## 🔧 **Troubleshooting**

### ❌ "Prodotti non vengono mostrati"
```bash
# 1. Verifica sincronizzazione
GET /api/sync?action=status

# 2. Se non sincronizzato, esegui full sync
POST /api/sync {"action": "full-sync"}

# 3. Testa API prodotti
GET /api/products?action=list&limit=10
```

### ❌ "Assistant non usa handle corretti"
```bash
# Aggiorna solo l'assistente
POST /api/sync {"action": "update-assistant"}
```

### ❌ "API prodotti non funziona"
```bash  
# Sincronizza da Shopify
POST /api/sync {"action": "sync-products"}
```

## 🎯 **Workflow Manutenzione**

### 🔄 Sincronizzazione Regolare
1. **Controllo settimanale**: `GET /api/sync?action=status`
2. **Se necessario**: `POST /api/sync {"action": "full-sync"}`
3. **Verifica**: Test con l'assistente

### ➕ Aggiungere Nuovo Prodotto
1. **Aggiungi** a `app/data/nabe-product-handles.ts`
2. **Aggiorna** `app/lib/product-sync.ts` con nuovo mapping
3. **Aggiorna** `app/lib/assistant-manager.ts` con nuovo handle
4. **Esegui**: `POST /api/sync {"action": "update-assistant"}`

### 🔧 Correggere Handle Errato
1. **Correggi** in `app/lib/product-sync.ts`
2. **Esegui**: `POST /api/sync {"action": "update-assistant"}`
3. **Verifica**: Test con l'assistente

## 🎉 **Benefici del Sistema**

✅ **Automatico** - Sincronizzazione con un comando
✅ **Validato** - Controlli automatici di integrità
✅ **Monitorato** - Report dettagliati sullo stato
✅ **Testabile** - Script di test automatici
✅ **Mantenibile** - Configurazione centralizzata
✅ **Scalabile** - Facile aggiungere nuovi prodotti

## 📞 **Support**

Se l'assistente non mostra prodotti:
1. Esegui `node test-product-sync.js`
2. Controlla il report per problemi specifici
3. Esegui `POST /api/sync {"action": "full-sync"}`
4. Testa di nuovo l'assistente

---

**Versione**: 1.0.0  
**Ultima modifica**: Ottobre 2025  
**Status**: ✅ Produzione Ready