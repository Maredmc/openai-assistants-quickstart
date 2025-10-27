import { priorityQueueManager } from '@/app/lib/priority-queue-manager';
import { secureLog } from '@/app/lib/secure-logger';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, userId, action } = body;

    // Azione: register
    if (action === 'register') {
      if (!email || !userId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Email e userId richiesti',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      const result = await priorityQueueManager.registerForPriority(email, userId);

      return new Response(
        JSON.stringify(result),
        {
          status: result.success ? 200 : 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Azione: verify
    if (action === 'verify') {
      const { code } = body;
      
      if (!userId || !code) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'UserId e codice richiesti',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      const verified = priorityQueueManager.verifyEmail(userId, code);

      return new Response(
        JSON.stringify({
          success: verified,
          message: verified
            ? 'Email verificata! Accesso prioritario attivato 🎉'
            : 'Codice non valido o scaduto',
        }),
        {
          status: verified ? 200 : 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Azione: status
    if (action === 'status') {
      if (!userId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'UserId richiesto',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      const user = priorityQueueManager.getPriorityUser(userId);
      const hasPriority = priorityQueueManager.hasPriority(userId);

      return new Response(
        JSON.stringify({
          success: true,
          hasPriority,
          user: user ? {
            email: user.email,
            verified: user.verified,
            registeredAt: user.registeredAt,
            requestCount: user.requestCount,
          } : null,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Azione non valida
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Azione non valida. Usa: register, verify, status',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    secureLog.error('Priority API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Errore del server',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// GET per statistiche (solo admin)
export async function GET() {
  try {
    const stats = priorityQueueManager.getStats();

    return new Response(
      JSON.stringify({
        success: true,
        stats,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    secureLog.error('Priority stats error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Errore del server',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}