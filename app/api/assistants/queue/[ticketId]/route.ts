import { openaiQueue, OpenAIQueueError } from "@/app/lib/openai-queue";
import { secureLog } from "@/app/lib/secure-logger";

export async function GET(_request: Request, { params: { ticketId } }) {
  const info = openaiQueue.getTicketInfo(ticketId);

  if (!info) {
    return new Response(
      JSON.stringify({
        error: "Ticket non trovato o scaduto.",
        code: "NOT_FOUND",
      }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const retryAfter = info.position > 0 ? Math.min(15, Math.max(3, info.position * 2)) : 0;

  return new Response(
    JSON.stringify({
      ticketId: info.ticketId,
      status: info.status,
      position: info.position,
      queuedAhead: info.queuedAhead,
      userId: info.userId,
      enqueuedAt: info.enqueuedAt,
      startedAt: info.startedAt ?? null,
      finishedAt: info.finishedAt ?? null,
      errorCode: info.errorCode ?? null,
      errorMessage: info.errorMessage ?? null,
      retryAfter,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}

export async function DELETE(_request: Request, { params: { ticketId } }) {
  try {
    const cancelled = openaiQueue.cancelTicket(ticketId);
    if (!cancelled) {
      const info = openaiQueue.getTicketInfo(ticketId);
      const status = info?.status;
      const code = status === 'processing' ? 409 : 404;

      return new Response(
        JSON.stringify({
          error:
            status === 'processing'
              ? 'Impossibile annullare: la richiesta è già in elaborazione.'
              : 'Ticket non trovato o già completato.',
          code: status === 'processing' ? 'IN_PROGRESS' : 'NOT_FOUND',
        }),
        {
          status: code,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    secureLog.error('Ticket cancel failed', {
      ticketId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    const message =
      error instanceof OpenAIQueueError ? error.message : 'Errore inatteso.';
    const code =
      error instanceof OpenAIQueueError ? error.code : 'INTERNAL_ERROR';

    return new Response(
      JSON.stringify({
        error: message,
        code,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
