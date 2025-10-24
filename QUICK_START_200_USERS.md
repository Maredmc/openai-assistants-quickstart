# ⚡ Quick Start: Configurazione per 200 Utenti Simultanei

## 🎯 In 3 Passaggi

### 1️⃣ Verifica il Tuo Tier OpenAI

Vai su: https://platform.openai.com/settings/organization/limits

Cerca "**Usage tier**" per GPT-4-turbo.

---

### 2️⃣ Configura i Parametri

**Su Vercel Dashboard**:
1. Vai su https://vercel.com/dashboard → tuo progetto
2. **Settings** → **Environment Variables**
3. Aggiungi queste variabili:

#### Se hai **Tier 1** (500 RPM):
```
OPENAI_QUEUE_MAX_CONCURRENT = 5
OPENAI_QUEUE_MAX_SIZE = 100
OPENAI_QUEUE_MIN_DELAY = 200
```
⚠️ **Capacità**: ~105 utenti (NON 200!)

---

#### Se hai **Tier 2** (5K RPM):
```
OPENAI_QUEUE_MAX_CONCURRENT = 12
OPENAI_QUEUE_MAX_SIZE = 200
OPENAI_QUEUE_MIN_DELAY = 100
```
✅ **Capacità**: ~212 utenti

---

#### Se hai **Tier 3+** (10K RPM):
```
OPENAI_QUEUE_MAX_CONCURRENT = 20
OPENAI_QUEUE_MAX_SIZE = 250
OPENAI_QUEUE_MIN_DELAY = 50
```
✅ **Capacità**: ~270 utenti (IDEALE!)

---

### 3️⃣ Redeploy e Testa

**Redeploy**:
1. Vercel Dashboard → **Deployments**
2. Clicca sui 3 puntini → **Redeploy**

**Verifica** (attendi 2-3 min):
```bash
curl https://your-app.vercel.app/api/health | jq

# Dovresti vedere:
{
  "queue": {
    "maxConcurrent": 20,  # ← Il valore che hai impostato
    "maxQueueSize": 250   # ← Il valore che hai impostato
  }
}
```

---

## ❓ FAQ Veloci

### Q: Ho Tier 1, come arrivo a 200 utenti?

**R**: Devi fare **upgrade a Tier 3**:
1. Vai su https://platform.openai.com/settings/organization/billing
2. Aggiungi credito fino a **$100+** spesi totali
3. Dopo qualche ora, il tier si aggiorna automaticamente

---

### Q: Cosa significa MAX_CONCURRENT = 20?

**R**:
- **20 richieste ATTIVE** verso OpenAI contemporaneamente
- **250 richieste IN CODA** in attesa
- **Totale = 270 utenti** possono inviare messaggi simultaneamente

**NON** significa "solo 20 utenti". Significa "20 richieste processing + 250 waiting".

---

### Q: Come testo se regge 200 utenti?

**R**: Usa questo script:

```bash
#!/bin/bash
# test-load.sh

for i in {1..200}; do
  curl -X POST https://your-app.vercel.app/api/assistants/threads \
    -H "Content-Type: application/json" &
done
wait

echo "Test completato!"
```

**Risultato atteso** (con Tier 3):
- ✅ 95%+ successo (190+ su 200)

---

### Q: Vedo ancora errori 429?

**R**:
1. Verifica tier OpenAI (deve essere Tier 3+ per 200 utenti)
2. Riduci `MAX_CONCURRENT`:
   - Su Vercel: Cambia `OPENAI_QUEUE_MAX_CONCURRENT` da 20 → 15
   - Redeploy
3. Monitora OpenAI usage dashboard

---

## 🚨 Se Hai Urgenza

**Default attuale** (dopo questo commit):
```
MAX_CONCURRENT = 20  (Tier 3+)
MAX_QUEUE_SIZE = 250
MIN_DELAY = 50ms
```

Questo è ottimizzato per **Tier 3+ (10K RPM)**.

**Se hai Tier 1/2**, DEVI cambiare le env variables su Vercel come indicato sopra.

---

## 📚 Guide Complete

- **SCALING_TO_200_USERS.md**: Guida dettagliata con formule e calcoli
- **OPENAI_LIMITS_CONFIG.md**: Configurazione limiti OpenAI
- **ENV_CONFIGURATION.md**: Setup environment variables

---

## ✅ Checklist

- [ ] Verificato tier OpenAI
- [ ] Configurato env variables su Vercel
- [ ] Fatto redeploy
- [ ] Verificato `/api/health` con curl
- [ ] Valori corretti (maxConcurrent, maxQueueSize)
- [ ] Testato con 200 richieste
- [ ] Success rate >90%

---

🎯 **Con Tier 3+ e configurazione corretta, gestirai 200+ utenti senza problemi!**
