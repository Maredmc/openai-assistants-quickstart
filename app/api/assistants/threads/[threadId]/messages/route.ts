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
    const body = await request.json();
    const content = typeof body?.content === 'string' ? body.content : '';
    const userId =
      typeof body?.userId === 'string' && body.userId.trim().length > 0
        ? body.userId
        : 'anonymous';

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
    if (openaiQueue.isOverloaded()) {
      secureLog.warn('Queue overload guard triggered', {
        code: 'QUEUE_FULL',
        threadId: threadId.substring(0, 10) + '...'
      });

      const retryAfter = 10;
      return new Response(
        JSON.stringify({
          error: 'Sistema sovraccarico. Riprova tra qualche secondo.',
          code: 'QUEUE_FULL',
          retryAfter,
        }),
        {
          status: 503,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter),
          },
        }
      );
    }

    const knowledgeContext = buildKnowledgeContext(content);

    const stream = await openaiQueue.enqueue(async () => {

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
    }, userId);

    return new Response(stream.toReadableStream());

  } catch (error) {
    // 🚨 Gestione errori specifici
    if (error instanceof OpenAIQueueError) {
      secureLog.warn('Queue error', {
        code: error.code,
        threadId: threadId.substring(0, 10) + '...'
      });

      // Errore sovraccarico o timeout
      const status =
        error.code === 'QUEUE_FULL'
          ? 503
          : error.code === 'USER_QUEUE_LIMIT'
            ? 429
            : 408;
      const retryAfter =
        error.code === 'QUEUE_FULL'
          ? 10
          : error.code === 'USER_QUEUE_LIMIT'
            ? 3
            : 5;

      return new Response(
        JSON.stringify({
          error: error.message,
          code: error.code,
          retryAfter, // Suggerisci quando riprovare (secondi)
        }),
        {
          status,
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
