import { assistantId } from "@/app/assistant-config";
import { openai } from "@/app/openai";
import { buildKnowledgeContext } from "@/app/utils/knowledge-context";
import { smartQueue, QueueError } from "@/app/lib/smart-queue-manager";
import { secureLog } from "@/app/lib/secure-logger";

export const runtime = "nodejs";
export const maxDuration = 30; // ⏱️ Timeout 30 secondi (aumentato per Tier 1)

// Send a new message to a thread
export async function POST(request, { params: { threadId } }) {
  try {
    const body = await request.json();
    const { content, userId } = body;

    // Validazione input
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return new Response(
        JSON.stringify({
          error: 'Messaggio non valido',
          code: 'INVALID_INPUT'
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Genera userId se non fornito (per tracking coda)
    const userIdentifier = userId || `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 🚦 Usa la smart queue con tracking utente
    const stream = await smartQueue.enqueue(async () => {
      const knowledgeContext = buildKnowledgeContext(content);

      // Crea il messaggio
      await openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: content,
      });

      // Avvia lo streaming della risposta
      return openai.beta.threads.runs.stream(threadId, {
        assistant_id: assistantId,
        additional_instructions: knowledgeContext,
      });
    }, userIdentifier);

    return new Response(stream.toReadableStream());

  } catch (error) {
    // 🚨 Gestione errori specifici da Smart Queue
    if (error instanceof QueueError) {
      secureLog.warn('Smart Queue error', {
        code: error.code,
        threadId: threadId.substring(0, 10) + '...',
        retryAfter: error.retryAfter
      });

<<<<<<< Updated upstream
      // Mappa errori a status code e retry time appropriati
      let statusCode: number;
      let retryAfter: number;

      switch (error.code) {
        case 'QUEUE_FULL':
          statusCode = 503;
          retryAfter = 10;
          break;
        case 'RATE_LIMIT':
          statusCode = 429;
          retryAfter = 30; // 30 secondi per rate limit OpenAI
          break;
        case 'TIMEOUT':
          statusCode = 408;
          retryAfter = 5;
          break;
        default:
          statusCode = 500;
          retryAfter = 5;
      }
=======
      // Mappa codici errore a status HTTP
      const statusMap = {
        'QUEUE_FULL': 503,      // Service Unavailable
        'TIMEOUT': 408,          // Request Timeout
        'RATE_LIMIT': 429,       // Too Many Requests
        'PROCESSING_ERROR': 500  // Internal Server Error
      };
>>>>>>> Stashed changes

      return new Response(
        JSON.stringify({
          error: error.message,
          code: error.code,
<<<<<<< Updated upstream
          retryAfter,
        }),
        {
          status: statusCode,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter)
=======
          retryAfter: error.retryAfter || 10,
        }),
        {
          status: statusMap[error.code] || 500,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(error.retryAfter || 10)
>>>>>>> Stashed changes
          }
        }
      );
    }

    // Errore generico
    secureLog.error('Unexpected error in chat', {
      error: error instanceof Error ? error.message : 'Unknown error',
      threadId: threadId.substring(0, 10) + '...'
    });

    return new Response(
      JSON.stringify({
        error: 'Si è verificato un errore. Riprova tra qualche secondo.',
        code: 'INTERNAL_ERROR'
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
