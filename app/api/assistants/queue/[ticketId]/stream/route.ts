import { OpenAIQueueError, openaiQueue } from "@/app/lib/openai-queue";
import { secureLog } from "@/app/lib/secure-logger";

export const runtime = "nodejs";

export async function GET(_request: Request, { params: { ticketId } }) {
  try {
    const stream = await openaiQueue.awaitTicket<any>(ticketId);

    if (!stream || typeof stream.toReadableStream !== "function") {
      secureLog.warn("Ticket stream missing toReadableStream", {
        ticketId,
        hasStream: Boolean(stream),
      });

      return new Response(
        JSON.stringify({
          error: "Risultato non disponibile per il ticket richiesto.",
          code: "NO_STREAM",
        }),
        {
          status: 410,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(stream.toReadableStream());
  } catch (error) {
    secureLog.error("Ticket stream fetch failed", {
      ticketId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    if (error instanceof OpenAIQueueError) {
      const status =
        error.code === "TIMEOUT"
          ? 408
          : error.code === "QUEUE_FULL"
            ? 503
            : error.code === "USER_QUEUE_LIMIT"
              ? 429
              : 500;

      return new Response(
        JSON.stringify({
          error: error.message,
          code: error.code,
        }),
        {
          status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: "Errore inatteso durante il recupero dello stream.",
        code: "INTERNAL_ERROR",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
