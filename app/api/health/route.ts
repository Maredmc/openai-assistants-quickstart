/**
 * 🏥 Health Check Endpoint
 *
 * Endpoint per monitorare lo stato del sistema e della coda OpenAI
 * Utile per load balancers e monitoring tools
 */

import { openaiQueue } from "@/app/lib/openai-queue";

export const runtime = "nodejs";
export const maxDuration = 5; // 5 secondi max

export async function GET() {
  try {
    const stats = openaiQueue.getStats();
    const isHealthy = !openaiQueue.isOverloaded();

    return new Response(
      JSON.stringify({
        status: isHealthy ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
        queue: {
          size: stats.queueSize,
          processing: stats.processing,
          maxConcurrent: stats.maxConcurrent,
          maxQueueSize: stats.maxQueueSize,
          utilization: Math.round((stats.queueSize / stats.maxQueueSize) * 100), // %
        },
        metrics: {
          isOverloaded: stats.isOverloaded,
          canAcceptRequests: !stats.isOverloaded,
        },
      }),
      {
        status: isHealthy ? 200 : 503,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: "unhealthy",
        error: "Failed to retrieve health status",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
