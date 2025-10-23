# 🚀 Scaling a 200 Utenti Simultanei - Guida Completa

## 🎯 Obiettivo
Configurare il sistema per gestire **200 utenti che inviano messaggi contemporaneamente** senza errori.

---

## 📊 Calcoli Necessari

### Formula Capacità Utenti
```
Capacità = MAX_CONCURRENT + MAX_QUEUE_SIZE

Esempio attuale:
5 (processing) + 100 (queue) = 105 utenti max
```

### Formula Throughput OpenAI
```
Throughput = MAX_CONCURRENT × (1000ms / MIN_REQUEST_DELAY) × 60

Esempio con MAX_CONCURRENT=5, DELAY=200ms:
5 × (1000/200) × 60 = 5 × 5 × 60 = 1,500 req/min
```

---

## 🔧 Configurazioni per Tier OpenAI

### **Tier 1 (500 RPM)** - ❌ NON sufficiente per 200 utenti

**Limiti**: 500 requests/min
**Capacità max**: ~50-100 utenti con attesa in coda
**Problema**: Con 200 utenti, 100+ verranno rifiutati

**Configurazione ottimale** (già implementata):
```typescript
// app/lib/openai-queue.ts
private readonly MAX_CONCURRENT = 5;
private readonly MAX_QUEUE_SIZE = 100;
private readonly MIN_REQUEST_DELAY = 200;
```

**Throughput**: 1,500 req/min (MA OpenAI accetta solo 500 RPM)
**Utenti simultanei**: ~105 (poi sovraccarico)

**Soluzione**: Upgrade a Tier 2 o 3

---

### **Tier 2 (5,000 RPM)** - ⚠️ Borderline per 200 utenti

**Limiti**: 5,000 requests/min
**Capacità reale**: ~150-180 utenti con buona gestione coda

**Configurazione consigliata**:
```typescript
// app/lib/openai-queue.ts
private readonly MAX_CONCURRENT = 12;
private readonly MAX_QUEUE_SIZE = 200;
private readonly MIN_REQUEST_DELAY = 100;
```

**Throughput**: 12 × (1000/100) × 60 = 7,200 req/min
**MA**: Con retry e variabilità, mediamente ~4,000 req/min → OK per Tier 2

**Utenti simultanei**: 12 + 200 = **212 utenti** ✅

**Nota**: Funziona se non tutti i 200 utenti inviano messaggi ogni secondo.

---

### **Tier 3+ (10,000 RPM)** - ✅ IDEALE per 200+ utenti

**Limiti**: 10,000 requests/min
**Capacità reale**: 200-300+ utenti con margine di sicurezza

**Configurazione consigliata**:
```typescript
// app/lib/openai-queue.ts
private readonly MAX_CONCURRENT = 20;
private readonly MAX_QUEUE_SIZE = 250;
private readonly MIN_REQUEST_DELAY = 50;
```

**Throughput**: 20 × (1000/50) × 60 = 24,000 req/min burst
**Mediamente**: ~8,000 req/min sostenuto → OK per Tier 3

**Utenti simultanei**: 20 + 250 = **270 utenti** ✅

**Vantaggio**: Margine del 35% per gestire spike

---

### **Tier 4+ (10,000+ RPM)** - 🚀 Enterprise

**Limiti**: 10,000+ requests/min (custom)
**Capacità**: Illimitata praticamente

**Configurazione aggressiva**:
```typescript
private readonly MAX_CONCURRENT = 30;
private readonly MAX_QUEUE_SIZE = 300;
private readonly MIN_REQUEST_DELAY = 30;
```

**Utenti simultanei**: 330+ ✅

---

## 🛠️ Come Applicare le Modifiche

### 1. **Verifica il Tuo Tier OpenAI**
```bash
# Vai su OpenAI Dashboard
https://platform.openai.com/settings/organization/limits

# Oppure via API
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### 2. **Scegli la Configurazione Appropriata**

Modifica `app/lib/openai-queue.ts` in base al tuo tier (vedi tabelle sopra).

### 3. **Esempio: Configurazione per Tier 3 (10K RPM)**

```typescript
// app/lib/openai-queue.ts (linee 38-47)

class OpenAIQueue {
  private queue: QueueItem<any>[] = [];
  private processing = 0;
  private lastRequestTime = 0;

  // ⚙️ Configurazione per OpenAI Tier 3+ (10K RPM, 200+ utenti)
  private readonly MAX_CONCURRENT = 20;    // ← Aumentato da 5
  private readonly MAX_QUEUE_SIZE = 250;   // ← Aumentato da 100
  private readonly REQUEST_TIMEOUT = 15000;
  private readonly MIN_REQUEST_DELAY = 50; // ← Ridotto da 200ms
  private readonly MAX_RETRIES = 3;
  private readonly INITIAL_RETRY_DELAY = 1000;
}
```

### 4. **Commit e Deploy**

```bash
git add app/lib/openai-queue.ts
git commit -m "scale: configure for Tier 3 - 200+ concurrent users"
git push origin main

# Vercel deploierà automaticamente
```

### 5. **Verifica Deploy**

```bash
# Attendi 2-3 minuti, poi verifica
curl https://your-app.vercel.app/api/health | jq

# Output atteso:
{
  "queue": {
    "maxConcurrent": 20,   # ← Dovrebbe essere 20 ora
    "maxQueueSize": 250,   # ← Dovrebbe essere 250
    "requestDelay": 50     # ← Dovrebbe essere 50
  }
}
```

---

## 📊 Tabella Riepilogativa

| Tier | RPM | MAX_CONCURRENT | QUEUE_SIZE | DELAY | Capacità | Costo/mese |
|------|-----|----------------|------------|-------|----------|------------|
| Tier 1 | 500 | 5 | 100 | 200ms | 105 utenti | $5+ |
| Tier 2 | 5K | 12 | 200 | 100ms | 212 utenti | $50+ |
| **Tier 3** | **10K** | **20** | **250** | **50ms** | **270 utenti** ✅ | **$100+** |
| Tier 4+ | 10K+ | 30 | 300 | 30ms | 330+ utenti | $250+ |

---

## 🧪 Test di Carico

### Script per Simulare 200 Utenti

```bash
#!/bin/bash
# test-200-users.sh

ENDPOINT="https://your-app.vercel.app/api/assistants/threads"
SUCCESS=0
FAILED=0

echo "Creating 200 threads simultaneously..."

for i in {1..200}; do
  (
    RESPONSE=$(curl -s -w "%{http_code}" -X POST "$ENDPOINT" -H "Content-Type: application/json")
    HTTP_CODE=$(echo "$RESPONSE" | tail -c 4)

    if [ "$HTTP_CODE" = "200" ]; then
      echo "[$i] ✅ Success"
      ((SUCCESS++))
    else
      echo "[$i] ❌ Failed (HTTP $HTTP_CODE)"
      ((FAILED++))
    fi
  ) &
done

wait

echo ""
echo "Results:"
echo "✅ Success: $SUCCESS"
echo "❌ Failed: $FAILED"
echo "Success rate: $(echo "scale=2; $SUCCESS * 100 / 200" | bc)%"
```

**Come usare**:
```bash
chmod +x test-200-users.sh
./test-200-users.sh
```

**Risultati attesi**:
- **Tier 1** (5 concurrent): ~50% success (100/200)
- **Tier 2** (12 concurrent): ~85% success (170/200)
- **Tier 3** (20 concurrent): ~95%+ success (190+/200) ✅

---

## ⚡ Ottimizzazioni Avanzate

### 1. **Usa Modello Più Veloce**

GPT-4o è **3x più veloce** di GPT-4-turbo:

```typescript
// app/lib/assistant-manager.ts
const assistant = await openai.beta.assistants.create({
  model: "gpt-4o",  // ← Invece di "gpt-4-turbo-preview"
  // ...
});
```

**Beneficio**: Meno tempo di elaborazione = più throughput

### 2. **Connection Pooling**

OpenAI SDK usa http agent. Ottimizza:

```typescript
// app/openai.ts
import OpenAI from "openai";
import { Agent } from "https";

export const openai = new OpenAI({
  httpAgent: new Agent({
    keepAlive: true,
    maxSockets: 50,  // ← Più socket = più concurrent
  }),
});
```

### 3. **Caching Risposte Comuni**

Se molti utenti fanno domande simili:

```typescript
// app/lib/response-cache.ts
const cache = new Map<string, string>();

export function getCachedResponse(question: string): string | null {
  const normalized = question.toLowerCase().trim();
  return cache.get(normalized) || null;
}

export function setCachedResponse(question: string, response: string) {
  const normalized = question.toLowerCase().trim();
  cache.set(normalized, response);
}
```

---

## 🚨 Monitoraggio

### Dashboard Metriche

Aggiungi endpoint per metriche:

```typescript
// app/api/metrics/route.ts
import { openaiQueue } from "@/app/lib/openai-queue";

export async function GET() {
  const stats = openaiQueue.getStats();

  return Response.json({
    timestamp: new Date().toISOString(),
    queue: stats,
    health: {
      status: stats.isOverloaded ? "degraded" : "healthy",
      capacity: `${stats.queueSize + stats.processing}/${stats.maxConcurrent + stats.maxQueueSize}`,
      utilizationPercent: Math.round(
        ((stats.queueSize + stats.processing) / (stats.maxConcurrent + stats.maxQueueSize)) * 100
      ),
    },
  });
}
```

### Alert Automatici

```bash
# monitor-alerts.sh
while true; do
  UTIL=$(curl -s https://your-app.vercel.app/api/health | jq -r '.queue.utilization')

  if [ "$UTIL" -gt 80 ]; then
    echo "🚨 ALERT: Queue utilization at $UTIL%"
    # Invia notifica (Slack, email, etc.)
  fi

  sleep 10
done
```

---

## ✅ Checklist Finale

Prima di andare in produzione con 200 utenti:

- [ ] Verificato tier OpenAI (dovrebbe essere Tier 3+ per 200 utenti)
- [ ] Configurato MAX_CONCURRENT appropriato (20 per Tier 3)
- [ ] Configurato MAX_QUEUE_SIZE appropriato (250 per Tier 3)
- [ ] Ridotto MIN_REQUEST_DELAY (50ms per Tier 3)
- [ ] Deployato su Vercel
- [ ] Verificato `/api/health` mostra nuovi valori
- [ ] Testato con script test-200-users.sh
- [ ] Success rate >90%
- [ ] Monitorato OpenAI dashboard (usage <70% del limite)
- [ ] Setup monitoring continuo

---

## 🆘 Troubleshooting

### "Ancora errori 429 con Tier 3"

**Causa**: MAX_CONCURRENT ancora troppo alto per il tuo uso reale.

**Soluzione**: Riduci gradualmente:
```typescript
private readonly MAX_CONCURRENT = 15; // Prova 15 invece di 20
```

### "Queue sempre piena (utilization >90%)"

**Causa**: Troppi utenti per la configurazione attuale.

**Soluzioni**:
1. Aumenta MAX_QUEUE_SIZE a 300
2. Aumenta MAX_CONCURRENT (se hai margine nel tier)
3. Upgrade tier OpenAI

### "Success rate solo 70% con 200 utenti"

**Causa**: Configurazione non abbastanza aggressiva.

**Soluzione**: Se hai Tier 3+:
```typescript
private readonly MAX_CONCURRENT = 25;
private readonly MAX_QUEUE_SIZE = 300;
```

---

## 💰 Costi Stimati

| Tier | Spesa Minima | Costo/1K req | 200 utenti/giorno | Costo/mese |
|------|-------------|--------------|-------------------|------------|
| Tier 1 | $5 | $0.03 | ~6K req/giorno | ~$15-20 |
| Tier 2 | $50 | $0.03 | ~6K req/giorno | ~$15-20 |
| **Tier 3** | **$100** | **$0.03** | **~6K req/giorno** | **~$15-20** |

**Nota**: Il costo per request è uguale. Paghi il tier per avere **limiti più alti**, non per pagare meno per request.

---

## 🎯 Raccomandazione Finale

Per **200 utenti simultanei**:

1. ✅ **Upgrade a OpenAI Tier 3** ($100+ spesi)
2. ✅ **Configura MAX_CONCURRENT = 20**
3. ✅ **Configura MAX_QUEUE_SIZE = 250**
4. ✅ **Configura MIN_REQUEST_DELAY = 50ms**
5. ✅ **Testa con script di carico**
6. ✅ **Monitora costantemente**

Con questa configurazione gestirai **270 utenti simultanei** con margine di sicurezza. 🚀

---

**Ultima modifica**: 2025-10-23
**Versione**: 1.0.0
