/**
 * 🎯 Componente Queue Status - Mostra posizione in coda
 */

'use client';

import { useEffect, useState } from 'react';
import styles from './queue-status.module.css';

export type QueueStatusData = {
  position: number;
  totalInQueue: number;
  processing: number;
  estimatedWaitTime: number;
  isOverloaded: boolean;
};

type Props = {
  userId: string;
  onReady?: () => void;
  className?: string;
};

export default function QueueStatus({ userId, onReady, className }: Props) {
  const [status, setStatus] = useState<QueueStatusData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/queue/status?userId=${userId}`);
        
        if (!response.ok) {
          throw new Error('Errore nel controllo coda');
        }

        const data = await response.json();
        
        // Se non è più in coda, notifica
        if (!data.inQueue && status?.position) {
          if (onReady) {
            onReady();
          }
          setStatus(null);
          setIsLoading(false);
          return;
        }

        setStatus(data.status);
        setIsLoading(false);
        setError(null);
      } catch (err) {
        console.error('Errore check queue:', err);
        setError('Errore nel controllo della coda');
        setIsLoading(false);
      }
    };

    // Check iniziale
    checkStatus();

    // Poll ogni 2 secondi per aggiornamenti
    interval = setInterval(checkStatus, 2000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [userId, onReady, status?.position]);

  if (isLoading) {
    return (
      <div className={`${styles.container} ${className || ''}`}>
        <div className={styles.loader}></div>
        <p className={styles.message}>Connessione in corso...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${styles.container} ${styles.error} ${className || ''}`}>
        <div className={styles.icon}>⚠️</div>
        <p className={styles.message}>{error}</p>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  // Calcola % progresso (per barra visuale)
  const progressPercent = Math.max(
    0,
    Math.min(100, ((status.totalInQueue - status.position + 1) / status.totalInQueue) * 100)
  );

  return (
    <div className={`${styles.container} ${status.isOverloaded ? styles.warning : ''} ${className || ''}`}>
      {/* Icona principale */}
      <div className={styles.icon}>
        {status.isOverloaded ? '🚦' : '⏳'}
      </div>

      {/* Messaggio principale */}
      <div className={styles.content}>
        <h3 className={styles.title}>
          {status.position === 1 ? 'Quasi pronto!' : 'Sei in coda'}
        </h3>
        
        <p className={styles.position}>
          Posizione: <strong>#{status.position}</strong> di {status.totalInQueue}
        </p>

        {/* Barra progresso */}
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Tempo stimato */}
        <p className={styles.estimate}>
          Tempo stimato: <strong>~{status.estimatedWaitTime}s</strong>
        </p>

        {/* Info aggiuntive */}
        <div className={styles.info}>
          <span className={styles.infoItem}>
            👥 {status.processing} in elaborazione
          </span>
          <span className={styles.infoItem}>
            📊 {status.totalInQueue} in attesa
          </span>
        </div>

        {/* Warning se sovraccarico */}
        {status.isOverloaded && (
          <div className={styles.warningBox}>
            <p>⚡ Sistema sotto carico. Grazie per la pazienza!</p>
          </div>
        )}
      </div>

      {/* Animazione pulsante */}
      <div className={styles.pulseAnimation}>
        <div className={styles.pulse}></div>
      </div>
    </div>
  );
}
