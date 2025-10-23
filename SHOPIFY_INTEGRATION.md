# 🏪 Integrazione Shopify per Newsletter e WhatsApp

## ✅ **IMPLEMENTAZIONE COMPLETATA**

Integrazione per sincronizzare automaticamente gli utenti che si iscrivono alla newsletter o a WhatsApp dal chatbot direttamente nel tuo store Shopify come clienti.

## ❗ **CORREZIONE IMPORTANTE: Email Subscription Status**

🐛 **Problema identificato**: Anche con `accepts_marketing: true`, i customer risultavano "Not subscribed" in Shopify.

✅ **Causa trovata**: Shopify ha **deprecato** `accepts_marketing` ad aprile 2022 in favore del nuovo sistema `email_marketing_consent`.

✅ **Soluzione implementata**: Migrato al nuovo formato Shopify 2022+ che è **ESSENZIALE** per far sì che il customer risulti come "**Subscribed**".

### Prima della correzione (OBSOLETO):
```javascript
// ❌ PROBLEMA: Formato deprecato da aprile 2022
customerData = {
  accepts_marketing: true,
  marketing_opt_in_level: 'confirmed_opt_in'  // Non funziona più!
}
```

### Dopo la correzione (SHOPIFY 2022+):
```javascript
// ✅ RISOLTO: Nuovo formato email_marketing_consent
customerData = {
  email_marketing_consent: {
    state: 'subscribed',  // 🎯 CHIAVE!
    opt_in_level: 'confirmed_opt_in',
    consent_updated_at: '2025-10-22T12:00:00.000Z'
  },
  accepts_marketing: true  // Mantenuto per compatibilità
}
```

🎯 **Risultato**: Ora i customer che selezionano Newsletter risultano correttamente come "**Subscribed**" in Shopify Admin > Customers.

## 🎯 **Logica Newsletter vs WhatsApp (CORRETTA)**

### 📧 Solo Newsletter
- `email_marketing_consent.state: 'subscribed'` (**NUOVO FORMATO 2022+**)
- `email_marketing_consent.opt_in_level: 'confirmed_opt_in'`
- Tag: `Newsletter`
- `accepts_marketing: true` (mantenuto per compatibilità)

### 📱 Solo WhatsApp  
- `email_marketing_consent.state: 'not_subscribed'` (NON iscritto al marketing email)
- Tag: `Whatsapp`
- Note: Il cliente viene comunque creato ma rimane unsubscribed dalle email

### 📧📱 Newsletter + WhatsApp
- `email_marketing_consent.state: 'subscribed'` (iscritto al marketing email)
- `email_marketing_consent.opt_in_level: 'confirmed_opt_in'`
- Tag: `Newsletter, Whatsapp`

## 🔧 **Configurazione**

### 1. Variabili d'ambiente (.env.local)
```env
SHOPIFY_STORE_DOMAIN="test.myshopify.com"
SHOPIFY_ADMIN_API_TOKEN="shpat_123....."
```

### 2. Libreria utilizzata
- **File:** `/app/lib/shopify.ts` (estesa con funzioni customer)
- **Funzione:** `createOrUpdateShopifyCustomer()`
- **API Version:** 2024-10 (supporta nuovo formato `email_marketing_consent`)
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

## 💬 Prefill domande nel chatbot da Shopify

Per compilare automaticamente l'input del chatbot quando l'utente clicca una domanda nel widget Shopify, aggiungi questo script al tema (ad esempio in `theme.liquid` o nello snippet che gestisce il popup):

```html
<script>
  (function () {
    const IFRAME_SELECTOR = '#nabe-chatbot-iframe'; // aggiorna con il selettore reale dell'iframe

    const getIframe = () => document.querySelector(IFRAME_SELECTOR);

    const getIframeOrigin = (iframe) => {
      try {
        return new URL(iframe.src, window.location.href).origin;
      } catch (err) {
        console.warn('[Nabè chatbot] Impossibile calcolare origin iframe:', err);
        return '*';
      }
    };

    const flushPendingQuestion = (iframe) => {
      const pending = iframe?.dataset.pendingQuestion;
      if (!pending) return;
      sendQuestionToIframe(pending);
      delete iframe.dataset.pendingQuestion;
    };

    const sendQuestionToIframe = (question) => {
      const iframe = getIframe();
      if (!iframe || !iframe.contentWindow) {
        console.warn('[Nabè chatbot] Iframe non trovato, ritento al ready event');
        return;
      }

      const origin = getIframeOrigin(iframe);
      iframe.contentWindow.postMessage(
        { type: 'NABE_PREFILL_QUESTION', text: question },
        origin
      );
    };

    window.openNabeChatbotWithQuestion = function openNabeChatbotWithQuestion(question) {
      const iframe = getIframe();
      if (!iframe) {
        console.warn('[Nabè chatbot] Iframe non disponibile');
        return;
      }

      // Apri il popup se necessario (personalizza in base alla tua UI)
      document.documentElement.classList.add('nabe-chatbot-open');

      if (iframe.dataset.chatReady === 'true') {
        sendQuestionToIframe(question);
      } else {
        iframe.dataset.pendingQuestion = question;
      }
    };

    window.addEventListener('message', (event) => {
      const iframe = getIframe();
      if (!iframe || event.source !== iframe.contentWindow) return;
      if (!event.data || event.data.type !== 'NABE_CHAT_READY') return;

      iframe.dataset.chatReady = 'true';
      flushPendingQuestion(iframe);
    });
  })();
</script>
```

Ora puoi riutilizzare le pillole esistenti:

```html
<div class="nabe-question-pill" onclick="openNabeChatbotWithQuestion('Quali sono i tempi di consegna?')">
  Tempi di consegna?
</div>
```

Il componente React del chatbot invia l'evento `NABE_CHAT_READY` quando è pronto a ricevere messaggi e accetta le domande attraverso `postMessage`.
- ✅ Entrambi → iscritto a entrambi i servizi
- ✅ Controllo duplicati completo
- ✅ Merge intelligente dei tag

**L'unica cosa che può impedire il funzionamento è un problema di configurazione API Shopify (errore 403).**
