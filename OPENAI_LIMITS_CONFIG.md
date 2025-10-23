# ⚙️ Configurazione Limiti OpenAI - Guida Completa

## 🎯 Problema Risolto

**Problema originale**: Con 100+ utenti, il sistema superava i limiti di rate di OpenAI API causando:
- ❌ Errori 429 (Rate Limit Exceeded)
- ❌ Richieste che fallivano silenziosamente
- ❌ Utenti bloccati "a pensare" indefinitamente

**Soluzione implementata**:
- ✅ Ridotto concurrent requests da 20 → **5**
- ✅ Aggiunto delay di **200ms tra richieste**
- ✅ **Retry automatico** con exponential backoff (1s, 2s, 4s)
- ✅ Messaggi chiari all'utente su rate limit

---

## 📊 Limiti OpenAI per Tier

OpenAI ha limiti diversi in base al tier del tuo account:

| Tier | Spesa Minima | RPM (Requests/Min) | TPM (Tokens/Min) | Concurrent | Consigliato per |
|------|-------------|-------------------|------------------|------------|-----------------|
| **Free** | $0 | 3 | 40,000 | 1 | ❌ Testing solo |
| **Tier 1** | $5+ | 500 | 60,000 | 50 | ⚠️ Max 10 utenti |
| **Tier 2** | $50+ | 5,000 | 1,000,000 | 100 | ✅ 50-100 utenti |
| **Tier 3** | $100+ | 10,000 | 10,000,000 | 200 | ✅ **200+ utenti** |
| **Tier 4** | $250+ | 10,000 | 10,000,000 | 500 | ✅ Enterprise |
| **Tier 5** | $1000+ | 10,000 | 10,000,000 | 2000 | ✅ High scale |

**Come verificare il tuo tier**:
1. Vai su https://platform.openai.com/settings/organization/limits
2. Controlla "Rate limits" per il tuo modello (es. GPT-4-turbo)

---

## 🔧 Configurazione Automatica

Il sistema **si adatta automaticamente** ai limiti OpenAI con questi parametri ottimizzati:

### Parametri Attuali (in `app/lib/openai-queue.ts`)

```typescript
MAX_CONCURRENT = 5        // Max 5 richieste simultanee a OpenAI
MAX_QUEUE_SIZE = 100     // Max 100 richieste in attesa
REQUEST_TIMEOUT = 15000  // 15 secondi timeout
MIN_REQUEST_DELAY = 200  // 200ms delay tra richieste
MAX_RETRIES = 3          // 3 retry per errori 429
```

### Calcolo Throughput

Con configurazione attuale:
- **5 concurrent** × 1 richiesta ogni **200ms** = ~25 req/sec burst
- Media sostenuta: ~**5 req/sec** = **300 req/min**

Questo rispetta:
- ✅ Tier 1: 500 RPM
- ✅ Tier 2: 5,000 RPM
- ✅ Tier 3+: 10,000 RPM

---

## 🎛️ Tuning per Tier Specifici

### Se hai **Tier 1** (500 RPM) - Max ~10 utenti simultanei

**Configurazione conservativa** (già implementata):
```typescript
// app/lib/openai-queue.ts
private readonly MAX_CONCURRENT = 5;
private readonly MIN_REQUEST_DELAY = 200;
```

**Throughput**: 300 req/min (60% del limite)

---

### Se hai **Tier 2** (5,000 RPM) - Max ~100 utenti simultanei

**Configurazione più aggressiva**:
```typescript
// app/lib/openai-queue.ts
private readonly MAX_CONCURRENT = 10; // Aumentato da 5
private readonly MIN_REQUEST_DELAY = 100; // Ridotto da 200ms
```

**Throughput**: ~600 req/min (12% del limite)

---

### Se hai **Tier 3+** (10,000 RPM) - **200+ utenti simultanei** ✅

**Configurazione per high load**:
```typescript
// app/lib/openai-queue.ts
private readonly MAX_CONCURRENT = 15; // Aumentato da 5
private readonly MIN_REQUEST_DELAY = 50; // Ridotto da 200ms
private readonly MAX_QUEUE_SIZE = 200; // Aumentato da 100
```

**Throughput**: ~1,200 req/min (12% del limite)

---

## 🚨 Come Capire se Stai Superando i Limiti

### 1. **Errori 429 nei Log**

Cerca nei log Vercel:
```bash
vercel logs --filter="rate limit"
vercel logs --filter="429"
```

Se vedi molti errori 429, **riduci MAX_CONCURRENT**.

### 2. **Health Check Endpoint**

Monitora la coda:
```bash
curl https://your-app.vercel.app/api/health | jq
```

Risposta normale:
```json
{
  "status": "healthy",
  "queue": {
    "size": 5,          // ← Basso = OK
    "processing": 3,
    "utilization": 5    // ← <50% = OK
  }
}
```

Risposta sovraccarico:
```json
{
  "status": "degraded",
  "queue": {
    "size": 85,         // ← Alto!
    "processing": 5,
    "utilization": 85   // ← >80% = Warning
  }
}
```

Se `utilization` > 80% costantemente → Aumenta `MAX_CONCURRENT` o upgrade OpenAI tier.

### 3. **Metriche OpenAI Dashboard**

Vai su https://platform.openai.com/usage e controlla:
- **Requests per minute** (RPM): dovrebbe essere < 70% del limite
- **Tokens per minute** (TPM): più importante per modelli grandi

---

## 🔄 Sistema di Retry

Il sistema ora **riprova automaticamente** quando OpenAI restituisce 429:

### Retry Logic
```
1. Richiesta → OpenAI risponde 429 (Rate Limit)
2. Attendi 1 secondo
3. Riprova (Attempt 1/3)
4. Ancora 429? → Attendi 2 secondi
5. Riprova (Attempt 2/3)
6. Ancora 429? → Attendi 4 secondi
7. Riprova (Attempt 3/3)
8. Ancora 429? → Errore all'utente "Riprova tra 30 secondi"
```

**Vantaggi**:
- ✅ Gestisce spike temporanei
- ✅ Massimizza successo richieste
- ✅ Non sovraccaricare ulteriormente OpenAI

---

## 📈 Raccomandazioni per 200 Utenti

### Scenario 1: **Hai Tier 1** (500 RPM)
❌ **Non sufficiente per 200 utenti**

**Soluzioni**:
1. Upgrade a Tier 2+ ($50+ spesi su OpenAI)
2. Usa un modello più economico (GPT-4o-mini invece di GPT-4-turbo)
3. Limita utenti simultanei con rate limiting più aggressivo

### Scenario 2: **Hai Tier 2** (5,000 RPM)
⚠️ **Borderline per 200 utenti**

**Configurazione**:
```typescript
MAX_CONCURRENT = 10
MIN_REQUEST_DELAY = 100
MAX_QUEUE_SIZE = 150
```

**Note**: Funziona se non tutti i 200 utenti inviano messaggi contemporaneamente.

### Scenario 3: **Hai Tier 3+** (10,000 RPM) ✅
✅ **Perfetto per 200+ utenti**

**Configurazione**:
```typescript
MAX_CONCURRENT = 15
MIN_REQUEST_DELAY = 50
MAX_QUEUE_SIZE = 200
```

---

## 🛠️ Come Modificare i Parametri

### File da modificare: `app/lib/openai-queue.ts`

```typescript
// Linee 38-47
class OpenAIQueue {
  private queue: QueueItem<any>[] = [];
  private processing = 0;
  private lastRequestTime = 0;

  // 🔧 MODIFICA QUESTI VALORI
  private readonly MAX_CONCURRENT = 5;        // ← Concurrent requests a OpenAI
  private readonly MAX_QUEUE_SIZE = 100;     // ← Max richieste in attesa
  private readonly REQUEST_TIMEOUT = 15000;  // ← Timeout per richiesta
  private readonly MIN_REQUEST_DELAY = 200;  // ← Delay tra richieste (ms)
  private readonly MAX_RETRIES = 3;          // ← Max retry per 429
  private readonly INITIAL_RETRY_DELAY = 1000; // ← Primo retry delay
}
```

### Dopo le modifiche:

1. **Commit**:
```bash
git add app/lib/openai-queue.ts
git commit -m "tune: adjust queue params for Tier X"
git push
```

2. **Deploy automatico** su Vercel

3. **Testa** con endpoint health:
```bash
curl https://your-app.vercel.app/api/health
```

---

## 📊 Monitoring Continuo

### Script Monitoring

Crea file `monitor-queue.sh`:
```bash
#!/bin/bash
while true; do
  HEALTH=$(curl -s https://your-app.vercel.app/api/health)
  UTIL=$(echo $HEALTH | jq -r '.queue.utilization')
  STATUS=$(echo $HEALTH | jq -r '.status')
  QUEUE_SIZE=$(echo $HEALTH | jq -r '.queue.size')
  PROCESSING=$(echo $HEALTH | jq -r '.queue.processing')

  echo "[$(date +'%H:%M:%S')] Status: $STATUS | Queue: $QUEUE_SIZE | Processing: $PROCESSING | Utilization: $UTIL%"

  if [ "$UTIL" -gt 80 ]; then
    echo "⚠️  WARNING: High queue utilization!"
  fi

  if [ "$STATUS" = "degraded" ]; then
    echo "🚨 ALERT: System degraded!"
  fi

  sleep 5
done
```

Rendi eseguibile ed esegui:
```bash
chmod +x monitor-queue.sh
./monitor-queue.sh
```

---

## 🔍 Troubleshooting

### Problema: "Errori 429 frequenti"

**Causa**: MAX_CONCURRENT troppo alto per il tuo tier OpenAI.

**Soluzione**: Riduci `MAX_CONCURRENT`:
```typescript
private readonly MAX_CONCURRENT = 3; // Riduci progressivamente
```

---

### Problema: "Coda sempre piena (utilization >80%)"

**Causa**: Troppe richieste per il throughput attuale.

**Soluzioni**:
1. **Aumenta MAX_CONCURRENT** (se hai tier alto):
```typescript
private readonly MAX_CONCURRENT = 10;
```

2. **Riduci MIN_REQUEST_DELAY** (se hai tier alto):
```typescript
private readonly MIN_REQUEST_DELAY = 100; // Da 200ms
```

3. **Aumenta MAX_QUEUE_SIZE**:
```typescript
private readonly MAX_QUEUE_SIZE = 200; // Da 100
```

4. **Upgrade OpenAI tier** ($50+ → Tier 2)

---

### Problema: "Utenti vedono ancora 'Sistema sovraccarico'"

**Causa**: Parametri troppo conservativi.

**Soluzione**: Incrementa capacità:
```typescript
private readonly MAX_CONCURRENT = 10;    // Da 5
private readonly MAX_QUEUE_SIZE = 150;  // Da 100
private readonly MIN_REQUEST_DELAY = 100; // Da 200
```

---

## 📞 Verifica Tier OpenAI

### Via Dashboard
1. https://platform.openai.com/settings/organization/limits
2. Cerca "Usage tier" nella sezione del modello

### Via API
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY" | jq
```

### Via Node.js
```javascript
import { openai } from './app/openai';

async function checkLimits() {
  const models = await openai.models.list();
  console.log(models);
}
```

---

## ✅ Checklist Ottimizzazione

- [ ] Verificato tier OpenAI (dovrebbe essere Tier 2+ per 200 utenti)
- [ ] Configurato MAX_CONCURRENT appropriato per tier
- [ ] Impostato MIN_REQUEST_DELAY per evitare burst
- [ ] Testato con /api/health endpoint
- [ ] Monitorato log Vercel per errori 429
- [ ] Verificato utilization coda (<80%)
- [ ] Testato con carico reale (stress test)

---

## 🎯 Configurazioni Consigliate per Tier

| Tier OpenAI | MAX_CONCURRENT | MIN_DELAY | MAX_QUEUE | Max Utenti |
|-------------|----------------|-----------|-----------|------------|
| Free (3 RPM) | 1 | 1000ms | 10 | ❌ No prod |
| Tier 1 (500 RPM) | 5 | 200ms | 100 | ~10 |
| Tier 2 (5K RPM) | 10 | 100ms | 150 | ~100 |
| **Tier 3+ (10K RPM)** | **15** | **50ms** | **200** | **200+** ✅ |

---

**Ultima modifica**: 2025-10-23
**Versione**: 2.0.0 (con rate limit handling)
