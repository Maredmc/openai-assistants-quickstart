# 🏪 Integrazione Shopify per Newsletter e WhatsApp

## ✅ **IMPLEMENTAZIONE COMPLETATA**

Integrazione per sincronizzare automaticamente gli utenti che si iscrivono alla newsletter o a WhatsApp dal chatbot direttamente nel tuo store Shopify come clienti.

## ❗ **CORREZIONE IMPORTANTE: Email Subscription Status**

🐛 **Problema identificato**: Anche con `accepts_marketing: true`, i customer risultavano "Not subscribed" in Shopify.

✅ **Soluzione implementata**: Aggiunto campo `marketing_opt_in_level: 'confirmed_opt_in'` che è **ESSENZIALE** per far sì che il customer risulti come "**Subscribed**" in Shopify Admin.

### Prima della correzione:
```javascript
// ❌ PROBLEMA: Customer creato ma "Not subscribed"
customerData = {
  accepts_marketing: true
  // marketing_opt_in_level: MANCAVA!
}
```

### Dopo la correzione:
```javascript
// ✅ RISOLTO: Customer risulta "Subscribed"
customerData = {
  accepts_marketing: true,
  marketing_opt_in_level: 'confirmed_opt_in'  // 🎯 CHIAVE!
}
```

🎯 **Risultato**: Ora i customer che selezionano Newsletter risultano correttamente come "**Subscribed**" in Shopify Admin > Customers.

## 🎯 **Logica Newsletter vs WhatsApp (CORRETTA)**

### 📧 Solo Newsletter
- `accepts_marketing: true` (iscritto al marketing email)
- Tag: `Newsletter`
- `marketing_opt_in_level: confirmed_opt_in`

### 📱 Solo WhatsApp  
- `accepts_marketing: false` (NON iscritto al marketing email - unsubscribed)
- Tag: `Whatsapp`
- Note: Il cliente viene comunque creato ma rimane unsubscribed dalle email

### 📧📱 Newsletter + WhatsApp
- `accepts_marketing: true` (iscritto al marketing email)
- Tag: `Newsletter, Whatsapp`
- `marketing_opt_in_level: confirmed_opt_in`

## 🔧 **Configurazione**

### 1. Variabili d'ambiente (.env.local)
```env
SHOPIFY_STORE_DOMAIN="test.myshopify.com"
SHOPIFY_ADMIN_API_TOKEN="shpat_123....."
```

### 2. Libreria utilizzata
- **File:** `/app/lib/shopify.ts` (estesa con funzioni customer)
- **Funzione:** `createOrUpdateShopifyCustomer()`
- **Riutilizza:** `fetchWithTimeout()` esistente per timeout API

### 3. API Endpoints
- **POST `/api/contact`**: Gestisce i form di contatto e sincronizza con Shopify
- **GET `/test-shopify`**: Pagina di test dell'integrazione

## 🔄 **Gestione Clienti Esistenti**

- **Ricerca duplicati**: Automatica per email
- **Aggiornamento tag**: I nuovi tag vengono aggiunti a quelli esistenti (no duplicati)  
- **Protezione newsletter**: Se un cliente era già iscritto alla newsletter, rimane iscritto anche se richiede solo WhatsApp
- **Merge intelligente**: `accepts_marketing = existing || new_newsletter_request`

## 🚀 **Come Funziona**

1. L'utente compila il form di contatto nel chatbot
2. Se seleziona "Newsletter" o "WhatsApp", il sistema:
   - Cerca se il cliente esiste già in Shopify (per email)
   - Se esiste: aggiorna i tag e le preferenze di marketing
   - Se non esiste: crea un nuovo cliente
3. Invia l'email di notifica al team con i dettagli dell'integrazione

## 📝 **Struttura dei File**

```
app/
├── lib/
│   └── shopify.ts                 # Libreria Shopify esistente + funzioni customer
├── api/
│   └── contact/
│       └── route.ts              # API contatti con integrazione Shopify
├── components/
│   └── contact-form.tsx          # Form con opzioni newsletter/WhatsApp
└── test-shopify/
    └── page.tsx                  # Pagina di test integrazione
```

## 🧪 **Test**

### Pagina di test: `/test-shopify`
- Test completo dell'integrazione
- Anteprima in tempo reale del risultato
- Logging dettagliato per debugging

### Casi di test consigliati:
1. **Solo Newsletter**: `accepts_marketing=true`, tag=`Newsletter`
2. **Solo WhatsApp**: `accepts_marketing=false`, tag=`Whatsapp`  
3. **Entrambi**: `accepts_marketing=true`, tag=`Newsletter, Whatsapp`
4. **Cliente esistente**: Verifica merge dei tag

## ✅ **Verifica su Shopify**

1. Vai su `nabe-furniture.myshopify.com/admin/customers`
2. Cerca il cliente per email
3. Verifica:
   - **Tag**: "Newsletter" e/o "Whatsapp"
   - **accepts_marketing**: true solo se Newsletter selezionata
   - **Note**: Contiene data iscrizione e servizi selezionati

## 🛠️ **Gestione Errori**

- **Errore 403**: Problema token API o permessi app
- **Token non configurato**: Fallback graceful, email viene comunque inviata
- **API timeout**: Usa `fetchWithTimeout()` con timeout di 8 secondi
- **Non bloccante**: Se Shopify fallisce, l'email viene comunque inviata

## 📧 **Email di Notifica**

Include sezione dedicata con:
- ✅ Stato integrazione Shopify (successo/errore)
- 🆔 ID cliente creato/aggiornato
- 🎯 Servizi attivati (Newsletter/WhatsApp)
- 📋 Dettagli tecnici per debugging

## 🔑 **Permessi API Shopify Richiesti**

- `read_customers`
- `write_customers`  
- `read_marketing_events`
- `write_marketing_events`

## 🎯 **Esempi di Utilizzo**

### Cliente nuovo - Solo Newsletter
```javascript
await createOrUpdateShopifyCustomer({
  email: "mario@example.com",
  acceptsMarketing: true,    // ✅ Newsletter richiesta
  whatsappMarketing: false
});
// Risultato: accepts_marketing=true, tags="Newsletter"
```

### Cliente nuovo - Solo WhatsApp  
```javascript
await createOrUpdateShopifyCustomer({
  email: "luigi@example.com", 
  acceptsMarketing: false,    // ❌ Solo WhatsApp
  whatsappMarketing: true
});
// Risultato: accepts_marketing=false, tags="Whatsapp"
```

### Cliente esistente - Aggiunta WhatsApp
```javascript
// Cliente esistente: accepts_marketing=true, tags="Newsletter"
await createOrUpdateShopifyCustomer({
  email: "mario@example.com",
  acceptsMarketing: false,    // Non richiede newsletter aggiuntiva  
  whatsappMarketing: true     // Aggiunge WhatsApp
});
// Risultato: accepts_marketing=true (mantenuto), tags="Newsletter, Whatsapp"
```

## 🚨 **Differenze con l'approccio precedente**

❌ **Vecchio approccio**:
- File separato `shopify-integration.ts`
- Valori hardcodati
- Duplicazione di funzionalità

✅ **Nuovo approccio (Claude Code)**:
- Estende libreria esistente `/app/lib/shopify.ts`
- Usa variabili d'ambiente
- Riutilizza `fetchWithTimeout()` esistente
- Coerente con architettura progetto

## 🎉 **Status: PRONTO ALL'USO**

L'integrazione è **100% completa** e segue esattamente la logica richiesta:
- ✅ Solo Newsletter → iscritto al marketing email
- ✅ Solo WhatsApp → unsubscribed dal marketing email  
- ✅ Entrambi → iscritto a entrambi i servizi
- ✅ Controllo duplicati completo
- ✅ Merge intelligente dei tag

**L'unica cosa che può impedire il funzionamento è un problema di configurazione API Shopify (errore 403).**
