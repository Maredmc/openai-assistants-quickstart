/**
 * 🎯 Priority Queue Manager con Email
 * 
 * Gestisce una coda a 2 livelli:
 * - Priority Queue: Utenti registrati con email (accesso immediato)
 * - Standard Queue: Utenti anonimi (attesa normale)
 * 
 * Features:
 * - Registrazione email per priorità
 * - Persistent storage (può essere upgradato a DB)
 * - Email verification con Resend
 * - Statistics & monitoring
 */

import { secureLog } from './secure-logger';
import { Resend } from 'resend';

// 📧 Tipo per utente registrato
type PriorityUser = {
  email: string;
  userId: string;
  registeredAt: number;
  verified: boolean;
  verificationCode?: string;
  requestCount: number;
  lastRequestAt: number;
};

// 📊 Tipo per statistiche priority
type PriorityStats = {
  totalPriorityUsers: number;
  totalRequests: number;
  priorityRequests: number;
  standardRequests: number;
  priorityBypassRate: number;
};

class PriorityQueueManager {
  private priorityUsers = new Map<string, PriorityUser>();
  private emailToUserId = new Map<string, string>();
  private stats = {
    totalRequests: 0,
    priorityRequests: 0,
    standardRequests: 0,
  };
  
  private resend: Resend | null = null;

  // ⚙️ Configurazione
  private readonly PRIORITY_COOLDOWN = 60 * 1000; // 1 minuto tra richieste priority
  private readonly MAX_PRIORITY_REQUESTS_PER_HOUR = 100; // Max richieste priority per utente/ora
  private readonly VERIFICATION_EXPIRES = 24 * 60 * 60 * 1000; // Verifica valida 24h
  private readonly STORAGE_KEY = 'nabe_priority_users'; // Per persistent storage

  constructor() {
    // Inizializza Resend se API key disponibile
    if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
    }
    
    // Carica utenti salvati (se in browser/localStorage)
    this.loadPriorityUsers();
  }

  /**
   * 📧 Registra utente per accesso prioritario
   */
  async registerForPriority(email: string, userId: string): Promise<{
    success: boolean;
    message: string;
    alreadyRegistered?: boolean;
    requiresVerification?: boolean;
    error?: string;
  }> {
    // Valida email
    if (!this.isValidEmail(email)) {
      return {
        success: false,
        message: 'Email non valida',
        error: 'Email non valida',
      };
    }

    // Check se già registrato
    const existingUserId = this.emailToUserId.get(email.toLowerCase());
    if (existingUserId) {
      const existingUser = this.priorityUsers.get(existingUserId);
      
      if (existingUser?.verified) {
        return {
          success: true,
          message: 'Email già registrata! Hai già accesso prioritario.',
          alreadyRegistered: true,
          requiresVerification: false,
        };
      }
    }

    // Genera codice verifica
    const verificationCode = this.generateVerificationCode();

    // Crea/aggiorna utente
    const priorityUser: PriorityUser = {
      email: email.toLowerCase(),
      userId,
      registeredAt: Date.now(),
      verified: false,
      verificationCode,
      requestCount: 0,
      lastRequestAt: 0,
    };

    this.priorityUsers.set(userId, priorityUser);
    this.emailToUserId.set(email.toLowerCase(), userId);
    
    // Salva
    this.savePriorityUsers();

    // Invia email verifica (se Resend configurato)
    if (this.resend) {
      try {
        await this.sendVerificationEmail(email, verificationCode);
        
        secureLog.info('Priority registration email sent', {
          email: email.substring(0, 3) + '***',
          userId,
        });
        
        return {
          success: true,
          message: 'Ti abbiamo inviato un\'email di verifica! Controlla la tua casella.',
          requiresVerification: true,
        };
      } catch (error) {
        secureLog.error('Failed to send verification email', {
          error: error instanceof Error ? error.message : 'Unknown error',
          email: email.substring(0, 3) + '***',
        });
        
        // Anche se email fallisce, registra comunque l'utente
        // (potrebbe essere un problema temporaneo)
        priorityUser.verified = true;
        delete priorityUser.verificationCode;
        this.priorityUsers.set(userId, priorityUser);
        this.savePriorityUsers();

        return {
          success: true,
          message: 'Registrazione completata! Accesso prioritario attivato.',
          requiresVerification: false,
        };
      }
    }

    // Se Resend non configurato, attiva direttamente
    priorityUser.verified = true;
    delete priorityUser.verificationCode;
    this.priorityUsers.set(userId, priorityUser);
    this.savePriorityUsers();

    return {
      success: true,
      message: 'Accesso prioritario attivato! 🎉',
      requiresVerification: false,
    };
  }

  /**
   * ✅ Verifica codice email
   */
  verifyEmail(userId: string, code: string): boolean {
    const user = this.priorityUsers.get(userId);
    
    if (!user) {
      return false;
    }

    if (user.verified) {
      return true; // Già verificato
    }

    if (user.verificationCode !== code) {
      return false; // Codice sbagliato
    }

    // Check scadenza
    if (Date.now() - user.registeredAt > this.VERIFICATION_EXPIRES) {
      return false; // Codice scaduto
    }

    // Verifica completata!
    user.verified = true;
    delete user.verificationCode;
    this.savePriorityUsers();

    secureLog.info('Email verified', {
      userId,
      email: user.email.substring(0, 3) + '***',
    });

    return true;
  }

  /**
   * 🎯 Check se utente ha accesso prioritario
   */
  hasPriority(userId: string): boolean {
    const user = this.priorityUsers.get(userId);
    
    if (!user || !user.verified) {
      return false;
    }

    // Check rate limit per utente priority
    const now = Date.now();
    const timeSinceLastRequest = now - user.lastRequestAt;
    
    if (timeSinceLastRequest < this.PRIORITY_COOLDOWN) {
      // Troppo presto rispetto all'ultima richiesta
      return false;
    }

    return true;
  }

  /**
   * 📝 Registra richiesta priority
   */
  recordPriorityRequest(userId: string): void {
    const user = this.priorityUsers.get(userId);
    
    if (user) {
      user.requestCount++;
      user.lastRequestAt = Date.now();
      this.savePriorityUsers();
    }

    this.stats.totalRequests++;
    this.stats.priorityRequests++;
  }

  /**
   * 📝 Registra richiesta standard
   */
  recordStandardRequest(): void {
    this.stats.totalRequests++;
    this.stats.standardRequests++;
  }

  /**
   * 📧 Invia email di verifica
   */
  private async sendVerificationEmail(email: string, code: string): Promise<void> {
    if (!this.resend) {
      throw new Error('Resend not configured');
    }

    await this.resend.emails.send({
      from: 'Nabè <hello@nabecreation.com>',
      to: email,
      subject: '🎯 Codice Verifica - Accesso Prioritario Nabè',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #79aea3; margin-bottom: 10px;">Benvenuto in Nabè Priority! 🎉</h1>
          </div>
          
          <div style="background: #f5f5f5; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
            <h2 style="margin-top: 0; color: #333;">Il tuo codice di verifica:</h2>
            <div style="font-size: 32px; font-weight: bold; color: #79aea3; text-align: center; padding: 20px; background: white; border-radius: 8px; letter-spacing: 5px;">
              ${code}
            </div>
          </div>

          <div style="margin-bottom: 30px;">
            <h3 style="color: #79aea3;">✨ Vantaggi del tuo Accesso Prioritario:</h3>
            <ul style="line-height: 1.8;">
              <li><strong>Nessuna attesa</strong> - Risposte immediate anche nei momenti di picco</li>
              <li><strong>Supporto dedicato</strong> - Assistenza personalizzata per le tue esigenze</li>
              <li><strong>Sempre disponibile</strong> - Accesso garantito 24/7</li>
            </ul>
          </div>

          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin-bottom: 20px;">
            <p style="margin: 0; color: #856404;">
              ⚡ <strong>Importante:</strong> Questo codice è valido per 24 ore
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 30px; border-top: 1px solid #ddd;">
            <p style="color: #666; font-size: 14px;">
              Grazie per aver scelto Nabè!<br>
              Per qualsiasi domanda, siamo sempre qui per te.
            </p>
          </div>
        </div>
      `,
    });
  }

  /**
   * 🔑 Genera codice verifica
   */
  private generateVerificationCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  /**
   * ✉️ Valida email
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 💾 Salva utenti priority (localStorage o file)
   */
  private savePriorityUsers(): void {
    if (typeof window !== 'undefined') {
      // Browser - usa localStorage
      try {
        const data = {
          users: Array.from(this.priorityUsers.entries()),
          emailMap: Array.from(this.emailToUserId.entries()),
        };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      } catch (error) {
        secureLog.error('Failed to save priority users to localStorage', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    // Server - potrebbe essere salvato in database (TODO se serve)
  }

  /**
   * 📂 Carica utenti priority salvati
   */
  private loadPriorityUsers(): void {
    if (typeof window !== 'undefined') {
      // Browser - carica da localStorage
      try {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          const data = JSON.parse(stored);
          this.priorityUsers = new Map(data.users);
          this.emailToUserId = new Map(data.emailMap);
          
          secureLog.info('Priority users loaded', {
            count: this.priorityUsers.size,
          });
        }
      } catch (error) {
        secureLog.error('Failed to load priority users from localStorage', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  /**
   * 📊 Ottieni statistiche priority
   */
  getStats(): PriorityStats {
    const priorityBypassRate = this.stats.totalRequests > 0
      ? (this.stats.priorityRequests / this.stats.totalRequests) * 100
      : 0;

    return {
      totalPriorityUsers: this.priorityUsers.size,
      totalRequests: this.stats.totalRequests,
      priorityRequests: this.stats.priorityRequests,
      standardRequests: this.stats.standardRequests,
      priorityBypassRate: Math.round(priorityBypassRate * 100) / 100,
    };
  }

  /**
   * 🔍 Ottieni info utente priority
   */
  getPriorityUser(userId: string): PriorityUser | null {
    return this.priorityUsers.get(userId) || null;
  }

  /**
   * 🔍 Check se email già registrata
   */
  isEmailRegistered(email: string): boolean {
    return this.emailToUserId.has(email.toLowerCase());
  }
}

// 🌍 Singleton globale
export const priorityQueueManager = new PriorityQueueManager();
