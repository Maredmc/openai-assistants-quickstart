"use client";

import React, { useState, useEffect } from "react";
import styles from "./page.module.css";

interface AnalyticsSummary {
  totalSessions: number;
  totalProductRecommendations: number;
  totalProductClicks: number;
  totalAddToCarts: number;
  totalConversions: number;
  totalCheckouts: number;
  conversionRate: string;
}

interface ProductStat {
  productId: string;
  productName: string;
  productPrice?: string;
  count: number;
}

interface Conversation {
  sessionId: string;
  startTime: string;
  endTime: string;
  productsRecommended: string[];
  productsAddedToCart: string[];
  converted: boolean;
  userEmail?: string;
  userPhone?: string;
  events: any[];
}

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [topRecommended, setTopRecommended] = useState<ProductStat[]>([]);
  const [topClicked, setTopClicked] = useState<ProductStat[]>([]);
  const [topCart, setTopCart] = useState<ProductStat[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/analytics/summary');
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      
      setSummary(data.summary);
      setTopRecommended(data.topRecommendedProducts || []);
      setTopClicked(data.topClickedProducts || []);
      setTopCart(data.topCartProducts || []);
      setConversations(data.conversations || []);
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    // Crea CSV delle conversazioni
    const headers = ['Session ID', 'Start Time', 'Products Recommended', 'Products Added to Cart', 'Converted', 'Email', 'Phone'];
    const rows = conversations.map(conv => [
      conv.sessionId,
      new Date(conv.startTime).toLocaleString(),
      conv.productsRecommended.join('; '),
      conv.productsAddedToCart.join('; '),
      conv.converted ? 'Yes' : 'No',
      conv.userEmail || '',
      conv.userPhone || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.loading}>
          <h2>Caricamento analytics...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.error}>
          <h2>❌ Errore</h2>
          <p>{error}</p>
          <button onClick={fetchAnalytics} className={styles.exportButton}>
            Riprova
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1 className={styles.title}>📊 Dashboard Analytics</h1>
        <p className={styles.subtitle}>Monitora le performance del tuo chatbot AI</p>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Sessioni Totali</p>
          <p className={styles.statValue}>{summary?.totalSessions || 0}</p>
        </div>
        
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Prodotti Consigliati</p>
          <p className={styles.statValue}>{summary?.totalProductRecommendations || 0}</p>
        </div>
        
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Aggiunte al Carrello</p>
          <p className={styles.statValue}>{summary?.totalAddToCarts || 0}</p>
        </div>
        
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Conversioni</p>
          <p className={styles.statValue}>{summary?.totalConversions || 0}</p>
          <p className={styles.statChange}>
            Tasso: {summary?.conversionRate || '0%'}
          </p>
        </div>
      </div>

      {/* Top Prodotti Consigliati */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>🏆 Prodotti Più Consigliati dall'AI</h2>
        {topRecommended.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Prodotto</th>
                <th>Prezzo</th>
                <th>Volte Consigliato</th>
              </tr>
            </thead>
            <tbody>
              {topRecommended.map((product, index) => (
                <tr key={product.productId}>
                  <td>{index + 1}</td>
                  <td className={styles.productName}>{product.productName}</td>
                  <td className={styles.productPrice}>{product.productPrice}</td>
                  <td>
                    <span className={styles.badge + ' ' + styles.badgeSuccess}>
                      {product.count}x
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: '#666' }}>Nessun prodotto consigliato ancora</p>
        )}
      </div>

      {/* Top Prodotti Aggiunti al Carrello */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>🛒 Prodotti Più Aggiunti al Carrello</h2>
        {topCart.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Prodotto</th>
                <th>Prezzo</th>
                <th>Aggiunte</th>
              </tr>
            </thead>
            <tbody>
              {topCart.map((product, index) => (
                <tr key={product.productId}>
                  <td>{index + 1}</td>
                  <td className={styles.productName}>{product.productName}</td>
                  <td className={styles.productPrice}>{product.productPrice}</td>
                  <td>
                    <span className={styles.badge + ' ' + styles.badgeSuccess}>
                      {product.count}x
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: '#666' }}>Nessun prodotto aggiunto al carrello ancora</p>
        )}
      </div>

      {/* Conversazioni Recenti */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>💬 Conversazioni Recenti</h2>
        <button onClick={exportToCSV} className={styles.exportButton}>
          📥 Esporta CSV
        </button>
        
        {conversations.length > 0 ? (
          <div style={{ marginTop: '24px' }}>
            {conversations.slice(0, 20).map((conv) => (
              <div key={conv.sessionId} className={styles.conversationCard}>
                <div className={styles.conversationHeader}>
                  <span className={styles.sessionId}>{conv.sessionId}</span>
                  <span className={styles.timestamp}>
                    {new Date(conv.startTime).toLocaleString()}
                  </span>
                </div>
                
                <div className={styles.conversationStats}>
                  <div className={styles.conversationStat}>
                    <strong>📦 Consigliati:</strong> {conv.productsRecommended.length}
                  </div>
                  <div className={styles.conversationStat}>
                    <strong>🛒 Al carrello:</strong> {conv.productsAddedToCart.length}
                  </div>
                  <div className={styles.conversationStat}>
                    {conv.converted ? (
                      <span className={styles.badge + ' ' + styles.badgeSuccess}>
                        ✅ Convertito
                      </span>
                    ) : (
                      <span className={styles.badge + ' ' + styles.badgeWarning}>
                        ⏳ In corso
                      </span>
                    )}
                  </div>
                </div>
                
                {conv.productsRecommended.length > 0 && (
                  <div style={{ marginTop: '12px', fontSize: '14px', color: '#666' }}>
                    <strong>Prodotti:</strong> {conv.productsRecommended.join(', ')}
                  </div>
                )}
                
                {conv.converted && (conv.userEmail || conv.userPhone) && (
                  <div style={{ marginTop: '8px', fontSize: '14px', color: '#10b981' }}>
                    <strong>Contatto:</strong> {conv.userEmail} {conv.userPhone}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#666', marginTop: '20px' }}>Nessuna conversazione ancora</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
