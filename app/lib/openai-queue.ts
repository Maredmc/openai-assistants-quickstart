/**
 * 🚦 OpenAI Request Queue - Gestione sovraccarico per 200+ utenti
 *
 * Features:
 * - Max 20 richieste simultanee a OpenAI
 * - Max 100 richieste in coda
 * - Timeout 15 secondi per richiesta
 * - Restituisce errore immediato se sovraccarico
 */

import { secureLog } from './secure-logger';

type QueueItem<T> = {
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
  fn: () => Promise<T>;
  timestamp: number;
  timeoutId: NodeJS.Timeout;
};

export class OpenAIQueueError extends Error {
  constructor(
    message: string,
    public code: 'QUEUE_FULL' | 'TIMEOUT' | 'PROCESSING_ERROR'
  ) {
    super(message);
    this.name = 'OpenAIQueueError';
  }
}

class OpenAIQueue {
  private queue: QueueItem<any>[] = [];
  private processing = 0;

  // Configurazione per 200+ utenti simultanei
  private readonly MAX_CONCURRENT = 20; // Max richieste simultanee a OpenAI
  private readonly MAX_QUEUE_SIZE = 100; // Max richieste in attesa
  private readonly REQUEST_TIMEOUT = 15000; // 15 secondi timeout

  /**
   * Accoda una richiesta con timeout e controllo sovraccarico
   */
  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    // 🚫 Check sovraccarico immediato
    if (this.queue.length >= this.MAX_QUEUE_SIZE) {
      secureLog.warn('Queue full - rejecting request', {
        queueSize: this.queue.length,
        processing: this.processing,
      });

      throw new OpenAIQueueError(
        'Sistema sovraccarico. Riprova tra qualche secondo.',
        'QUEUE_FULL'
      );
    }

    return new Promise<T>((resolve, reject) => {
      // ⏱️ Timeout automatico dopo 15 secondi
      const timeoutId = setTimeout(() => {
        // Rimuovi dalla coda se ancora presente
        const index = this.queue.findIndex((item) => item.timeoutId === timeoutId);
        if (index !== -1) {
          this.queue.splice(index, 1);
        }

        secureLog.warn('Request timeout', {
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
        timestamp: Date.now(),
        timeoutId,
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
      secureLog.debug('Request completed', { duration, queueSize: this.queue.length });
    } catch (error) {
      secureLog.error('Request processing error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        queueSize: this.queue.length,
      });

      item.reject(
        new OpenAIQueueError(
          'Errore durante l\'elaborazione. Riprova.',
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
    };
  }

  /**
   * Check se sistema è sovraccarico
   */
  isOverloaded(): boolean {
    return this.queue.length >= this.MAX_QUEUE_SIZE * 0.8; // >80% capacità
  }
}

// Singleton globale
export const openaiQueue = new OpenAIQueue();
