/**
 * 🎯 Smart Queue Manager - Ottimizzato per OpenAI Tier 1 (500 RPM)
 * 
 * Features:
 * - Max 5 richieste simultanee (ottimale per Tier 1)
 * - Max 100 utenti in coda
 * - Feedback posizione in coda in tempo reale
 * - Retry automatico con exponential backoff per rate limits
 * - Delay minimo 150ms tra richieste
 * 
 * Capacità: ~80-100 utenti concorrenti
 */

import { secureLog } from './secure-logger';

// Configurazione ottimizzata per Tier 1 (500 RPM)
const CONFIG = {
  MAX_CONCURRENT: parseInt(process.env.OPENAI_QUEUE_MAX_CONCURRENT || '5'),
  MAX_QUEUE_SIZE: parseInt(process.env.OPENAI_QUEUE_MAX_SIZE || '100'),
  MIN_REQUEST_DELAY: parseInt(process.env.OPENAI_QUEUE_MIN_DELAY || '150'), // ms
  REQUEST_TIMEOUT: 30000, // 30 secondi
  MAX_RETRIES: 3,
  INITIAL_RETRY_DELAY: 1000, // 1 secondo
};

export type QueueStatus = {
  position: number;
  totalInQueue: number;
  processing: number;
  estimatedWaitTime: number; // secondi
  isOverloaded: boolean;
};

export type QueueItem<T> = {
  id: string;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
  fn: () => Promise<T>;
  timestamp: number;
  retries: number;
  userId?: string;
};

export class QueueError extends Error {
  constructor(
    message: string,
    public code: 'QUEUE_FULL' | 'TIMEOUT' | 'RATE_LIMIT' | 'PROCESSING_ERROR',
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'QueueError';
  }
}

class SmartQueueManager {
  private queue: QueueItem<any>[] = [];
  private processing = 0;
  private lastRequestTime = 0;
  private requestCount = 0;

  /**
   * Accoda richiesta con gestione intelligente
   */
  async enqueue<T>(fn: () => Promise<T>, userId?: string): Promise<T> {
    // Check sovraccarico
    if (this.queue.length >= CONFIG.MAX_QUEUE_SIZE) {
      secureLog.warn('Queue full', {
        queueSize: this.queue.length,
        processing: this.processing,
        userId,
      });

      throw new QueueError(
        'Sistema al massimo della capacità. Riprova tra 30 secondi.',
        'QUEUE_FULL',
        30
      );
    }

    const id = this.generateId();

    return new Promise<T>((resolve, reject) => {
      // Timeout handler
      const timeoutId = setTimeout(() => {
        const index = this.queue.findIndex((item) => item.id === id);
        if (index !== -1) {
          this.queue.splice(index, 1);
          reject(
            new QueueError(
              'Richiesta scaduta dopo 30 secondi. Sistema sotto carico.',
              'TIMEOUT'
            )
          );
        }
      }, CONFIG.REQUEST_TIMEOUT);

      this.queue.push({
        id,
        resolve: (value) => {
          clearTimeout(timeoutId);
          resolve(value);
        },
        reject: (reason) => {
          clearTimeout(timeoutId);
          reject(reason);
        },
        fn,
        timestamp: Date.now(),
        retries: 0,
        userId,
      });

      this.processQueue();
    });
  }

  /**
   * Ottieni posizione in coda per un utente
   */
  getQueuePosition(userId: string): QueueStatus | null {
    const position = this.queue.findIndex((item) => item.userId === userId);
    
    if (position === -1) {
      return null;
    }

    // Stima tempo attesa: (posizione + processing) * 5 secondi medi per richiesta
    const estimatedWaitTime = Math.ceil(
      ((position + this.processing) * 5) / CONFIG.MAX_CONCURRENT
    );

    return {
      position: position + 1, // 1-based per visualizzazione
      totalInQueue: this.queue.length,
      processing: this.processing,
      estimatedWaitTime,
      isOverloaded: this.isOverloaded(),
    };
  }

  /**
   * Ottieni statistiche complete
   */
  getStats(): QueueStatus {
    const estimatedWaitTime = Math.ceil(
      (this.queue.length * 5) / CONFIG.MAX_CONCURRENT
    );

    return {
      position: 0,
      totalInQueue: this.queue.length,
      processing: this.processing,
      estimatedWaitTime,
      isOverloaded: this.isOverloaded(),
    };
  }

  /**
   * Check sovraccarico (>80% capacità)
   */
  isOverloaded(): boolean {
    return this.queue.length >= CONFIG.MAX_QUEUE_SIZE * 0.8;
  }

  /**
   * Processa la coda con rate limiting intelligente
   */
  private async processQueue() {
    if (this.processing >= CONFIG.MAX_CONCURRENT || this.queue.length === 0) {
      return;
    }

    // Rate limiting: aspetta il delay minimo tra richieste
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < CONFIG.MIN_REQUEST_DELAY) {
      setTimeout(() => this.processQueue(), CONFIG.MIN_REQUEST_DELAY - timeSinceLastRequest);
      return;
    }

    this.processing++;
    this.lastRequestTime = Date.now();
    const item = this.queue.shift();

    if (!item) {
      this.processing--;
      return;
    }

    try {
      const result = await this.executeWithRetry(item);
      item.resolve(result);

      const duration = Date.now() - item.timestamp;
      secureLog.debug('Request completed', {
        duration,
        queueSize: this.queue.length,
        userId: item.userId,
      });
    } catch (error) {
      this.handleError(item, error);
    } finally {
      this.processing--;
      this.requestCount++;
      
      // Processa prossimo dopo il delay
      setTimeout(() => this.processQueue(), CONFIG.MIN_REQUEST_DELAY);
    }
  }

  /**
   * Esegui con retry automatico per rate limits
   */
  private async executeWithRetry<T>(item: QueueItem<T>): Promise<T> {
    try {
      return await item.fn();
    } catch (error: any) {
      // Rate limit da OpenAI (429)
      if (error?.status === 429 && item.retries < CONFIG.MAX_RETRIES) {
        item.retries++;
        const delay = CONFIG.INITIAL_RETRY_DELAY * Math.pow(2, item.retries - 1);
        
        secureLog.warn('Rate limit hit, retrying', {
          retries: item.retries,
          delay,
          userId: item.userId,
        });

        await this.sleep(delay);
        return this.executeWithRetry(item);
      }

      throw error;
    }
  }

  /**
   * Gestione errori
   */
  private handleError(item: QueueItem<any>, error: any) {
    secureLog.error('Request failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      retries: item.retries,
      userId: item.userId,
    });

    // Rate limit OpenAI
    if (error?.status === 429) {
      const retryAfter = error?.headers?.['retry-after'] || 30;
      item.reject(
        new QueueError(
          `Sistema OpenAI temporaneamente sovraccarico. Riprova tra ${retryAfter} secondi.`,
          'RATE_LIMIT',
          parseInt(retryAfter)
        )
      );
      return;
    }

    // Altri errori
    item.reject(
      new QueueError(
        'Errore durante elaborazione. Riprova.',
        'PROCESSING_ERROR'
      )
    );
  }

  /**
   * Utility: sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Genera ID univoco
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton globale
export const smartQueue = new SmartQueueManager();

// Export per compatibilità
export default smartQueue;
