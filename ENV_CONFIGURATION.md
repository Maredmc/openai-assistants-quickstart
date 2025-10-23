# 🔧 Environment Variables Configuration

## OpenAI Queue Settings

Configura questi valori su **Vercel Dashboard** → Settings → Environment Variables

### Per Tier 1 (500 RPM) - Max ~100 utenti

```
OPENAI_QUEUE_MAX_CONCURRENT=5
OPENAI_QUEUE_MAX_SIZE=100
OPENAI_QUEUE_MIN_DELAY=200
```

### Per Tier 2 (5K RPM) - Max ~200 utenti

```
OPENAI_QUEUE_MAX_CONCURRENT=12
OPENAI_QUEUE_MAX_SIZE=200
OPENAI_QUEUE_MIN_DELAY=100
```

### Per Tier 3+ (10K RPM) - 200+ utenti ✅ (DEFAULT)

```
OPENAI_QUEUE_MAX_CONCURRENT=20
OPENAI_QUEUE_MAX_SIZE=250
OPENAI_QUEUE_MIN_DELAY=50
```

## Come Applicare su Vercel

1. Vai su https://vercel.com/dashboard
2. Seleziona il progetto "openai-assistants-quickstart"
3. Vai su **Settings** → **Environment Variables**
4. Aggiungi/Modifica le 3 variabili sopra in base al tuo tier OpenAI
5. **Redeploy** il progetto (vai su Deployments → Redeploy)

## Come Testare in Locale

Crea file `.env.local`:

```bash
# .env.local
OPENAI_API_KEY=sk-...
OPENAI_QUEUE_MAX_CONCURRENT=20
OPENAI_QUEUE_MAX_SIZE=250
OPENAI_QUEUE_MIN_DELAY=50
```

Poi:
```bash
npm run dev
curl http://localhost:3000/api/health | jq
```

Dovresti vedere:
```json
{
  "queue": {
    "maxConcurrent": 20,
    "maxQueueSize": 250
  }
}
```
