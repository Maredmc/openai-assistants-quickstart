import { promises as fs } from 'fs';
import path from 'path';

// Percorso file analytics
const ANALYTICS_FILE = path.join(process.cwd(), 'analytics-data.json');

export interface AnalyticsEvent {
  type: string;
  timestamp: string;
  sessionId: string;
  data: any;
}

export interface AnalyticsData {
  events: AnalyticsEvent[];
}

// Inizializza file se non esiste
async function initAnalyticsFile() {
  try {
    await fs.access(ANALYTICS_FILE);
  } catch {
    await fs.writeFile(ANALYTICS_FILE, JSON.stringify({ events: [] }));
  }
}

// Leggi analytics
export async function readAnalytics(): Promise<AnalyticsData> {
  await initAnalyticsFile();
  const data = await fs.readFile(ANALYTICS_FILE, 'utf-8');
  return JSON.parse(data);
}

// Salva evento
export async function saveEvent(event: AnalyticsEvent) {
  const data = await readAnalytics();
  data.events.push(event);
  
  // Mantieni solo ultimi 1000 eventi
  if (data.events.length > 1000) {
    data.events = data.events.slice(-1000);
  }
  
  await fs.writeFile(ANALYTICS_FILE, JSON.stringify(data, null, 2));
}
