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

import { secureLog } from './secure-logger';

type QueueItem<T> = {
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
  fn: () => Promise<T>;
  timestamp: number;
  timeoutId: NodeJS.Timeout;
  userId: string; // 🎯 Identificatore utente per tracking
  createdAt: number; // 📅 Timestamp creazione per cleanup
};

export class OpenAIQueueError extends Error {
  constructor(
    message: string,
    public code: 'QUEUE_FULL' | 'TIMEOUT' | 'PROCESSING_ERROR' | 'STALE_REQUEST'
  ) {
    super(message);
    this.name = 'OpenAIQueueError';
  }
}

class OpenAIQueue {
  private queue: QueueItem<any>[] = [];
  private processing = 0;
  private cleanupInterval: NodeJS.Timeout | null = null;

  // Configurazione per 200+ utenti simultanei
  private readonly MAX_CONCURRENT = 20; // Max richieste simultanee a OpenAI
  private readonly MAX_QUEUE_SIZE = 100; // Max richieste in attesa
  private readonly REQUEST_TIMEOUT = 15000; // 15 secondi timeout
  private readonly STALE_REQUEST_THRESHOLD = 30000; // 30 secondi = richiesta obsoleta
  private readonly CLEANUP_INTERVAL = 10000; // Cleanup ogni 10 secondi

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
  async enqueue<T>(fn: () => Promise<T>, userId: string): Promise<T> {
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

    return new Promise<T>((resolve, reject) => {
      const createdAt = Date.now();

      // ⏱️ Timeout automatico dopo 15 secondi
      const timeoutId = setTimeout(() => {
        // Rimuovi dalla coda se ancora presente
        const index = this.queue.findIndex((item) => item.timeoutId === timeoutId);
        if (index !== -1) {
          this.queue.splice(index, 1);
        }

        secureLog.warn('Request timeout', {
          userId,
          queueSize: this.queue.length,
          processing: this.processing,
        });

        reject(
          new OpenAIQueueError(
            'Richiesta scaduta. Il sistema è sotto carico, riprova tra qualche secondo.',
            'TIMEOUT'
          )
        );
      }, this.REQUEST_TIMEOUT);

      this.queue.push({
        resolve,
        reject,
        fn,
        timestamp: createdAt,
        timeoutId,
        userId,
        createdAt,
      });

      secureLog.debug('Request enqueued', {
        userId,
        queueSize: this.queue.length,
        processing: this.processing,
      });

      this.processQueue();
    });
  }

  /**
   * Processa la coda
   */
  private async processQueue() {
    if (this.processing >= this.MAX_CONCURRENT || this.queue.length === 0) {
      return;
    }

    this.processing++;
    const item = this.queue.shift();

    if (!item) {
      this.processing--;
      return;
    }

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
      });
    } catch (error) {
      secureLog.error('Request processing error', {
        userId: item.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        queueSize: this.queue.length,
      });

      item.reject(
        new OpenAIQueueError(
          "Errore durante l'elaborazione. Riprova.",
          'PROCESSING_ERROR'
        )
      );
    } finally {
      this.processing--;
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
}

// Singleton globale
export const openaiQueue = new OpenAIQueue();