// Performance Monitor per Chat AI
// Monitora tempi di risposta, errori e performance del sistema

interface PerformanceMetrics {
  chatResponseTime: number[];
  apiErrors: number;
  cacheHits: number;
  cacheMisses: number;
  totalRequests: number;
  startTime: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    chatResponseTime: [],
    apiErrors: 0,
    cacheHits: 0,
    cacheMisses: 0,
    totalRequests: 0,
    startTime: Date.now()
  };

  // Inizia tracking tempo risposta chat
  startChatResponse() {
    return Date.now();
  }

  // Completa tracking tempo risposta chat
  endChatResponse(startTime: number) {
    const responseTime = Date.now() - startTime;
    this.metrics.chatResponseTime.push(responseTime);
    
    // Mantieni solo ultimi 50 tempi
    if (this.metrics.chatResponseTime.length > 50) {
      this.metrics.chatResponseTime.shift();
    }

    console.log(`📊 [Performance] Chat response: ${responseTime}ms`);
    
    // Alert se troppo lento
    if (responseTime > 3000) {
      console.warn(`⚠️ [Performance] Slow response detected: ${responseTime}ms`);
    }

    return responseTime;
  }

  // Tracking errori API
  recordApiError(api: string, error: string) {
    this.metrics.apiErrors++;
    console.error(`❌ [Performance] API Error (${api}): ${error}`);
  }

  // Tracking cache
  recordCacheHit() {
    this.metrics.cacheHits++;
    this.metrics.totalRequests++;
  }

  recordCacheMiss() {
    this.metrics.cacheMisses++;
    this.metrics.totalRequests++;
  }

  // Statistiche in tempo reale
  getStats() {
    const uptime = Date.now() - this.metrics.startTime;
    const avgResponseTime = this.metrics.chatResponseTime.length > 0 
      ? this.metrics.chatResponseTime.reduce((a, b) => a + b, 0) / this.metrics.chatResponseTime.length 
      : 0;
    
    const cacheHitRate = this.metrics.totalRequests > 0 
      ? (this.metrics.cacheHits / this.metrics.totalRequests) * 100 
      : 0;

    return {
      uptime: Math.round(uptime / 1000), // secondi
      avgResponseTime: Math.round(avgResponseTime),
      recentResponseTimes: this.metrics.chatResponseTime.slice(-10),
      totalErrors: this.metrics.apiErrors,
      cacheHitRate: Math.round(cacheHitRate),
      totalRequests: this.metrics.totalRequests
    };
  }

  // Log statistiche ogni minuto
  startPeriodicLogging() {
    setInterval(() => {
      const stats = this.getStats();
      console.log('📊 [Performance Monitor]', {
        uptime: `${stats.uptime}s`,
        avgResponse: `${stats.avgResponseTime}ms`,
        errors: stats.totalErrors,
        cacheHitRate: `${stats.cacheHitRate}%`,
        requests: stats.totalRequests
      });
    }, 60000); // Ogni minuto
  }

  // Dashboard per sviluppatori
  showDashboard() {
    const stats = this.getStats();
    console.table({
      'Uptime (seconds)': stats.uptime,
      'Avg Response Time (ms)': stats.avgResponseTime,
      'Total Errors': stats.totalErrors,
      'Cache Hit Rate (%)': stats.cacheHitRate,
      'Total Requests': stats.totalRequests
    });
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Auto-start logging in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  performanceMonitor.startPeriodicLogging();
  
  // Dashboard shortcut per sviluppatori
  (window as any).showPerformance = () => performanceMonitor.showDashboard();
  console.log('🔧 Development mode: Run showPerformance() in console for dashboard');
}
