// 📁 app/api/assistant/route.ts
// UNICO ENDPOINT SICURO PER GESTIONE ASSISTENTI

import { AssistantManager, validateAssistantId, type AssistantAction, type AssistantResponse } from "@/app/lib/assistant-manager";
import { assistantId } from "@/app/assistant-config";

export const runtime = "nodejs";

// 📨 GESTIONE POST - TUTTE LE AZIONI IN UN ENDPOINT
export async function POST(request: Request): Promise<Response> {
  try {
    // 🔍 PARSING SICURO DELLA RICHIESTA
    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ 
        success: false, 
        error: "Formato JSON non valido" 
      }, { status: 400 });
    }

    const { action, assistantId: targetId }: { action: AssistantAction, assistantId?: string } = body;
    
    // ✅ VALIDAZIONE AZIONE
    const validActions: AssistantAction[] = ['create', 'update', 'info', 'delete', 'list'];
    if (!action || !validActions.includes(action)) {
      return Response.json({ 
        success: false, 
        error: `Azione non valida. Azioni permesse: ${validActions.join(', ')}` 
      }, { status: 400 });
    }

    let result: AssistantResponse;

    // 🎯 ROUTING SICURO DELLE AZIONI
    switch (action) {
      
      case 'create':
        console.log("🚀 Richiesta creazione nuovo assistente");
        result = await AssistantManager.create();
        break;
        
      case 'update':
        const updateId = targetId || assistantId;
        if (!updateId) {
          return Response.json({ 
            success: false, 
            error: "ID assistente richiesto per l'aggiornamento" 
          }, { status: 400 });
        }
        
        if (!validateAssistantId(updateId)) {
          return Response.json({ 
            success: false, 
            error: "Formato ID assistente non valido" 
          }, { status: 400 });
        }
        
        console.log("🔄 Richiesta aggiornamento assistente:", updateId);
        result = await AssistantManager.update(updateId);
        break;
        
      case 'info':
        const infoId = targetId || assistantId;
        if (!infoId) {
          return Response.json({ 
            success: false, 
            error: "ID assistente richiesto per ottenere le informazioni" 
          }, { status: 400 });
        }
        
        if (!validateAssistantId(infoId)) {
          return Response.json({ 
            success: false, 
            error: "Formato ID assistente non valido" 
          }, { status: 400 });
        }
        
        console.log("📋 Richiesta info assistente:", infoId);
        result = await AssistantManager.getInfo(infoId);
        break;
        
      case 'delete':
        if (!targetId) {
          return Response.json({ 
            success: false, 
            error: "ID assistente richiesto per l'eliminazione" 
          }, { status: 400 });
        }
        
        if (!validateAssistantId(targetId)) {
          return Response.json({ 
            success: false, 
            error: "Formato ID assistente non valido" 
          }, { status: 400 });
        }
        
        console.log("🗑️ Richiesta eliminazione assistente:", targetId);
        result = await AssistantManager.delete(targetId);
        break;
        
      case 'list':
        console.log("📋 Richiesta lista assistenti");
        result = await AssistantManager.listAll();
        break;
        
      default:
        return Response.json({ 
          success: false, 
          error: "Azione non implementata" 
        }, { status: 400 });
    }
    
    // 📤 RISPOSTA SICURA
    const statusCode = result.success ? 200 : 500;
    return Response.json(result, { status: statusCode });
    
  } catch (error) {
    // 🚨 GESTIONE ERRORI GLOBALE
    console.error("❌ Errore grave nell'API assistant:", error);
    return Response.json({ 
      success: false, 
      error: "Errore interno del server" 
    }, { status: 500 });
  }
}

// 📖 GESTIONE GET - INFO E DOCUMENTAZIONE
export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const targetId = url.searchParams.get('assistantId');

    // 📋 SE RICHIEDE INFO SPECIFICHE
    if (action === 'info' && targetId) {
      if (!validateAssistantId(targetId)) {
        return Response.json({ 
          success: false, 
          error: "Formato ID assistente non valido" 
        }, { status: 400 });
      }
      
      const result = await AssistantManager.getInfo(targetId);
      return Response.json(result);
    }
    
    // 📋 SE RICHIEDE LISTA
    if (action === 'list') {
      const result = await AssistantManager.listAll();
      return Response.json(result);
    }
    
    // 📚 DOCUMENTAZIONE API
    return Response.json({
      message: "API Assistant Nabè - Gestione Centralizzata",
      version: "2.0.0",
      endpoints: {
        "POST /api/assistant": {
          description: "Gestisce tutte le operazioni sugli assistenti",
          actions: {
            create: "Crea nuovo assistente",
            update: "Aggiorna assistente esistente", 
            info: "Ottieni informazioni assistente",
            delete: "Elimina assistente",
            list: "Lista tutti gli assistenti"
          },
          examples: {
            create: { action: "create" },
            update: { action: "update", assistantId: "asst_xxx" },
            info: { action: "info", assistantId: "asst_xxx" },
            delete: { action: "delete", assistantId: "asst_xxx" },
            list: { action: "list" }
          }
        },
        "GET /api/assistant": {
          description: "Informazioni e documentazione",
          queryParams: {
            "?action=info&assistantId=asst_xxx": "Info assistente specifico",
            "?action=list": "Lista assistenti"
          }
        }
      },
      security: {
        validation: "Validazione formato ID assistente",
        errorHandling: "Gestione errori completa",
        logging: "Log dettagliati per debugging"
      }
    }, { 
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    
  } catch (error) {
    console.error("❌ Errore in GET /api/assistant:", error);
    return Response.json({ 
      success: false, 
      error: "Errore interno del server" 
    }, { status: 500 });
  }
}