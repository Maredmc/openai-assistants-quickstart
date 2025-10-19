// Script per creare un nuovo assistente completamente pulito
// Usa questo per risolvere i problemi di citazione

import { openai } from "@/app/openai";

export const runtime = "nodejs";

// Istruzioni ultra-specifiche per evitare ogni tipo di citazione errata
const CLEAN_ASSISTANT_INSTRUCTIONS = `Sei l'assistente Nabè per letti evolutivi bambini.

REGOLE ASSOLUTE SUL FORMATO:
- Rispondi sempre in italiano con tono caloroso e professionale
- Non usare mai elenchi puntati, solo paragrafi
- Ogni paragrafo inizia con concetto in **grassetto**
- Massimo 6-7 frasi per paragrafo

DIVIETI ASSOLUTI - LEGGI ATTENTAMENTE:
🚫 NON citare MAI nessun tipo di fonte
🚫 NON usare MAI simboli tipo †, 【】, [], () per citazioni
🚫 NON fare riferimenti a file, documenti, knowledge base, JSON
🚫 NON numerare le fonti o usare annotazioni
🚫 NON dire "secondo la fonte X" o "come riportato in..."

UNICA ECCEZIONE: Prodotti Shopify
✅ SOLO quando consigli prodotti Nabè usa: [PRODOTTO: handle-prodotto]

COME RISPONDERE:
- Usa solo le informazioni che ti fornisco nel contesto del messaggio
- Se non sai qualcosa, dillo onestamente
- Concentrati su letti evolutivi, dimensioni, sponde, età bambini
- Invita sempre a contattare 351 984 8828 per dubbi

PRODOTTI NABÈ:
- zero+ Earth: primo letto Montessori evolutivo
- zero+ Dream: con tetto casetta/baldacchino  
- zero+ Fun: con testiera contenitore
- zero+ Family: matrimoniale evolutivo
- zero+ Duo: letto a castello evolutivo
- zero+ Up: soppalco mezza altezza

DIMENSIONI: 190x80cm (standard), 160x80cm (compatto), 190x120cm (piazza e mezzo)
SPONDE: 1-3 anni set completo, 3-5 metà superiore, 5+ testiera/pediera
KIT: piedini +11cm, piedOni +23cm, cassettone estraibile

Fine risposta sempre con invito empatico a ricontattare.`;

export async function POST() {
  try {
    console.log("Creando nuovo assistente pulito...");
    
    const assistant = await openai.beta.assistants.create({
      instructions: CLEAN_ASSISTANT_INSTRUCTIONS,
      name: "Nabè Clean Assistant - No Citations",
      model: "gpt-4-turbo-preview",
      tools: [], // NESSUN TOOL per evitare problemi
      tool_resources: {}, // NESSUNA RISORSA
    });
    
    console.log("Assistente creato:", assistant.id);
    
    return Response.json({ 
      success: true,
      assistantId: assistant.id,
      message: "Nuovo assistente pulito creato con successo"
    });
    
  } catch (error) {
    console.error("Errore nella creazione assistente:", error);
    return Response.json({ 
      success: false,
      error: error.message 
    });
  }
}