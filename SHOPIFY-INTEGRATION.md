# Integrazione Widget Chatbot Nabè in Shopify

## 📋 Panoramica

Questo widget include due modalità di visualizzazione:
- **Desktop**: Pulsante tradizionale da inserire nelle pagine prodotto
- **Mobile**: Linguetta interattiva con domande predefinite che:
  - Si posiziona in basso a sinistra
  - Occupa il 60% della larghezza dello schermo
  - Si nasconde scrollando verso il basso
  - Riappare scrollando verso l'alto
  - Contiene domande swipabili

## 🚀 Installazione

### Passo 1: Aprire il file theme.liquid

1. Dal pannello admin di Shopify, vai su: **Online Store** → **Themes**
2. Clicca su **Actions** → **Edit code**
3. Cerca e apri il file `theme.liquid` nella barra laterale sinistra

### Passo 2: Inserire il codice del widget

Copia tutto il contenuto del file `shopify-widget-mobile.liquid` e incollalo **prima del tag `</body>`** nel file `theme.liquid`.

```liquid
    <!-- ... altro codice del tema ... -->

    <!-- WIDGET CHATBOT NABÈ -->
    [Incolla qui tutto il codice da shopify-widget-mobile.liquid]

  </body>
</html>
```

### Passo 3: Aggiungere il pulsante nelle pagine prodotto (Opzionale per Desktop)

Per mostrare il pulsante nelle pagine prodotto su desktop:

1. Apri il file della pagina prodotto (solitamente `product-template.liquid` o `main-product.liquid`)
2. Inserisci questo codice dove vuoi che appaia il pulsante:

```liquid
<button class="nabe-chatbot-button" onclick="openNabeChatbot()">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 12H16M8 8H16M8 16H12M7.8 21H16.2C17.8802 21 18.7202 21 19.362 20.673C19.9265 20.3854 20.3854 19.9265 20.673 19.362C21 18.7202 21 17.8802 21 16.2V7.8C21 6.11984 21 5.27976 20.673 4.63803C20.3854 4.07354 19.9265 3.6146 19.362 3.32698C18.7202 3 17.8802 3 16.2 3H7.8C6.11984 3 5.27976 3 4.63803 3.32698C4.07354 3.6146 3.6146 4.07354 3.32698 4.63803C3 5.27976 3 6.11984 3 7.8V16.2C3 17.8802 3 18.7202 3.32698 19.362C3.6146 19.9265 4.07354 20.3854 4.63803 20.673C5.27976 21 6.11984 21 7.8 21Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    Chiedi consiglio al nostro esperto AI
</button>
```

## 🎨 Personalizzazione

### Modificare le domande predefinite

Nel file `shopify-widget-mobile.liquid`, cerca la sezione `<!-- LINGUETTA MOBILE CON DOMANDE -->` e modifica le card:

```html
<div class="nabe-question-card" onclick="openNabeChatbotWithQuestion('La tua domanda qui')">
    <div class="nabe-question-icon">🎯</div>
    <div class="nabe-question-text">Testo breve della domanda</div>
</div>
```

**Emoji consigliate per le domande:**
- 👶 Bambini
- 🌿 Materiali/Natura
- 📦 Spedizioni
- 🎨 Personalizzazione
- ✅ Garanzia
- 📏 Dimensioni
- 💰 Prezzi
- ❓ Domande generali

### Modificare i colori

Cerca le variabili colore nel CSS e modificale:

```css
/* Colore principale del brand */
background: linear-gradient(135deg, #79aea3, #5a9d8f);

/* Cambia con i tuoi colori */
background: linear-gradient(135deg, #TUO_COLORE_1, #TUO_COLORE_2);
```

### Modificare la larghezza della linguetta mobile

Nel CSS, cerca `.nabe-mobile-tab` e modifica il `width`:

```css
.nabe-mobile-tab {
    width: 60%; /* Cambia questa percentuale (es. 70%, 50%) */
}
```

### Modificare la soglia di scroll

Nel JavaScript, cerca `handleMobileTabScroll()` e modifica il valore:

```javascript
if (scrollDirection === 'down' && scrollTop > 100) { // Cambia 100 con il valore desiderato
    mobileTab.classList.add('hidden');
}
```

## 🔧 Configurazione Avanzata

### Passaggio parametri al chatbot

Il widget passa automaticamente:
- Nome prodotto corrente
- Prezzo prodotto
- Domanda selezionata (se cliccata dalla linguetta)

Questi parametri sono disponibili nell'URL come query params:
```
https://your-chatbot.vercel.app?product=Nome+Prodotto&price=€99&question=Domanda+selezionata
```

### Integrazione con l'iframe del chatbot

Per ricevere la domanda nell'iframe del chatbot, aggiungi questo codice nel tuo componente React:

```javascript
useEffect(() => {
  const handleMessage = (event) => {
    if (event.data.type === 'SET_INITIAL_MESSAGE') {
      // Imposta il messaggio iniziale nella chat
      setInitialMessage(event.data.message);
    }
  };

  window.addEventListener('message', handleMessage);
  return () => window.removeEventListener('message', handleMessage);
}, []);
```

## 📱 Comportamento Responsive

| Dispositivo | Comportamento |
|-------------|--------------|
| **Mobile** (< 768px) | Mostra linguetta con domande, nasconde pulsante desktop |
| **Tablet/Desktop** (> 768px) | Mostra pulsante tradizionale, nasconde linguetta mobile |

## 🎯 Funzionalità

### Linguetta Mobile
- ✅ Posizionamento fisso in basso a sinistra
- ✅ Larghezza 60% dello schermo
- ✅ Si nasconde scrollando giù
- ✅ Riappare scrollando su
- ✅ Domande swipabili orizzontalmente
- ✅ Animazioni fluide
- ✅ Hint visivo per lo swipe

### Modal Chatbot
- ✅ Fullscreen su mobile
- ✅ Finestra centrata su desktop
- ✅ Loading spinner durante il caricamento
- ✅ Chiusura con ESC o click fuori
- ✅ Blocco scroll della pagina quando aperto

## 🐛 Troubleshooting

### La linguetta non appare su mobile
- Verifica che la larghezza dello schermo sia < 768px
- Controlla la console per eventuali errori JavaScript
- Assicurati che il codice sia inserito prima di `</body>`

### Le domande non sono swipabili
- Verifica che la funzione `initializeSwipe()` sia stata caricata
- Controlla che non ci siano conflitti con altri script

### Il chatbot non si apre
- Verifica che l'URL del chatbot sia corretto
- Controlla la console per errori CORS
- Assicurati che l'iframe abbia i permessi corretti

### La linguetta non si nasconde scrollando
- Verifica che non ci siano conflitti con altri listener di scroll
- Controlla che la funzione throttle funzioni correttamente

## 📊 Analytics

Il widget traccia automaticamente l'apertura del chatbot con Google Analytics (se configurato):

```javascript
gtag('event', 'chatbot_open', {
    'event_category': 'engagement',
    'event_label': 'quick_question' // o 'manual_open'
});
```

## 🔒 Sicurezza

- Il widget non raccoglie dati personali
- Tutti i dati passati al chatbot sono visibili nell'URL
- L'iframe è configurato con permessi limitati

## 📞 Supporto

Per problemi o domande:
1. Controlla la console del browser per errori
2. Verifica che tutte le funzioni siano caricate correttamente
3. Testa su dispositivi mobili reali, non solo emulatori

## 🚀 Prossimi Sviluppi

Funzionalità pianificate:
- [ ] Personalizzazione dinamica delle domande tramite metafields Shopify
- [ ] Supporto multilingua
- [ ] Integrazione con Shopify Analytics
- [ ] A/B testing delle domande più efficaci
- [ ] Widget per altre pagine (carrello, checkout, ecc.)
