#!/bin/bash

# 🧪 Test Script - Sistema di Coda
# Questo script testa il sistema di coda simulando carico

echo "🚀 Testing Queue System..."
echo ""

# Colori per output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# URL base (modifica se necessario)
BASE_URL="http://localhost:3000"

# Test 1: Health Check
echo -e "${YELLOW}Test 1: Health Check API${NC}"
response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health")
if [ "$response" = "200" ]; then
    echo -e "${GREEN}✅ Health check OK${NC}"
else
    echo -e "${RED}❌ Health check failed (status: $response)${NC}"
fi
echo ""

# Test 2: Queue Status API (senza userId)
echo -e "${YELLOW}Test 2: Queue Status API (dovrebbe dare errore 400)${NC}"
response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/queue/status")
if [ "$response" = "400" ]; then
    echo -e "${GREEN}✅ Validazione corretta (userId richiesto)${NC}"
else
    echo -e "${RED}❌ Expected 400, got $response${NC}"
fi
echo ""

# Test 3: Queue Status API (con userId)
echo -e "${YELLOW}Test 3: Queue Status API (con userId valido)${NC}"
response=$(curl -s "$BASE_URL/api/queue/status?userId=test-user-123")
echo "Response: $response"
if echo "$response" | grep -q "inQueue"; then
    echo -e "${GREEN}✅ API risponde correttamente${NC}"
else
    echo -e "${RED}❌ Risposta non valida${NC}"
fi
echo ""

# Test 4: Simula carico (10 richieste simultanee)
echo -e "${YELLOW}Test 4: Simulazione carico (10 richieste simultanee)${NC}"
echo "Questo test richiede che il server sia attivo e un thread esistente..."
echo "Premi CTRL+C per saltare questo test se non hai un threadId"
echo ""

# Chiedi threadId all'utente
read -p "Inserisci un threadId valido (o premi INVIO per saltare): " THREAD_ID

if [ ! -z "$THREAD_ID" ]; then
    echo "Invio 10 richieste simultanee..."
    
    for i in {1..10}; do
        (
            response=$(curl -s -o /dev/null -w "%{http_code}" \
                -X POST \
                -H "Content-Type: application/json" \
                -d "{\"content\":\"Test message $i\",\"userId\":\"test-user-$i\"}" \
                "$BASE_URL/api/assistants/threads/$THREAD_ID/messages")
            
            if [ "$response" = "200" ] || [ "$response" = "503" ]; then
                echo -e "${GREEN}✅ Richiesta $i completata (status: $response)${NC}"
            else
                echo -e "${RED}❌ Richiesta $i fallita (status: $response)${NC}"
            fi
        ) &
    done
    
    # Aspetta che tutte le richieste finiscano
    wait
    echo -e "${GREEN}Tutte le richieste completate!${NC}"
else
    echo "Test 4 saltato."
fi

echo ""
echo -e "${GREEN}🎉 Testing completato!${NC}"
echo ""
echo "📝 Note:"
echo "  - Se vedi status 503, significa che il sistema di coda sta funzionando!"
echo "  - Per test più approfonditi, usa più di 10 richieste simultanee"
echo "  - Monitora i log su console browser (F12) per vedere i messaggi della coda"
