# ⚡ Setup Rapido per Tier 1 (500 RPM)

## 🎯 Configurazione Immediata

### 1️⃣ Su Vercel Dashboard

1. Vai su https://vercel.com/dashboard → **il tuo progetto**
2. Click su **Settings** → **Environment Variables**
3. Aggiungi queste 3 variabili:

```
OPENAI_QUEUE_MAX_CONCURRENT = 8
OPENAI_QUEUE_MAX_SIZE = 80
OPENAI_QUEUE_MIN_DELAY = 150
```

4. Click **Save**

### 2️⃣ Redeploy

1. Vai su **Deployments**
2. Click sui **3 puntini** dell'ultimo deployment
3. Click **Redeploy**
4. Attendi 2-3 minuti

### 3️⃣ Verifica

```bash
curl https://your-app.vercel.app/api/health | jq

# Output atteso:
{
  "queue": {
    "maxConcurrent": 8,     # ← Deve essere 8
    "maxQueueSize": 80,     # ← Deve essere 80
    "requestDelay": 150     # ← Deve essere 150
  }
}
```

---

## ✅ Risultato

Con questa configurazione gestisci **~80-100 utenti simultanei** stabilmente.

---

## 📈 Per Arrivare a 200 Utenti

### Devi fare upgrade a Tier 2 o 3:

| Tier | Spesa Richiesta | Config | Capacità |
|------|-----------------|--------|----------|
| Tier 1 (attuale) | $5+ | 8 / 80 / 150 | ~80-100 utenti |
| **Tier 2** | **$50+** | **12 / 200 / 100** | **~200 utenti** ✅ |
| Tier 3 | $100+ | 20 / 250 / 50 | ~270 utenti |

### Come fare upgrade:

1. Usa l'API normalmente
2. Monitora spesa su https://platform.openai.com/usage
3. Quando raggiungi $50 spesi → Tier 2 automatico (24-48h)
4. **Riconfigura env variables per Tier 2**:
   ```
   OPENAI_QUEUE_MAX_CONCURRENT = 12
   OPENAI_QUEUE_MAX_SIZE = 200
   OPENAI_QUEUE_MIN_DELAY = 100
   ```
5. Redeploy

---

## 🚨 IMPORTANTE

**NON aumentare** `MAX_CONCURRENT` oltre 8 finché sei su Tier 1!

Se metti 20 con Tier 1:
- ❌ Errori 429 (Rate Limit)
- ❌ Utenti vedono "Riprova tra 30 secondi"
- ❌ Sistema instabile

---

## 📚 Guide Complete

- **TIER1_OPTIMIZATION_GPT4O.md**: Guida completa Tier 1
- **SCALING_TO_200_USERS.md**: Come scalare a 200+ utenti
- **QUICK_START_200_USERS.md**: Setup rapido per ogni tier

---

**Fatto! Ora gestisci ~80-100 utenti stabilmente con Tier 1.** 🚀
