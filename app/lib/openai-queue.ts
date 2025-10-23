/**
 * 🚦 OpenAI Request Queue - Gestione sovraccarico + Rate Limits OpenAI
 *
 * Features:
 * - Max 5 richieste simultanee (rispetta limiti OpenAI)
 * - Max 100 richieste in coda
 * - Timeout 15 secondi per richiesta
 * - Retry automatico con exponential backoff per errori 429
 * - Delay 200ms tra richieste per evitare burst
 */

import { secureLog } from './secure-logger';

type QueueItem<T> = {
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
  fn: () => Promise<T>;
  timestamp: number;
  timeoutId: NodeJS.Timeout;
  retries: number;
};

export class OpenAIQueueError extends Error {
  constructor(
    message: string,
    public code: 'QUEUE_FULL' | 'TIMEOUT' | 'PROCESSING_ERROR' | 'RATE_LIMIT'
  ) {
    super(message);
    this.name = 'OpenAIQueueError';
  }
}

class OpenAIQueue {
  private queue: QueueItem<any>[] = [];
  private processing = 0;
  private lastRequestTime = 0;

  // ⚙️ Configurazione ottimizzata per limiti OpenAI
  // IMPORTANTE: Regola questi parametri in base al tuo tier OpenAI:
  //
  // Tier 1 (500 RPM) - Max ~100 utenti:
  //   MAX_CONCURRENT = 5, DELAY = 200ms, QUEUE = 100
  //
  // Tier 2 (5K RPM) - Max ~200 utenti:
  //   MAX_CONCURRENT = 12, DELAY = 100ms, QUEUE = 200
  //
  // Tier 3+ (10K RPM) - 200+ utenti:
  //   MAX_CONCURRENT = 20, DELAY = 50ms, QUEUE = 250
  //
  // Verifica il tuo tier su: https://platform.openai.com/settings/organization/limits

  private readonly MAX_CONCURRENT = parseInt(process.env.OPENAI_QUEUE_MAX_CONCURRENT || '20'); // 🔧 MODIFICA QUI
  private readonly MAX_QUEUE_SIZE = parseInt(process.env.OPENAI_QUEUE_MAX_SIZE || '250');     // 🔧 MODIFICA QUI
  private readonly REQUEST_TIMEOUT = 15000; // 15 secondi
  private readonly MIN_REQUEST_DELAY = parseInt(process.env.OPENAI_QUEUE_MIN_DELAY || '50');  // 🔧 MODIFICA QUI
  private readonly MAX_RETRIES = 3; // Max 3 retry per errori 429
  private readonly INITIAL_RETRY_DELAY = 1000; // 1 secondo, poi exponential

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
        retries: 0,
      });

      this.processQueue();
    });
  }

  /**
   * Processa la coda con rate limiting e retry logic
   */
  private async processQueue() {
    if (this.processing >= this.MAX_CONCURRENT || this.queue.length === 0) {
      return;
    }

    // ⏳ Delay minimo tra richieste per evitare burst
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.MIN_REQUEST_DELAY) {
      const delayNeeded = this.MIN_REQUEST_DELAY - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delayNeeded));
    }

    this.processing++;
    this.lastRequestTime = Date.now();
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
        duration,
        queueSize: this.queue.length,
        retries: item.retries
      });

    } catch (error: any) {
      // 🔄 RETRY LOGIC per errori 429 (Rate Limit)
      const isRateLimitError =
        error?.status === 429 ||
        error?.code === 'rate_limit_exceeded' ||
        error?.message?.toLowerCase().includes('rate limit');

      if (isRateLimitError && item.retries < this.MAX_RETRIES) {
        item.retries++;

        // Exponential backoff: 1s, 2s, 4s
        const retryDelay = this.INITIAL_RETRY_DELAY * Math.pow(2, item.retries - 1);

        secureLog.warn('OpenAI rate limit - retrying', {
          attempt: item.retries,
          maxRetries: this.MAX_RETRIES,
          retryDelay,
          queueSize: this.queue.length,
        });

        // Rimetti in coda dopo il delay
        setTimeout(() => {
          // Crea nuovo timeout per la retry
          item.timeoutId = setTimeout(() => {
            const index = this.queue.findIndex((i) => i === item);
            if (index !== -1) {
              this.queue.splice(index, 1);
            }
            item.reject(
              new OpenAIQueueError(
                'Timeout durante retry. Riprova.',
                'TIMEOUT'
              )
            );
          }, this.REQUEST_TIMEOUT);

          this.queue.unshift(item); // Metti all'inizio della coda
          this.processQueue();
        }, retryDelay);

        this.processing--;
        this.processQueue(); // Processa prossimo item
        return;
      }

      // 🚨 Errore definitivo (non rate limit o retry esauriti)
      secureLog.error('Request processing error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: error?.code,
        status: error?.status,
        queueSize: this.queue.length,
        retriesUsed: item.retries,
      });

      if (isRateLimitError && item.retries >= this.MAX_RETRIES) {
        item.reject(
          new OpenAIQueueError(
            'OpenAI sta rispondendo lentamente. Riprova tra 30 secondi.',
            'RATE_LIMIT'
          )
        );
      } else {
        item.reject(
          new OpenAIQueueError(
            'Errore durante l\'elaborazione. Riprova.',
            'PROCESSING_ERROR'
          )
        );
      }

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
      isOverloaded: this.queue.length > this.MAX_QUEUE_SIZE * 0.8,
      requestDelay: this.MIN_REQUEST_DELAY,
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
