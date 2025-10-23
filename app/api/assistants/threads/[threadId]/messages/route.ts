import { assistantId } from "@/app/assistant-config";
import { openai } from "@/app/openai";
import { buildKnowledgeContext } from "@/app/utils/knowledge-context";
import { openaiQueue, OpenAIQueueError } from "@/app/lib/openai-queue";
import { secureLog } from "@/app/lib/secure-logger";

export const runtime = "nodejs";
export const maxDuration = 15; // ⏱️ Timeout 15 secondi (max per richiesta)

// Send a new message to a thread
export async function POST(request, { params: { threadId } }) {
  try {
    const { content } = await request.json();

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

    // 🚦 Usa la coda per gestire il carico
    const stream = await openaiQueue.enqueue(async () => {
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
    });

    return new Response(stream.toReadableStream());

  } catch (error) {
    // 🚨 Gestione errori specifici
    if (error instanceof OpenAIQueueError) {
      secureLog.warn('Queue error', {
        code: error.code,
        threadId: threadId.substring(0, 10) + '...'
      });

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

      return new Response(
        JSON.stringify({
          error: error.message,
          code: error.code,
          retryAfter,
        }),
        {
          status: statusCode,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter)
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
