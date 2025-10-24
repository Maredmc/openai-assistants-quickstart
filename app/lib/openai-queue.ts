/**
 * 🚦 OpenAI Request Queue - Gestione sovraccarico per 200+ utenti
 *
 * Features:
 * - Max 20 richieste simultanee a OpenAI
 * - Max 100 richieste in coda
 * - Timeout 15 secondi per richiesta
 * - 🆕 Pulizia automatica richieste obsolete ogni 10 secondi
 * - 🆕 Tracking userId per gestione utenti disconnessi
 * - Restituisce errore immediato se sovraccarico
 */

import { randomUUID } from 'crypto';
import { secureLog } from './secure-logger';

type QueueItem<T> = {
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
  fn: () => Promise<T>;
  timestamp: number;
  timeoutId: NodeJS.Timeout;
  userId: string; // 🎯 Identificatore utente per tracking
  createdAt: number; // 📅 Timestamp creazione per cleanup
  ticketId: string;
};

type TicketStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

type TicketState = {
  ticketId: string;
  userId: string;
  status: TicketStatus;
  enqueuedAt: number;
  startedAt?: number;
  finishedAt?: number;
  errorCode?: OpenAIQueueError['code'];
  errorMessage?: string;
};

export type QueueTicketHandle<T> = {
  ticketId: string;
  promise: Promise<T>;
  initialPosition: number;
  initialUserPosition: number;
  enqueuedAt: number;
};

export type QueueTicketInfo = TicketState & {
  position: number;
  queuedAhead: number;
};

export class OpenAIQueueError extends Error {
  constructor(
    message: string,
    public code:
      | 'QUEUE_FULL'
      | 'TIMEOUT'
      | 'PROCESSING_ERROR'
      | 'STALE_REQUEST'
      | 'USER_QUEUE_LIMIT'
  ) {
    super(message);
    this.name = 'OpenAIQueueError';
  }
}

class OpenAIQueue {
  private queue: QueueItem<any>[] = [];
  private processing = 0;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private inFlightByUser = new Map<string, number>();
  private queuedByUser = new Map<string, number>();
  private ticketStates = new Map<string, TicketState>();
  private ticketPromises = new Map<string, Promise<any>>();

  // Configurazione per 200+ utenti simultanei
  private readonly MAX_CONCURRENT = 20; // Max richieste simultanee a OpenAI
  private readonly MAX_QUEUE_SIZE = 100; // Max richieste in attesa
  private readonly MAX_CONCURRENT_PER_USER = 1; // Limite richieste simultanee per utente
  private readonly MAX_QUEUE_PER_USER = 3; // Limite richieste totali (coda+attive) per utente
  private readonly REQUEST_TIMEOUT = 15000; // 15 secondi timeout
  private readonly STALE_REQUEST_THRESHOLD = 30000; // 30 secondi = richiesta obsoleta
  private readonly CLEANUP_INTERVAL = 10000; // Cleanup ogni 10 secondi
  private readonly TICKET_TTL = 600000; // 10 minuti conservazione info ticket

  constructor() {
    // 🧹 Avvia pulizia automatica
    this.startCleanup();
  }

  /**
   * 🧹 Avvia intervallo di pulizia automatica
   */
  private startCleanup() {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleRequests();
    }, this.CLEANUP_INTERVAL);

    secureLog.info('Queue cleanup started', {
      interval: this.CLEANUP_INTERVAL,
      threshold: this.STALE_REQUEST_THRESHOLD,
    });
  }

  /**
   * 🗑️ Pulisci richieste obsolete (>30 secondi in coda)
   */
  private cleanupStaleRequests() {
    const now = Date.now();
    const initialQueueSize = this.queue.length;

    // Filtra richieste troppo vecchie
    this.queue = this.queue.filter((item) => {
      const age = now - item.createdAt;

      if (age > this.STALE_REQUEST_THRESHOLD) {
        // Rimuovi timeout e rigetta la richiesta
        clearTimeout(item.timeoutId);
        this.decrementQueued(item.userId);
        this.setTicketState(item.ticketId, {
          status: 'failed',
          finishedAt: now,
          errorCode: 'STALE_REQUEST',
          errorMessage:
            'Richiesta scaduta. La sessione è stata chiusa o è scaduta.',
        });

        secureLog.warn('Removing stale request from queue', {
          userId: item.userId,
          ageMs: age,
          queueSize: this.queue.length,
        });

        item.reject(
          new OpenAIQueueError(
            'Richiesta scaduta. La sessione è stata chiusa o è scaduta.',
            'STALE_REQUEST'
          )
        );

        return false; // Rimuovi dalla coda
      }

      return true; // Mantieni in coda
    });

    const removedCount = initialQueueSize - this.queue.length;

    if (removedCount > 0) {
      secureLog.info('Stale requests cleaned', {
        removed: removedCount,
        remaining: this.queue.length,
      });
    }
  }

  /**
   * 🚫 Rimuovi tutte le richieste di un utente specifico dalla coda
   * Utile quando l'utente chiude il browser
   */
  removeUserFromQueue(userId: string) {
    const initialQueueSize = this.queue.length;

    this.queue = this.queue.filter((item) => {
      if (item.userId === userId) {
        clearTimeout(item.timeoutId);
        this.decrementQueued(item.userId);
        this.setTicketState(item.ticketId, {
          status: 'cancelled',
          finishedAt: Date.now(),
        });

        secureLog.info('Removing user from queue', {
          userId,
          queueSize: this.queue.length,
        });

        item.reject(
          new OpenAIQueueError(
            'Richiesta annullata. Utente ha chiuso la sessione.',
            'STALE_REQUEST'
          )
        );

        return false; // Rimuovi dalla coda
      }

      return true; // Mantieni in coda
    });

    const removedCount = initialQueueSize - this.queue.length;

    if (removedCount > 0) {
      secureLog.info('User requests removed', {
        userId,
        removed: removedCount,
        remaining: this.queue.length,
      });
    }

    return removedCount;
  }

  /**
   * Accoda una richiesta con timeout e controllo sovraccarico
   */
  enqueue<T>(fn: () => Promise<T>, userId: string): QueueTicketHandle<T> {
    // 🚫 Check sovraccarico immediato
    if (this.queue.length >= this.MAX_QUEUE_SIZE) {
      secureLog.warn('Queue full - rejecting request', {
        userId,
        queueSize: this.queue.length,
        processing: this.processing,
      });

      throw new OpenAIQueueError(
        'Sistema sovraccarico. Riprova tra qualche secondo.',
        'QUEUE_FULL'
      );
    }

    const activeForUser = this.inFlightByUser.get(userId) ?? 0;
    const queuedForUser = this.queuedByUser.get(userId) ?? 0;

    if (activeForUser + queuedForUser >= this.MAX_QUEUE_PER_USER) {
      secureLog.warn('User queue limit reached', {
        userId,
        activeForUser,
        queuedForUser,
      });

      throw new OpenAIQueueError(
        'Troppi messaggi in parallelo per questo utente. Attendi qualche secondo.',
        'USER_QUEUE_LIMIT'
      );
    }

    const createdAt = Date.now();
    const ticketId = randomUUID();
    const initialPosition = this.queue.length + 1;
    const initialUserPosition = activeForUser + queuedForUser + 1;

    let resolveFn: (value: T) => void;
    let rejectFn: (reason?: any) => void;

    const promise = new Promise<T>((resolve, reject) => {
      resolveFn = resolve;
      rejectFn = reject;
    });
    this.ticketPromises.set(ticketId, promise);

    // ⏱️ Timeout automatico dopo 15 secondi
    const timeoutId = setTimeout(() => {
      // Rimuovi dalla coda se ancora presente
      const index = this.queue.findIndex((item) => item.timeoutId === timeoutId);
      if (index !== -1) {
        const [timedOut] = this.queue.splice(index, 1);
        this.decrementQueued(timedOut.userId);
        this.setTicketState(timedOut.ticketId, {
          status: 'failed',
          finishedAt: Date.now(),
          errorCode: 'TIMEOUT',
          errorMessage:
            'Richiesta scaduta. Il sistema è sotto carico, riprova tra qualche secondo.',
        });
      }

      secureLog.warn('Request timeout', {
        userId,
        queueSize: this.queue.length,
        processing: this.processing,
      });

      rejectFn(
        new OpenAIQueueError(
          'Richiesta scaduta. Il sistema è sotto carico, riprova tra qualche secondo.',
          'TIMEOUT'
        )
      );
    }, this.REQUEST_TIMEOUT);

    this.queue.push({
      resolve: resolveFn!,
      reject: rejectFn!,
      fn,
      timestamp: createdAt,
      timeoutId,
      userId,
      createdAt,
      ticketId,
    });
    this.incrementQueued(userId);
    this.ticketStates.set(ticketId, {
      ticketId,
      userId,
      status: 'queued',
      enqueuedAt: createdAt,
    });

    secureLog.debug('Request enqueued', {
      userId,
      queueSize: this.queue.length,
      processing: this.processing,
      ticketId,
      initialPosition,
    });

    this.processQueue();

    return {
      ticketId,
      promise,
      initialPosition,
      initialUserPosition,
      enqueuedAt: createdAt,
    };
  }

  /**
   * Processa la coda
   */
  private async processQueue() {
    if (this.processing >= this.MAX_CONCURRENT || this.queue.length === 0) {
      return;
    }

    const nextIndex = this.queue.findIndex((item) => {
      const activeForUser = this.inFlightByUser.get(item.userId) ?? 0;
      return activeForUser < this.MAX_CONCURRENT_PER_USER;
    });

    if (nextIndex === -1) {
      // Tutti gli utenti in coda hanno già raggiunto il limite per-user
      return;
    }

    const [item] = this.queue.splice(nextIndex, 1);

    if (!item) {
      return;
    }

    this.processing++;
    this.decrementQueued(item.userId);
    this.incrementInFlight(item.userId);
    this.setTicketState(item.ticketId, {
      status: 'processing',
      startedAt: Date.now(),
    });

    try {
      // Cancella il timeout (la richiesta è in processing)
      clearTimeout(item.timeoutId);

      const result = await item.fn();
      item.resolve(result);

      const duration = Date.now() - item.timestamp;
      secureLog.debug('Request completed', {
        userId: item.userId,
        duration,
        queueSize: this.queue.length,
        ticketId: item.ticketId,
      });
      this.setTicketState(item.ticketId, {
        status: 'completed',
        finishedAt: Date.now(),
      });
    } catch (error) {
      secureLog.error('Request processing error', {
        userId: item.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        queueSize: this.queue.length,
        ticketId: item.ticketId,
      });

      item.reject(
        new OpenAIQueueError(
          "Errore durante l'elaborazione. Riprova.",
          'PROCESSING_ERROR'
        )
      );
      this.setTicketState(item.ticketId, {
        status: 'failed',
        finishedAt: Date.now(),
        errorCode: 'PROCESSING_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      this.processing--;
      this.decrementInFlight(item.userId);
      this.processQueue(); // Processa prossimo item
    }
  }

  /**
   * Ottieni statistiche coda (per monitoring)
   */
  getStats() {
    return {
      queueSize: this.queue.length,
      processing: this.processing,
      maxConcurrent: this.MAX_CONCURRENT,
      maxQueueSize: this.MAX_QUEUE_SIZE,
      isOverloaded: this.queue.length > this.MAX_QUEUE_SIZE * 0.8, // >80% = warning
      cleanupActive: this.cleanupInterval !== null,
    };
  }

  /**
   * Check se sistema è sovraccarico
   */
  isOverloaded(): boolean {
    return this.queue.length >= this.MAX_QUEUE_SIZE * 0.8; // >80% capacità
  }

  /**
   * 🛑 Stop cleanup interval (per testing o shutdown)
   */
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      secureLog.info('Queue cleanup stopped');
    }
  }

  /**
   * Ottieni info su un ticket
   */
  getTicketInfo(ticketId: string): QueueTicketInfo | null {
    const state = this.ticketStates.get(ticketId);
    if (!state) {
      return null;
    }

    const queueIndex = this.queue.findIndex(
      (item) => item.ticketId === ticketId
    );
    const position = queueIndex === -1 ? 0 : queueIndex + 1;
    const queuedAhead = queueIndex === -1 ? 0 : queueIndex;

    return {
      ...state,
      position,
      queuedAhead,
    };
  }

  /**
   * Cancella un ticket specifico dalla coda
   */
  cancelTicket(ticketId: string): boolean {
    const index = this.queue.findIndex((item) => item.ticketId === ticketId);
    if (index === -1) {
      const state = this.ticketStates.get(ticketId);
      if (!state || state.status !== 'queued') {
        return false;
      }
      return false;
    }

    const [item] = this.queue.splice(index, 1);
    clearTimeout(item.timeoutId);
    this.decrementQueued(item.userId);
    this.setTicketState(item.ticketId, {
      status: 'cancelled',
      finishedAt: Date.now(),
    });
    this.ticketPromises.delete(ticketId);

    secureLog.info('Ticket cancelled', {
      ticketId,
      userId: item.userId,
      queueSize: this.queue.length,
    });

    item.reject(
      new OpenAIQueueError(
        "Richiesta annullata dall'utente.",
        'STALE_REQUEST'
      )
    );

    return true;
  }

  /**
   * Attende il completamento di un ticket specifico
   */
  awaitTicket<T>(ticketId: string): Promise<T> {
    const promise = this.ticketPromises.get(ticketId);
    if (!promise) {
      const state = this.ticketStates.get(ticketId);
      if (state) {
        if (state.status === 'failed' && state.errorCode) {
          return Promise.reject(
            new OpenAIQueueError(
              state.errorMessage ??
                'La richiesta non è stata completata correttamente.',
              state.errorCode
            )
          );
        }
        if (state.status === 'cancelled') {
          return Promise.reject(
            new OpenAIQueueError(
              'Richiesta annullata.',
              'STALE_REQUEST'
            )
          );
        }
      }

      return Promise.reject(
        new OpenAIQueueError('Ticket non trovato o scaduto.', 'STALE_REQUEST')
      );
    }

    return promise as Promise<T>;
  }

  private incrementQueued(userId: string) {
    this.queuedByUser.set(userId, (this.queuedByUser.get(userId) ?? 0) + 1);
  }

  private decrementQueued(userId: string) {
    const current = this.queuedByUser.get(userId);
    if (current === undefined) {
      return;
    }
    if (current <= 1) {
      this.queuedByUser.delete(userId);
    } else {
      this.queuedByUser.set(userId, current - 1);
    }
  }

  private incrementInFlight(userId: string) {
    this.inFlightByUser.set(userId, (this.inFlightByUser.get(userId) ?? 0) + 1);
  }

  private decrementInFlight(userId: string) {
    const current = this.inFlightByUser.get(userId);
    if (current === undefined) {
      return;
    }
    if (current <= 1) {
      this.inFlightByUser.delete(userId);
    } else {
      this.inFlightByUser.set(userId, current - 1);
    }
  }

  private setTicketState(
    ticketId: string,
    patch: Partial<Omit<TicketState, 'ticketId' | 'userId'>>
  ) {
    const existing = this.ticketStates.get(ticketId);
    if (!existing) {
      return;
    }

    const updated: TicketState = {
      ...existing,
      ...patch,
    };

    this.ticketStates.set(ticketId, updated);

    if (
      ['completed', 'failed', 'cancelled'].includes(updated.status) &&
      updated.finishedAt
    ) {
      setTimeout(() => {
        const current = this.ticketStates.get(ticketId);
        if (!current) {
          return;
        }
        if (
          ['completed', 'failed', 'cancelled'].includes(current.status) &&
          current.finishedAt &&
          Date.now() - current.finishedAt >= this.TICKET_TTL
        ) {
          this.ticketStates.delete(ticketId);
          this.ticketPromises.delete(ticketId);
        }
      }, this.TICKET_TTL);
    }
  }
}

// Singleton globale
export const openaiQueue = new OpenAIQueue();
