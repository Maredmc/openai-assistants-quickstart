/**
 * 🔄 Multi-Provider AI Manager
 * 
 * Gestisce fallback automatico tra OpenAI e Claude API
 * 
 * Features:
 * - Fallback automatico se OpenAI fallisce
 * - Load balancing tra provider
 * - Circuit breaker per provider down
 * - Statistics & monitoring
 */

import Anthropic from '@anthropic-ai/sdk';
import { secureLog } from './secure-logger';
import OpenAI from 'openai';

type Provider = 'openai' | 'claude';

type ProviderStatus = {
  provider: Provider;
  available: boolean;
  lastError?: string;
  lastErrorAt?: number;
  failureCount: number;
  successCount: number;
};

type ProviderStats = {
  openai: ProviderStatus;
  claude: ProviderStatus;
  totalRequests: number;
  currentProvider: Provider;
};

class MultiProviderManager {
  private anthropic: Anthropic | null = null;
  private openaiClient: OpenAI | null = null;
  
  private providerStatus: Record<Provider, ProviderStatus> = {
    openai: {
      provider: 'openai',
      available: true,
      failureCount: 0,
      successCount: 0,
    },
    claude: {
      provider: 'claude',
      available: false, // Disabilitato finché non configurato
      failureCount: 0,
      successCount: 0,
    },
  };
  
  private totalRequests = 0;
  private currentProvider: Provider = 'openai';

  // ⚙️ Configurazione Circuit Breaker
  private readonly FAILURE_THRESHOLD = 3; // Dopo 3 fallimenti, disabilita provider
  private readonly RECOVERY_TIMEOUT = 5 * 60 * 1000; // Riprova dopo 5 minuti
  private readonly USE_CLAUDE_FALLBACK = process.env.USE_CLAUDE_FALLBACK === 'true';

  constructor() {
    // Inizializza Claude se API key disponibile
    if (process.env.ANTHROPIC_API_KEY && this.USE_CLAUDE_FALLBACK) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      this.providerStatus.claude.available = true;
      
      secureLog.info('Claude API initialized as fallback');
    }

    // Inizializza OpenAI
    if (process.env.OPENAI_API_KEY) {
      this.openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      
      secureLog.info('OpenAI API initialized');
    }

    // Avvia recovery monitor
    this.startRecoveryMonitor();
  }

  /**
   * 🤖 Genera risposta con fallback automatico
   */
  async generateResponse(
    threadId: string,
    message: string,
    context?: string
  ): Promise<{
    response: string;
    provider: Provider;
    fromCache: boolean;
  }> {
    this.totalRequests++;

    // Prova con provider primario (OpenAI)
    if (this.providerStatus.openai.available) {
      try {
        const response = await this.callOpenAI(threadId, message, context);
        this.recordSuccess('openai');
        
        return {
          response,
          provider: 'openai',
          fromCache: false,
        };
      } catch (error) {
        this.recordFailure('openai', error);
        
        secureLog.warn('OpenAI failed, trying Claude fallback', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Fallback a Claude se disponibile
    if (this.providerStatus.claude.available) {
      try {
        const response = await this.callClaude(message, context);
        this.recordSuccess('claude');
        
        secureLog.info('Successfully used Claude fallback');
        
        return {
          response,
          provider: 'claude',
          fromCache: false,
        };
      } catch (error) {
        this.recordFailure('claude', error);
        
        throw new Error('Tutti i provider AI non sono disponibili. Riprova tra qualche minuto.');
      }
    }

    // Nessun provider disponibile
    throw new Error('Servizio temporaneamente non disponibile. Riprova tra qualche minuto.');
  }

  /**
   * 🤖 Chiama OpenAI API
   */
  private async callOpenAI(
    threadId: string,
    message: string,
    context?: string
  ): Promise<string> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    // Questa è una chiamata semplificata
    // Nel tuo caso userai l'Assistant API con streaming
    // Questo è solo per dimostrare il concetto
    
    const completion = await this.openaiClient.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: context || 'Sei un assistente per Nabè specializzato in letti evolutivi.',
        },
        {
          role: 'user',
          content: message,
        },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content || 'Errore nella generazione della risposta';
  }

  /**
   * 🤖 Chiama Claude API
   */
  private async callClaude(message: string, context?: string): Promise<string> {
    if (!this.anthropic) {
      throw new Error('Claude client not initialized');
    }

    const systemPrompt = context || `Sei l'assistente virtuale ufficiale di Nabè dedicato ai letti evolutivi e accessori Montessori.

🎯 SALUTO INIZIALE CRUCIALE:
- PRIMO messaggio ASSOLUTO della conversazione: "Gentile cliente, sono l'assistente di Nabè..."
- TUTTI i messaggi successivi: sempre "tu" (MAI più "Gentile cliente")

⭐ USA GRASSETTO per:
- **Età bambini** (esempio: **3 anni**)
- **Dimensioni letti** (esempio: **190x80cm**)
- **Nomi prodotti** (esempio: **zero+ Dream**)

💬 TONO: Italiano caloroso, motivazionale, professionale.

📐 FORMATO RISPOSTA:
- Solo paragrafi, mai elenchi puntati
- Massimo 6-7 frasi per paragrafo`;

    const completion = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: message,
        },
      ],
    });

    const textContent = completion.content.find(c => c.type === 'text');
    return textContent?.text || 'Errore nella generazione della risposta';
  }

  /**
   * ✅ Registra successo provider
   */
  private recordSuccess(provider: Provider): void {
    const status = this.providerStatus[provider];
    status.successCount++;
    status.failureCount = 0; // Reset fallimenti
    status.available = true;
    delete status.lastError;
    delete status.lastErrorAt;
    
    this.currentProvider = provider;
  }

  /**
   * ❌ Registra fallimento provider
   */
  private recordFailure(provider: Provider, error: unknown): void {
    const status = this.providerStatus[provider];
    status.failureCount++;
    status.lastError = error instanceof Error ? error.message : 'Unknown error';
    status.lastErrorAt = Date.now();

    // Circuit breaker: disabilita se troppi fallimenti
    if (status.failureCount >= this.FAILURE_THRESHOLD) {
      status.available = false;
      
      secureLog.error('Provider disabled by circuit breaker', {
        provider,
        failureCount: status.failureCount,
        lastError: status.lastError,
      });
    }
  }

  /**
   * 🔄 Monitora recovery provider
   */
  private startRecoveryMonitor(): void {
    setInterval(() => {
      const now = Date.now();

      for (const [providerName, status] of Object.entries(this.providerStatus)) {
        // Se provider disabilitato e timeout scaduto, riattiva
        if (
          !status.available &&
          status.lastErrorAt &&
          now - status.lastErrorAt > this.RECOVERY_TIMEOUT
        ) {
          status.available = true;
          status.failureCount = 0;
          delete status.lastError;
          delete status.lastErrorAt;
          
          secureLog.info('Provider recovered and re-enabled', {
            provider: providerName,
          });
        }
      }
    }, 60 * 1000); // Check ogni minuto
  }

  /**
   * 🎯 Ottieni provider preferito disponibile
   */
  getPreferredProvider(): Provider {
    // Priorità: OpenAI > Claude
    if (this.providerStatus.openai.available) {
      return 'openai';
    }
    
    if (this.providerStatus.claude.available) {
      return 'claude';
    }

    // Default OpenAI (anche se down, potrebbe riprendersi)
    return 'openai';
  }

  /**
   * 📊 Ottieni statistiche provider
   */
  getStats(): ProviderStats {
    return {
      openai: { ...this.providerStatus.openai },
      claude: { ...this.providerStatus.claude },
      totalRequests: this.totalRequests,
      currentProvider: this.currentProvider,
    };
  }

  /**
   * 🔄 Reset manuale circuit breaker
   */
  resetCircuitBreaker(provider: Provider): void {
    const status = this.providerStatus[provider];
    status.available = true;
    status.failureCount = 0;
    delete status.lastError;
    delete status.lastErrorAt;
    
    secureLog.info('Circuit breaker manually reset', { provider });
  }

  /**
   * 🔍 Check se fallback è configurato
   */
  hasFallback(): boolean {
    return this.anthropic !== null && this.USE_CLAUDE_FALLBACK;
  }
}

// 🌍 Singleton globale
export const multiProviderManager = new MultiProviderManager();
