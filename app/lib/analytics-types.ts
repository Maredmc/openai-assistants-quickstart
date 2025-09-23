// Analytics data types
export interface ChatSession {
  id: string;
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  messageCount: number;
  userAgent?: string;
  ipAddress?: string;
  converted: boolean;
  contactData?: any;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  productMentioned?: string[];
  priceRequested?: boolean;
}

export interface ProductQuery {
  id: string;
  sessionId: string;
  productName: string;
  queryText: string;
  timestamp: Date;
  responded: boolean;
}

export interface Conversion {
  id: string;
  sessionId: string;
  type: 'contact_form' | 'phone_call' | 'email';
  contactData: any;
  timestamp: Date;
  productsMentioned: string[];
}

export interface AnalyticsSummary {
  totalSessions: number;
  totalMessages: number;
  averageSessionDuration: number;
  conversionRate: number;
  topProductsRequested: Array<{
    product: string;
    count: number;
  }>;
  hourlyActivity: Array<{
    hour: number;
    sessions: number;
  }>;
  dailyActivity: Array<{
    date: string;
    sessions: number;
    conversions: number;
  }>;
}
