# 🚀 Miglioramenti Performance per 200+ Utenti Simultanei

## 📋 Panoramica

Implementate soluzioni per gestire **200+ utenti connessi simultaneamente** con:
- ✅ Timeout massimo di **15 secondi** per richiesta
- ✅ Messaggi di sovraccarico chiari agli utenti
- ✅ Protezione automatica dal sovraccarico
- ✅ Health check endpoint per monitoring

---

## 🎯 Problemi Risolti

### 1. **Nessun Controllo Concorrenza** ❌ → **Queue Management** ✅

**Problema**: Con 100+ utenti, tutte le richieste colpivano OpenAI API simultaneamente, causando:
- Rate limit errors (429)
- Timeout indefiniti
- Sistema bloccato

**Soluzione**: Implementata coda con:
- Max 20 richieste simultanee a OpenAI
- Max 100 richieste in coda
- Rifiuto immediato se coda piena (errore 503)

**File**: `app/lib/openai-queue.ts`

```typescript
// Configurazione per 200+ utenti
const MAX_CONCURRENT = 20;      // Max richieste simultanee
const MAX_QUEUE_SIZE = 100;     // Max richieste in attesa
const REQUEST_TIMEOUT = 15000;  // 15 secondi timeout
```

---

### 2. **Nessun Timeout Configurato** ❌ → **15 Secondi Max** ✅

**Problema**: Richieste potevano rimanere appese per minuti, consumando risorse.

**Soluzione**: Timeout configurato su tutti i route critici:

| Route | Timeout | Motivo |
|-------|---------|--------|
| `/api/assistants/threads/[threadId]/messages` | 15s | Risposta chat (priorità) |
| `/api/assistants/threads` | 10s | Creazione thread veloce |
| `/api/contact` | 15s | Invio email + Shopify |
| `/api/health` | 5s | Health check rapido |

**File modificati**:
- `app/api/assistants/threads/[threadId]/messages/route.ts`
- `app/api/assistants/threads/route.ts`
- `app/api/contact/route.ts`
- `app/api/health/route.ts`

---

### 3. **Nessun Error Handling** ❌ → **Gestione Completa Errori** ✅

**Problema**: Gli errori venivano ignorati, lasciando l'utente "a pensare" indefinitamente.

**Soluzione**: Gestione errori specifici con messaggi chiari:

| Errore | Status Code | Messaggio Utente | Retry Suggerito |
|--------|-------------|------------------|-----------------|
| Coda piena | 503 | "Sistema sovraccarico. Riprova tra 10 secondi." | 10s |
| Timeout | 408 | "Richiesta scaduta. Sistema sotto carico, riprova." | 5s |
| Errore generico | 500 | "Errore tecnico. Riprova tra qualche secondo." | 5s |

**File modificati**:
- `app/api/assistants/threads/[threadId]/messages/route.ts` (backend)
- `app/components/chat.tsx` (frontend)

---

### 4. **Nessuna Protezione Middleware** ❌ → **Protezione Pre-Route** ✅

**Problema**: Ogni richiesta entrava nel route handler anche se il sistema era sovraccarico.

**Soluzione**: Middleware che **blocca richieste PRIMA** del route handler se coda >80% piena.

**File**: `middleware.ts`

```typescript
if (openaiQueue.isOverloaded()) {
  return new NextResponse(JSON.stringify({
    error: 'Sistema sovraccarico. Riprova tra 10 secondi.',
    code: 'SYSTEM_OVERLOADED',
    retryAfter: 10,
  }), { status: 503 });
}
```

---

### 5. **Nessun Monitoring** ❌ → **Health Check Endpoint** ✅

**Problema**: Impossibile monitorare lo stato del sistema in tempo reale.

**Soluzione**: Endpoint `/api/health` con metriche in tempo reale:

```json
{
  "status": "healthy",
  "queue": {
    "size": 12,
    "processing": 18,
    "maxConcurrent": 20,
    "maxQueueSize": 100,
    "utilization": 12
  },
  "metrics": {
    "isOverloaded": false,
    "canAcceptRequests": true
  }
}
```

**Utilizzo**:
```bash
# Check stato sistema
curl https://your-app.vercel.app/api/health

# Monitoring continuo
watch -n 1 curl -s https://your-app.vercel.app/api/health | jq '.queue.utilization'
```

---

## 📊 Risultati Attesi

| Metrica | Prima | Dopo | Miglioramento |
|---------|-------|------|---------------|
| **Max utenti simultanei** | 10-15 | 200+ | +1300% |
| **Timeout richiesta** | Indefinito | 15s max | 100% controllo |
| **Gestione errori** | Nessuna | Completa | 100% tracciabilità |
| **Rate limit OpenAI** | Superato | Controllato | 0 errori 429 |
| **Feedback utente** | Nessuno | Immediato | UX migliorata |

---

## 🔧 Architettura

```
┌─────────────────────────────────────────────────────┐
│  Utente invia messaggio                             │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  Middleware (middleware.ts)                         │
│  ├─ Check coda piena? → Rifiuta (503)              │
│  └─ OK → Procedi                                    │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  Route Handler (messages/route.ts)                  │
│  ├─ Validazione input                               │
│  ├─ Timeout 15s                                     │
│  └─ Accoda richiesta → OpenAI Queue                │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  OpenAI Queue (openai-queue.ts)                     │
│  ├─ Max 20 concurrent                               │
│  ├─ Max 100 in coda                                 │
│  ├─ Timeout 15s per richiesta                       │
│  └─ Processa → OpenAI API                           │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  OpenAI API                                          │
│  ├─ Genera risposta                                 │
│  └─ Stream risultato                                │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  Frontend (chat.tsx)                                │
│  ├─ Riceve stream                                   │
│  ├─ Gestisce errori specifici                       │
│  └─ Mostra messaggio utente                         │
└─────────────────────────────────────────────────────┘
```

---

## 🚨 Gestione Errori - Flow

```
1. Utente invia messaggio
   ↓
2. Middleware check → Coda piena?
   ├─ SÌ → 503 "Sistema sovraccarico, riprova tra 10s"
   └─ NO → Continua
        ↓
3. Route Handler → Accoda richiesta
   ↓
4. OpenAI Queue → Timeout 15s?
   ├─ SÌ → 408 "Timeout, riprova tra 5s"
   └─ NO → OpenAI API
        ↓
5. OpenAI API → Errore?
   ├─ SÌ → 500 "Errore generico, riprova"
   └─ NO → Stream risposta
        ↓
6. Frontend → Mostra risposta o errore
```

---

## 📈 Monitoring Suggerito

### 1. **Vercel Dashboard**
- Monitora **Function Invocations** (dovrebbe restare <100 concurrent)
- Controlla **Function Duration** (dovrebbe essere <15s)
- Verifica **Function Errors** (dovrebbe essere basso)

### 2. **Health Check Endpoint**
```bash
# Script monitoring (esegui su server esterno)
while true; do
  HEALTH=$(curl -s https://your-app.vercel.app/api/health)
  UTIL=$(echo $HEALTH | jq -r '.queue.utilization')
  STATUS=$(echo $HEALTH | jq -r '.status')

  echo "[$(date)] Status: $STATUS | Queue: $UTIL%"

  if [ "$UTIL" -gt 80 ]; then
    echo "⚠️ WARNING: Queue utilization >80%"
  fi

  sleep 5
done
```

### 3. **Vercel Logs**
Cerca questi pattern:
```bash
# Errori coda
vercel logs --filter="Queue full"

# Timeout
vercel logs --filter="Request timeout"

# Performance
vercel logs --filter="Request completed"
```

---

## 🎛️ Configurazione Ottimale Vercel

### Piano Consigliato: **Vercel Pro**

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Max Concurrent | 1 | ~100 | Illimitato |
| Function Timeout | 10s | 60s | 900s |
| Memory | 1GB | 3GB | Configurabile |
| **Consigliato per 200 utenti** | ❌ | ✅ | ✅ |

### Variabili Ambiente (opzionali)

```env
# .env.local

# Aumenta concurrent se su Enterprise
OPENAI_QUEUE_MAX_CONCURRENT=20  # Default: 20
OPENAI_QUEUE_MAX_SIZE=100       # Default: 100
OPENAI_QUEUE_TIMEOUT=15000      # Default: 15000 (15s)
```

---

## 🔮 Prossimi Miglioramenti (Opzionali)

### 1. **Redis per Rate Limiting Distribuito**
**Problema**: Con Vercel Serverless, ogni istanza ha rate limit separato.
**Soluzione**: Usa **Vercel KV** (Redis) per rate limiting globale.

### 2. **WebSocket invece di HTTP Streaming**
**Problema**: HTTP streaming tiene connessioni aperte.
**Soluzione**: WebSocket per comunicazione bidirezionale efficiente.

### 3. **Caching Risposte Comuni**
**Problema**: Domande frequenti (es. "Che letto consigli?") generano sempre nuove richieste.
**Soluzione**: Cache Redis per risposte comuni.

### 4. **Auto-Scaling Parametri**
**Problema**: Parametri fissi potrebbero non adattarsi al carico.
**Soluzione**: Adatta automaticamente `MAX_CONCURRENT` in base al carico.

---

## 📝 File Modificati

```
app/
├── lib/
│   └── openai-queue.ts                              [NUOVO]
├── api/
│   ├── health/route.ts                              [NUOVO]
│   ├── assistants/
│   │   ├── threads/
│   │   │   ├── route.ts                             [MODIFICATO]
│   │   │   └── [threadId]/messages/route.ts         [MODIFICATO]
│   └── contact/route.ts                             [MODIFICATO]
├── components/
│   └── chat.tsx                                      [MODIFICATO]
└── middleware.ts                                     [MODIFICATO]
```

---

## ✅ Testing

### Test 1: Sistema Normale
```bash
# Invia 1 messaggio
curl -X POST https://your-app.vercel.app/api/assistants/threads/THREAD_ID/messages \
  -H "Content-Type: application/json" \
  -d '{"content": "Ciao"}'

# Risultato atteso: 200 OK, risposta streaming
```

### Test 2: Sistema Sovraccarico (Simulazione)
```bash
# Invia 150 richieste simultanee (supera limite di 100 in coda)
for i in {1..150}; do
  curl -X POST https://your-app.vercel.app/api/assistants/threads/THREAD_ID/messages \
    -H "Content-Type: application/json" \
    -d '{"content": "Test '$i'"}' &
done

# Risultato atteso:
# - Prime 120 richieste: 200 OK
# - Rimanenti 30: 503 "Sistema sovraccarico"
```

### Test 3: Health Check
```bash
# Check stato
curl https://your-app.vercel.app/api/health | jq

# Risultato atteso: JSON con stato sistema
```

---

## 🆘 Troubleshooting

### Problema: "Sistema sovraccarico" anche con pochi utenti

**Causa**: Parametri troppo restrittivi.

**Soluzione**: Aumenta limiti in `app/lib/openai-queue.ts`:
```typescript
private readonly MAX_CONCURRENT = 30; // Era 20
private readonly MAX_QUEUE_SIZE = 150; // Era 100
```

### Problema: Timeout frequenti

**Causa 1**: OpenAI API lenta (modello GPT-4-turbo).
**Soluzione**: Usa GPT-4o (più veloce) o aumenta timeout.

**Causa 2**: Timeout troppo aggressivo.
**Soluzione**: Aumenta timeout in `openai-queue.ts`:
```typescript
private readonly REQUEST_TIMEOUT = 25000; // 25 secondi
```

E in `messages/route.ts`:
```typescript
export const maxDuration = 25; // 25 secondi
```

### Problema: Rate limit OpenAI (429)

**Causa**: Troppi token/min consumati.

**Soluzione**: Riduci `MAX_CONCURRENT`:
```typescript
private readonly MAX_CONCURRENT = 10; // Era 20
```

---

## 📞 Supporto

Per problemi o domande:
- Email: hello@nabecreation.com
- GitHub Issues: [link al repo]

---

**Ultima modifica**: 2025-10-23
**Versione**: 1.0.0
