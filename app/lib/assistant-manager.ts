// 📁 app/lib/assistant-manager.ts
// UNICO punto di controllo per gli assistenti OpenAI Nabè

import { openai } from "@/app/openai";

// ⚙️ CONFIGURAZIONE CENTRALIZZATA - UNICA FONTE DI VERITÀ
export const ASSISTANT_CONFIG = {
  model: "gpt-4-turbo-preview",
  name: "Nabè - Consulente Letti Evolutivi",
  
  // 📝 ISTRUZIONI DEFINITIVE - MANTENERE SEMPRE AGGIORNATE QUI
  instructions: `
Ruolo: Sei l'assistente virtuale ufficiale di Nabè dedicato ai letti evolutivi e accessori Montessori.

🎯 SALUTO INIZIALE:
- PRIMO messaggio ASSOLUTO: "Gentile cliente, sono l'assistente di Nabè..."
- TUTTI i messaggi successivi: sempre "tu" (MAI più "Gentile cliente")

📝 GRAMMATICA ITALIANA PERFETTA:
- Frasi complete con soggetti sempre presenti
- CORRETTO: "Ti consiglio IL LETTO zero+ Dream per ottenere..."
- SBAGLIATO: "Ti consiglio per avere..." (manca soggetto)
- Costruzioni grammaticali sempre complete e corrette

⭐ GRASSETTO OBBLIGATORIO per:
- **Età bambini** (esempio: **3 anni**, **dai 6 anni in poi**)
- **Dimensioni letti** (esempio: **190x80cm**, **rialza di 23cm**)
- **Caratteristiche chiave** (esempio: **evolutivo**, **Montessori**, **legno massello**)
- **Benefici principali** (esempio: **autonomia**, **sicurezza**, **qualità artigianale**)
- **Nomi prodotti** (esempio: **zero+ Dream**, **kit piedOni**, **cassettone estraibile**)
- **Prezzi e offerte** (esempio: **da €590**, **in omaggio**, **senza costi aggiuntivi**)

🛍️ PRODOTTI AUTOMATICI (OBBLIGATORIO):
Quando consigli qualsiasi prodotto Nabè, inserisci SEMPRE la riga:
[PRODOTTO: handle-prodotto]

HANDLE PRODOTTI CORRETTI E SINCRONIZZATI:

🛏️ LETTI EVOLUTIVI:
- zero+ Earth: [PRODOTTO: letto-zeropiu-earth-con-kit-piedini-omaggio]
- zero+ Dream: [PRODOTTO: letto-montessori-casetta-baldacchino-zeropiu]
- zero+ Fun: [PRODOTTO: letto-evolutivo-fun]
- zero+ Family: [PRODOTTO: letto-montessori-evolutivo-zeropiu-family]
- zero+ Duo: [PRODOTTO: letto-castello-evolutivo-zeropiu-duo]
- zero+ Up: [PRODOTTO: letto-a-soppalco-zeropiu-up]

🔧 ACCESSORI:
- Sponde: [PRODOTTO: kit-sponde-di-sicurezza-per-letto-zeropiu]
- Kit piedOni: [PRODOTTO: kit-piedoni-zeropiu]
- Cassettone: [PRODOTTO: cassettone-estraibile-letto-zeropiu]

💤 COMFORT E RIPOSO:
- Materasso: [PRODOTTO: materasso-evolutivo-letto-zeropiu]
- Cuscini Camomilla: [PRODOTTO: coppia-cuscini-zeropiu-camomilla]
- Cuscini Plin: [PRODOTTO: coppia-cuscini-zeropiu-plin]

💬 TONO: Italiano caloroso, motivazionale, professionale. Concentrati su **evolutività**, **autonomia bambini**, **qualità artigianale toscana**.

📐 FORMATO RISPOSTA:
- Solo paragrafi, mai elenchi puntati
- Ogni paragrafo inizia con **concetto chiave in grassetto**
- Massimo 6-7 frasi per paragrafo

🚫 DIVIETI ASSOLUTI:
- NO citazioni esterne tipo 【4:0†file】 o simili
- NO riferimenti a documenti o knowledge base
- NO annotazioni numeriche tipo [1], [2], etc.
- SOLO informazioni sui prodotti Nabè che conosci direttamente

📏 LINEE GUIDA PRODOTTO:
- **190x80cm**: ideale per bambini **dai 2 ai 6 anni**
- **160x80cm**: perfetto per **camerette compatte**
- **190x120cm**: consigliato **dai 6 anni in poi** o co-sleeping
- **Sponde complete**: **da 1 a 3 anni**
- **Sponde metà superiore**: **da 3 a 5 anni**
- **Solo testiera/pediera**: **dai 5 anni in poi**
- **Kit piedOni**: **alza il letto di 23cm**

Ogni risposta deve terminare con un invito empatico a ricontattare per dubbi o supporto.
  `.trim(),

  // 🛠️ CONFIGURAZIONE SICURA - ZERO TOOLS PER EVITARE CITAZIONI
  tools: [],
  tool_resources: {}
};

// 🏭 CLASSE MANAGER UNICA - GESTIONE SICURA DEGLI ASSISTENTI
export class AssistantManager {
  
  // ✨ CREA NUOVO ASSISTENTE
  static async create(): Promise<{success: boolean, assistantId?: string, error?: string}> {
    try {
      console.log("🚀 Creando nuovo assistente Nabè con configurazione sicura...");
      
      const assistant = await openai.beta.assistants.create({
        ...ASSISTANT_CONFIG
      });
      
      console.log("✅ Assistente creato con successo:", assistant.id);
      return { 
        success: true, 
        assistantId: assistant.id 
      };
      
    } catch (error) {
      console.error("❌ Errore creazione assistente:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Errore sconosciuto'
      };
    }
  }
  
  // 🔄 AGGIORNA ASSISTENTE ESISTENTE
  static async update(assistantId: string): Promise<{success: boolean, assistantId?: string, error?: string}> {
    try {
      if (!assistantId) {
        throw new Error("ID assistente richiesto");
      }
      
      console.log("🔄 Aggiornando assistente:", assistantId);
      
      const assistant = await openai.beta.assistants.update(assistantId, {
        ...ASSISTANT_CONFIG
      });
      
      console.log("✅ Assistente aggiornato con successo!");
      return { 
        success: true, 
        assistantId: assistant.id 
      };
      
    } catch (error) {
      console.error("❌ Errore aggiornamento assistente:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Errore sconosciuto'
      };
    }
  }
  
  // 📋 OTTIENI INFO ASSISTENTE
  static async getInfo(assistantId: string): Promise<{success: boolean, assistant?: any, error?: string}> {
    try {
      if (!assistantId) {
        throw new Error("ID assistente richiesto");
      }
      
      const assistant = await openai.beta.assistants.retrieve(assistantId);
      return { 
        success: true, 
        assistant: {
          id: assistant.id,
          name: assistant.name,
          model: assistant.model,
          created_at: assistant.created_at,
          tools: assistant.tools,
          instructions: assistant.instructions?.substring(0, 200) + '...' // Anteprima
        }
      };
    } catch (error) {
      console.error("❌ Errore recupero info assistente:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Errore sconosciuto'
      };
    }
  }
  
  // 🗑️ ELIMINA ASSISTENTE (CON SICUREZZA)
  static async delete(assistantId: string): Promise<{success: boolean, error?: string}> {
    try {
      if (!assistantId) {
        throw new Error("ID assistente richiesto");
      }
      
      console.log("🗑️ Eliminando assistente:", assistantId);
      await openai.beta.assistants.del(assistantId);
      console.log("✅ Assistente eliminato con successo");
      
      return { success: true };
    } catch (error) {
      console.error("❌ Errore eliminazione assistente:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Errore sconosciuto'
      };
    }
  }
  
  // 🔍 LISTA TUTTI GLI ASSISTENTI (UTILITY)
  static async listAll(): Promise<{success: boolean, assistants?: any[], error?: string}> {
    try {
      const assistants = await openai.beta.assistants.list({
        limit: 20
      });
      
      return {
        success: true,
        assistants: assistants.data.map(a => ({
          id: a.id,
          name: a.name,
          model: a.model,
          created_at: a.created_at
        }))
      };
    } catch (error) {
      console.error("❌ Errore lista assistenti:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Errore sconosciuto'
      };
    }
  }
}

// 🛡️ VALIDAZIONE SICUREZZA
export function validateAssistantId(id: string): boolean {
  return /^asst_[a-zA-Z0-9]{24}$/.test(id);
}

// 📝 TYPE DEFINITIONS
export interface AssistantResponse {
  success: boolean;
  assistantId?: string;
  assistant?: any;
  assistants?: any[];
  error?: string;
}

export type AssistantAction = 'create' | 'update' | 'info' | 'delete' | 'list';