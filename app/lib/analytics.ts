// Analytics temporaneamente disabilitato per risolvere problema con better-sqlite3 su Vercel

/*
import Database from 'better-sqlite3';
import { ChatSession, ChatMessage, ProductQuery, Conversion, AnalyticsSummary } from './analytics-types';

class AnalyticsDB {
  // ... codice commentato
}

export const analytics = AnalyticsDB.getInstance();
export default AnalyticsDB;
*/

// Export placeholder per evitare errori di import
export const analytics = {
  startSession: () => {},
  endSession: () => {},
  logMessage: () => {},
  logConversion: () => {},
  close: () => {}
};

export default class AnalyticsDB {
  static getInstance() {
    return analytics;
  }
}
