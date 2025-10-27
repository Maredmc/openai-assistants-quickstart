import { assistantId } from "@/app/assistant-config";
import { openai } from "@/app/openai";
import { buildKnowledgeContext } from "@/app/utils/knowledge-context";
import { openaiQueue, OpenAIQueueError } from "@/app/lib/openai-queue";
import { secureLog } from "@/app/lib/secure-logger";
import { intelligentCache } from "@/app/lib/intelligent-cache";
import { priorityQueueManager } from "@/app/lib/priority-queue-manager";

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

    // 🚀 STEP 1: Controlla CACHE (70% risparmi!)
    if (intelligentCache.isCacheable(content)) {
      const cached = await intelligentCache.get(content, userId);
      
      if (cached) {
        secureLog.info('Cache hit - Risposta immediata', {
          userId,
          question: content.substring(0, 50),
          hits: cached.hits,
        });

        // Crea un ReadableStream dalla risposta cached
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            // Simula formato Assistant API
            controller.enqueue(encoder.encode(`event: thread.message.delta\ndata: ${JSON.stringify({
              delta: { content: [{ type: 'text', text: { value: cached.response } }] }
            })}\n\n`));
            
            controller.enqueue(encoder.encode(`event: thread.run.completed\ndata: {}\n\n`));
            controller.close();
          }
        });

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'X-Cache-Hit': 'true',
          },
        });
      }
    }

    // 🎯 STEP 2: Controlla PRIORITY (utenti con email)
    const hasPriority = priorityQueueManager.hasPriority(userId);
    
    if (hasPriority) {
      secureLog.info('Priority user - Bypass queue', {
        userId,
      });
      
      priorityQueueManager.recordPriorityRequest(userId);
      
      // Utente priority: esegui immediatamente senza coda
      const knowledgeContext = buildKnowledgeContext(content);
      
      try {
        await openai.beta.threads.messages.create(threadId, {
          role: "user",
          content: content,
        });

        const stream = await openai.beta.threads.runs.stream(threadId, {
          assistant_id: assistantId,
          additional_instructions: knowledgeContext,
        });

        // Salva in cache per future richieste
        scheduleResponseCaching(content, userId, stream);

        return new Response(stream.toReadableStream(), {
          headers: {
            'X-Priority-User': 'true',
          },
        });
      } catch (error) {
        secureLog.error('Priority request failed', {
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        
        // Anche utenti priority possono avere errori, continua con coda normale
      }
    } else {
      priorityQueueManager.recordStandardRequest();
    }

    // 🚦 STEP 3: Sistema CODA normale
    if (openaiQueue.isOverloaded()) {
      secureLog.warn('Queue overload guard triggered', {
        code: 'QUEUE_FULL',
        threadId: threadId.substring(0, 10) + '...',
        hasPriority,
      });

      const retryAfter = 10;
      return new Response(
        JSON.stringify({
          error: 'Sistema sovraccarico. Riprova tra qualche secondo.',
          code: 'QUEUE_FULL',
          retryAfter,
          suggestion: hasPriority 
            ? 'Come utente priority, dovresti avere accesso immediato. Riprova.'
            : 'Vuoi accesso prioritario senza attesa? Registrati con la tua email!',
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

    const ticket = openaiQueue.enqueue(async () => {
      // Crea il messaggio
      await openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: content,
      });

      // Avvia lo streaming della risposta
      const stream = await openai.beta.threads.runs.stream(threadId, {
        assistant_id: assistantId,
        additional_instructions: knowledgeContext,
      });

      // Salva in cache per future richieste
      scheduleResponseCaching(content, userId, stream);

      return stream;
    }, userId);

    const queuedAhead = ticket.initialPosition - 1;
    const immediate =
      ticket.initialPosition === 1 &&
      ticket.initialUserPosition === 1 &&
      !openaiQueue.isOverloaded();

    if (immediate) {
      const stream = await ticket.promise;
      return new Response(stream.toReadableStream());
    }

    // Evita UnhandledPromiseRejection se la richiesta viene abbandonata dal client
    ticket.promise.catch((error) => {
      secureLog.warn('Deferred ticket failed', {
        ticketId: ticket.ticketId,
        threadId: threadId.substring(0, 10) + '...',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    });

    const retryAfter = Math.min(15, Math.max(3, queuedAhead * 2));

    return new Response(
      JSON.stringify({
        status: 'queued',
        message:
          queuedAhead > 0
            ? `Sei in coda. Ci sono ${queuedAhead} richieste davanti a te.`
            : 'Sei in coda. Verrai servito a breve.',
        ticketId: ticket.ticketId,
        position: ticket.initialPosition,
        queuedAhead,
        userPosition: ticket.initialUserPosition,
        retryAfter,
        statusEndpoint: `/api/assistants/queue/${ticket.ticketId}`,
        streamEndpoint: `/api/assistants/queue/${ticket.ticketId}/stream`,
        prioritySuggestion: !hasPriority 
          ? 'Vuoi saltare la coda? Registrati con email per accesso prioritario!'
          : null,
      }),
      {
        status: 202,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
        },
      }
    );

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
          retryAfter,
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

/**
 * 💾 Schedula caching della risposta
 * (eseguito in background, non blocca la risposta)
 */
function scheduleResponseCaching(
  question: string,
  userId: string,
  stream: any
): void {
  const chunks: string[] = [];
  let completed = false;

  const collectDelta = (delta: any) => {
    try {
      const value =
        typeof delta?.value === 'string'
          ? delta.value
          : typeof delta === 'string'
            ? delta
            : null;
      if (value) {
        chunks.push(value);
      }
    } catch {
      // Ignora eventuali errori di parsing del delta
    }
  };

  const removeListeners = () => {
    if (typeof stream?.off === 'function') {
      stream.off('textDelta', collectDelta);
      stream.off('textCreated', handleTextCreated);
      stream.off('event', handleStreamEvent);
      stream.off('error', handleStreamError);
      stream.off('abort', handleStreamError);
    }
  };

  const finalise = async () => {
    if (completed) {
      return;
    }
    completed = true;

    removeListeners();

    const responseText = chunks.join('').trim();
    if (!responseText) {
      return;
    }

    try {
      await intelligentCache.set(question, responseText, undefined, userId);
      secureLog.debug('Response cached', {
        question: question.substring(0, 50),
        userId,
      });
    } catch (error) {
      secureLog.warn('Failed to cache response', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleStreamEvent = (event: any) => {
    const eventName = event?.event;
    if (eventName === 'thread.run.completed') {
      void finalise();
    }
    if (eventName === 'thread.run.failed' || eventName === 'thread.run.cancelled') {
      completed = true;
      removeListeners();
    }
  };

  const handleStreamError = () => {
    completed = true;
    removeListeners();
  };

  const handleTextCreated = (payload: any) => {
    try {
      const value = payload?.text?.value;
      if (typeof value === 'string') {
        chunks.push(value);
      }
    } catch {
      // Ignora errori nel parsing del payload
    }
  };

  if (typeof stream?.on !== 'function' || typeof stream?.off !== 'function') {
    secureLog.warn('Assistant stream does not support event listeners for caching', {
      question: question.substring(0, 50),
    });
    return;
  }

  stream.on('textDelta', collectDelta);
  stream.on('textCreated', handleTextCreated);
  stream.on('event', handleStreamEvent);
  stream.on('error', handleStreamError);
  stream.on('abort', handleStreamError);
}
