import Database from 'better-sqlite3';
import { ChatSession, ChatMessage, ProductQuery, Conversion, AnalyticsSummary } from './analytics-types';

class AnalyticsDB {
  private db: Database.Database;
  private static instance: AnalyticsDB;

  constructor() {
    // Il database sarà creato nella root del progetto
    this.db = new Database('./analytics.db');
    this.initTables();
  }

  static getInstance(): AnalyticsDB {
    if (!AnalyticsDB.instance) {
      AnalyticsDB.instance = new AnalyticsDB();
    }
    return AnalyticsDB.instance;
  }

  private initTables() {
    // Crea le tabelle se non esistono
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        session_id TEXT UNIQUE NOT NULL,
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        message_count INTEGER DEFAULT 0,
        user_agent TEXT,
        ip_address TEXT,
        converted INTEGER DEFAULT 0,
        contact_data TEXT
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        products_mentioned TEXT,
        price_requested INTEGER DEFAULT 0,
        FOREIGN KEY (session_id) REFERENCES chat_sessions(session_id)
      );

      CREATE TABLE IF NOT EXISTS product_queries (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        query_text TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        responded INTEGER DEFAULT 0,
        FOREIGN KEY (session_id) REFERENCES chat_sessions(session_id)
      );

      CREATE TABLE IF NOT EXISTS conversions (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        type TEXT NOT NULL,
        contact_data TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        products_mentioned TEXT,
        FOREIGN KEY (session_id) REFERENCES chat_sessions(session_id)
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON chat_sessions(start_time);
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON chat_messages(timestamp);
      CREATE INDEX IF NOT EXISTS idx_messages_session ON chat_messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_conversions_timestamp ON conversions(timestamp);
    `);

    console.log('📊 Analytics database initialized');
  }

  // ==================== CHAT SESSIONS ====================

  startSession(sessionId: string, userAgent?: string, ipAddress?: string): void {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO chat_sessions 
      (id, session_id, start_time, user_agent, ip_address)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    stmt.run(id, sessionId, Date.now(), userAgent, ipAddress);
    
    console.log(`📈 Started session: ${sessionId}`);
  }

  endSession(sessionId: string): void {
    const stmt = this.db.prepare(`
      UPDATE chat_sessions 
      SET end_time = ?
      WHERE session_id = ? AND end_time IS NULL
    `);
    
    stmt.run(Date.now(), sessionId);
    console.log(`📊 Ended session: ${sessionId}`);
  }

  // ==================== CHAT MESSAGES ====================

  logMessage(
    sessionId: string, 
    role: 'user' | 'assistant', 
    content: string,
    productsMentioned: string[] = [],
    priceRequested: boolean = false
  ): void {
    // Assicurati che la sessione esista
    this.startSession(sessionId);
    
    const stmt = this.db.prepare(`
      INSERT INTO chat_messages 
      (id, session_id, role, content, timestamp, products_mentioned, price_requested)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const productsJson = JSON.stringify(productsMentioned);
    
    stmt.run(id, sessionId, role, content, Date.now(), productsJson, priceRequested ? 1 : 0);
    
    // Aggiorna il conteggio messaggi della sessione
    const updateStmt = this.db.prepare(`
      UPDATE chat_sessions 
      SET message_count = message_count + 1
      WHERE session_id = ?
    `);
    updateStmt.run(sessionId);
    
    console.log(`💬 Logged ${role} message for session: ${sessionId}`);
  }

  // ==================== CONVERSIONS ====================

  logConversion(
    sessionId: string,
    type: 'contact_form' | 'phone_call' | 'email',
    contactData: any,
    productsMentioned: string[] = []
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO conversions 
      (id, session_id, type, contact_data, timestamp, products_mentioned)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const contactJson = JSON.stringify(contactData);
    const productsJson = JSON.stringify(productsMentioned);
    
    stmt.run(id, sessionId, type, contactJson, Date.now(), productsJson);
    
    // Marca la sessione come convertita
    const updateStmt = this.db.prepare(`
      UPDATE chat_sessions 
      SET converted = 1, contact_data = ?
      WHERE session_id = ?
    `);
    updateStmt.run(contactJson, sessionId);
    
    console.log(`🎯 Logged conversion: ${type} for session: ${sessionId}`);
  }

  close() {
    this.db.close();
  }
}

// Export singleton instance
export const analytics = AnalyticsDB.getInstance();
export default AnalyticsDB;
