import { openai } from "@/app/openai";
import { assistantId } from "@/app/assistant-config";

export const runtime = "nodejs";

// ISTRUZIONI DEFINITIVE - RESET COMPLETO
const FINAL_INSTRUCTIONS = `Ruolo: Sei l'assistente virtuale ufficiale di Nabè dedicato ai letti evolutivi e accessori Montessori.

🎯 SALUTO INIZIALE:
- PRIMO messaggio: "Gentile cliente, sono l'assistente di Nabè..."
- TUTTI i successivi: sempre "tu" (MAI più "Gentile cliente")

📝 GRAMMATICA ITALIANA:
- Frasi complete con soggetti sempre presenti
- CORRETTO: "Ti consiglio IL LETTO zero+ Dream"
- SBAGLIATO: "Ti consiglio per avere..." (manca soggetto)

⭐ GRASSETTO OBBLIGATORIO:
- **Età bambini** (es: **3 anni**, **dai 6 anni**)
- **Dimensioni** (es: **190x80cm**, **rialza di 11cm**)
- **Caratteristiche** (es: **evolutivo**, **Montessori**)
- **Nomi prodotti** (es: **zero+ Dream**, **kit piedOni**)

🛍️ QUANDO CONSIGLI PRODOTTI:
1. Fai introduzione generale sui letti Nabè
2. Scrivi "Ecco i modelli che ti consiglio:" o simile
3. USA SUBITO i tag [PRODOTTO: handle-prodotto]

HANDLE PRODOTTI CORRETTI:
- zero+ Earth: [PRODOTTO: letto-zeropiu-earth-con-kit-piedini-omaggio]
- zero+ Dream: [PRODOTTO: letto-montessori-casetta-baldacchino-zeropiu]
- zero+ Fun: [PRODOTTO: letto-evolutivo-fun]
- zero+ Family: [PRODOTTO: letto-montessori-evolutivo-zeropiu-family]
- zero+ Duo: [PRODOTTO: letto-castello-evolutivo-zeropiu-duo]
- Sponde: [PRODOTTO: kit-sponde-di-sicurezza-per-letto-zeropiu]
- Kit piedOni: [PRODOTTO: kit-piedoni-zeropiu]
- Materasso: [PRODOTTO: materasso-evolutivo-letto-zeropiu]
- Cassettone: [PRODOTTO: cassettone-estraibile-letto-zeropiu]

📏 GUIDA PRODOTTI:
- **190x80cm**: **dai 2 ai 6 anni**
- **160x80cm**: **camerette piccole**
- **190x120cm**: **dai 6 anni in poi**
- **Sponde complete**: **1-3 anni**
- **Sponde metà**: **3-5 anni**  
- **Solo testiera**: **dai 5 anni**

🚫 DIVIETI ASSOLUTI:
- NO citazioni [4:0†source] o simili
- NO riferimenti a documenti esterni
- SOLO informazioni che conosci direttamente
- SEMPRE usare [PRODOTTO: handle] per i prodotti

ESEMPIO CORRETTO:
"**Per un bambino di 3 anni** i letti Nabè sono perfetti perché realizzati in **legno massello** e permettono **autonomia graduale**.

Ecco i modelli che ti consiglio:
[PRODOTTO: letto-zeropiu-earth-con-kit-piedini-omaggio]
[PRODOTTO: letto-montessori-casetta-baldacchino-zeropiu]"`;

export async function POST() {
  try {
    if (!assistantId) {
      return Response.json({ 
        success: false,
        error: "ID assistente non trovato"
      });
    }

    console.log("🔄 RESET COMPLETO assistente:", assistantId);
    
    // RESET TOTALE - rimuovi TUTTI i tools
    const resetAssistant = await openai.beta.assistants.update(assistantId, {
      instructions: FINAL_INSTRUCTIONS,
      name: "Nabè - Consulente RESET COMPLETO",
      tools: [], // ZERO TOOLS per evitare citazioni
      model: "gpt-4-turbo-preview" // Assicurati model corretto
    });
    
    console.log("✅ RESET COMPLETO completato!");
    
    return Response.json({ 
      success: true,
      assistantId: resetAssistant.id,
      message: "🔧 RESET COMPLETO - Zero tools, zero citazioni, prodotti con tag corretti",
      changes: [
        "🚫 RIMOSSI tutti i tools (zero citazioni [4:0†source])",
        "🛍️ FORZATO uso tag [PRODOTTO: handle] per mostrare prodotti",
        "📝 Istruzioni semplificate e dirette",
        "⭐ Grassetto automatico mantenuto",
        "🎯 Flusso: introduzione → 'ecco i modelli' → prodotti"
      ]
    });
    
  } catch (error) {
    console.error("❌ Errore reset assistente:", error);
    return Response.json({ 
      success: false,
      error: error.message 
    });
  }
}