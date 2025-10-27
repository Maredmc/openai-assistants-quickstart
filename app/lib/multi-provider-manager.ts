/**
 * 🔄 Multi-Provider Manager con Fallback Automatico
 * 
 * Passa automaticamente da OpenAI ad Anthropic quando:
 * - Rate limit raggiunto
 * - Errori di API
 * - Timeout
 * 
 * Features:
 * - Circuit breaker pattern
 * - Automatic recovery
 * - Health monitoring
 * 
 * NOTA: Questo modulo è OPZIONALE e standalone.
 * Se Anthropic non è configurato, semplicemente non farà nulla.
 */

// Simple logger
const log = (message: string, level: 'INFO' | 'WARNING' | 'ERROR' = 'INFO') => {
  if (process.env.NODE_ENV === 'development') {
    const timestamp = new Date().toISOString();
    const emoji = level === 'ERROR' ? '❌' : level === 'WARNING' ? '⚠️' : 'ℹ️';
    console.log(`${emoji} [${timestamp}] ${message}`);
  }
};

type Provider = 'openai' | 'anthropic';

interface ProviderStatus {
  healthy: boolean;
  failureCount: number;
  lastFailure: Date | null;
  lastSuccess: Date | null;
  circuitOpen: boolean;
}

interface ProviderMessage {
  role: 'user' | 'assistant';
  content: string;
}

class MultiProviderManager {
  private anthropic: any = null;
  private currentProvider: Provider = 'openai';
  private providerStatus: Map<Provider, ProviderStatus> = new Map();
  
  // Configuration
  private readonly MAX_FAILURES = 3;
  private readonly CIRCUIT_RESET_TIME = 60000; // 1 minuto
  private readonly RECOVERY_CHECK_INTERVAL = 30000; // 30 secondi
  
  constructor() {
    // Inizializza status providers
    this.providerStatus.set('openai', {
      healthy: true,
      failureCount: 0,
      lastFailure: null,
      lastSuccess: new Date(),
      circuitOpen: false
    });
    
    this.providerStatus.set('anthropic', {
      healthy: true,
      failureCount: 0,
      lastFailure: null,
      lastSuccess: null,
      circuitOpen: false
    });

    // Inizializza Anthropic solo se configurato E se il package è installato
    if (process.env.ANTHROPIC_API_KEY && process.env.USE_CLAUDE_FALLBACK === 'true') {
      try {
        // Dynamic import per evitare errori se il package non è installato
        const Anthropic = require('@anthropic-ai/sdk');
        this.anthropic = new Anthropic.default({
          apiKey: process.env.ANTHROPIC_API_KEY
        });
        log('✅ Anthropic fallback enabled', 'INFO');
      } catch (error: any) {
        log(`⚠️ Anthropic SDK not installed - fallback disabled. Run: npm install @anthropic-ai/sdk`, 'WARNING');
      }
    } else {
      log('ℹ️ Anthropic fallback not configured (set USE_CLAUDE_FALLBACK=true)', 'INFO');
    }

    // Avvia monitoring solo se Anthropic è disponibile
    if (this.anthropic) {
      this.startHealthMonitoring();
    }
  }

  /**
   * 🔍 Verifica se OpenAI è disponibile
   */
  private isOpenAIHealthy(): boolean {
    const status = this.providerStatus.get('openai');
    if (!status) return false;

    // Se il circuit breaker è aperto, verifica se è tempo di riprovare
    if (status.circuitOpen) {
      const timeSinceFailure = Date.now() - (status.lastFailure?.getTime() || 0);
      if (timeSinceFailure > this.CIRCUIT_RESET_TIME) {
        // Reset circuit breaker
        status.circuitOpen = false;
        status.failureCount = 0;
        log('🔓 OpenAI circuit breaker reset', 'INFO');
        return true;
      }
      return false;
    }

    return status.healthy && status.failureCount < this.MAX_FAILURES;
  }

  /**
   * 🚨 Registra fallimento OpenAI e attiva fallback
   */
  async handleOpenAIFailure(error: any): Promise<{ shouldFallback: boolean; provider: Provider }> {
    const status = this.providerStatus.get('openai');
    if (!status) return { shouldFallback: false, provider: 'openai' };

    status.failureCount++;
    status.lastFailure = new Date();

    const errorCode = error?.status || error?.code;
    const errorMessage = error?.message || '';

    log(`❌ OpenAI failure #${status.failureCount}: ${errorCode} - ${errorMessage}`, 'ERROR');

    // Verifica se è un rate limit error
    const isRateLimit = errorCode === 429 || 
                       errorMessage.includes('rate_limit') ||
                       errorMessage.includes('quota');

    // Verifica se è un errore server (5xx)
    const isServerError = errorCode >= 500 && errorCode < 600;

    // Attiva circuit breaker se:
    // 1. Rate limit raggiunto
    // 2. Troppi fallimenti consecutivi
    // 3. Errore server persistente
    if (isRateLimit || status.failureCount >= this.MAX_FAILURES || isServerError) {
      status.healthy = false;
      status.circuitOpen = true;
      
      log('🔒 OpenAI circuit breaker OPENED - switching to Anthropic', 'WARNING');

      // Passa ad Anthropic se disponibile
      if (this.anthropic) {
        this.currentProvider = 'anthropic';
        return { shouldFallback: true, provider: 'anthropic' };
      }
    }

    return { shouldFallback: false, provider: 'openai' };
  }

  /**
   * ✅ Registra successo OpenAI
   */
  markOpenAISuccess(): void {
    const status = this.providerStatus.get('openai');
    if (!status) return;

    status.healthy = true;
    status.failureCount = 0;
    status.lastSuccess = new Date();
    status.circuitOpen = false;

    // Se eravamo su Anthropic, torna a OpenAI
    if (this.currentProvider === 'anthropic') {
      log('✅ OpenAI recovered - switching back from Anthropic', 'INFO');
      this.currentProvider = 'openai';
    }
  }

  /**
   * 🤖 Invia messaggio ad Anthropic (fallback)
   */
  async sendToAnthropic(
    messages: ProviderMessage[],
    systemPrompt?: string
  ): Promise<string> {
    if (!this.anthropic) {
      throw new Error('Anthropic not configured');
    }

    try {
      log('📤 Sending request to Anthropic', 'INFO');

      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system: systemPrompt || 'You are a helpful assistant for an e-commerce furniture store.',
        messages: messages.map((msg: ProviderMessage) => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        }))
      });

      const anthropicStatus = this.providerStatus.get('anthropic');
      if (anthropicStatus) {
        anthropicStatus.lastSuccess = new Date();
        anthropicStatus.healthy = true;
      }

      const content = response.content[0];
      const responseText = content.type === 'text' ? content.text : '';
      
      log(`✅ Anthropic response received (${responseText.length} chars)`, 'INFO');

      return responseText;

    } catch (error: any) {
      log(`❌ Anthropic error: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * 🔍 Health monitoring - controlla periodicamente lo stato dei provider
   */
  private startHealthMonitoring(): void {
    setInterval(() => {
      const openaiStatus = this.providerStatus.get('openai');
      const anthropicStatus = this.providerStatus.get('anthropic');

      if (openaiStatus && openaiStatus.circuitOpen) {
        const timeSinceFailure = Date.now() - (openaiStatus.lastFailure?.getTime() || 0);
        if (timeSinceFailure > this.CIRCUIT_RESET_TIME) {
          log('🔄 Attempting OpenAI recovery...', 'INFO');
          // Il circuit breaker verrà resettato al prossimo check
        }
      }

      // Log status periodico (solo in sviluppo)
      if (process.env.NODE_ENV === 'development') {
        log(
          `📊 Provider Status - Current: ${this.currentProvider} | ` +
          `OpenAI: ${openaiStatus?.healthy ? '✅' : '❌'} (failures: ${openaiStatus?.failureCount}) | ` +
          `Anthropic: ${anthropicStatus?.healthy ? '✅' : '❌'}`,
          'INFO'
        );
      }
    }, this.RECOVERY_CHECK_INTERVAL);
  }

  /**
   * 📊 Ottieni provider corrente
   */
  getCurrentProvider(): Provider {
    return this.currentProvider;
  }

  /**
   * 📊 Ottieni status di tutti i provider
   */
  getProviderStatus(): Map<Provider, ProviderStatus> {
    return new Map(this.providerStatus);
  }

  /**
   * 🔧 Forza cambio provider (per testing)
   */
  forceProvider(provider: Provider): void {
    if (provider === 'anthropic' && !this.anthropic) {
      throw new Error('Cannot force Anthropic - not configured');
    }
    this.currentProvider = provider;
    log(`🔧 Forced provider switch to: ${provider}`, 'INFO');
  }
}

// Singleton instance
export const multiProviderManager = new MultiProviderManager();
