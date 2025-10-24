/**
 * 🎯 Componente Queue Status - Mostra posizione in coda
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import styles from './queue-status.module.css';

type QueueStatusPayload = {
  ticketId: string;
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  position: number;
  queuedAhead: number;
  retryAfter?: number;
  enqueuedAt: number;
  startedAt: number | null;
  finishedAt: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
};

type Props = {
  ticketId: string;
  statusEndpoint: string;
  initialPosition: number;
  initialQueuedAhead?: number;
  retryAfterHint?: number | null;
  onStatus?: (status: QueueStatusPayload) => void;
  className?: string;
};

export default function QueueStatus({
  ticketId,
  statusEndpoint,
  initialPosition,
  initialQueuedAhead = Math.max(0, initialPosition - 1),
  retryAfterHint = null,
  onStatus,
  className,
}: Props) {
  const [status, setStatus] = useState<QueueStatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const initialPositionRef = useRef(Math.max(1, initialPosition));
  const initialQueuedAheadRef = useRef(Math.max(0, initialQueuedAhead));

  useEffect(() => {
    initialPositionRef.current = Math.max(1, initialPosition);
  }, [initialPosition]);

  useEffect(() => {
    initialQueuedAheadRef.current = Math.max(0, initialQueuedAhead);
  }, [initialQueuedAhead]);

  useEffect(() => {
    if (!ticketId || !statusEndpoint) {
      return;
    }

    let cancelled = false;
    let timeout: NodeJS.Timeout | null = null;

    setStatus(null);
    setError(null);
    setIsLoading(true);

    const poll = async () => {
      try {
        const response = await fetch(statusEndpoint, { cache: "no-store" });

        if (!response.ok) {
          throw new Error("Errore nel controllo della coda");
        }

        const data = (await response.json()) as QueueStatusPayload;

        if (cancelled) {
          return;
        }

        setStatus(data);
        setError(null);
        setIsLoading(false);

        if (onStatus) {
          onStatus(data);
        }

        if (data.status === "queued") {
          const delaySeconds = Math.max(
            2,
            data.retryAfter ?? retryAfterHint ?? 3
          );
          timeout = setTimeout(poll, delaySeconds * 1000);
        }
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Errore nel controllo della coda"
        );
        setIsLoading(false);

        const fallbackSeconds = Math.max(3, retryAfterHint ?? 3);
        timeout = setTimeout(poll, fallbackSeconds * 1000);
      }
    };

    poll();

    return () => {
      cancelled = true;
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [ticketId, statusEndpoint, onStatus, retryAfterHint]);

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

  const queuedAhead = status?.queuedAhead ?? initialQueuedAheadRef.current;
  const currentPosition =
    status?.position && status.position > 0
      ? status.position
      : queuedAhead + 1;
  const totalInQueue = Math.max(
    initialPositionRef.current,
    queuedAhead + 1,
    currentPosition
  );
  const progressPercent =
    status?.status === "queued"
      ? Math.max(
          0,
          Math.min(
            100,
            ((totalInQueue - currentPosition + 1) / totalInQueue) * 100
          )
        )
      : 100;
  const estimatedWaitTime =
    status?.status === "queued"
      ? Math.max(
          5,
          (status.retryAfter ?? retryAfterHint ?? 3) *
            Math.max(1, queuedAhead + 1)
        )
      : 0;
  const isOverloaded =
    queuedAhead > Math.max(2, initialQueuedAheadRef.current);
  const headline =
    status?.status === "processing"
      ? "Elaborazione in corso"
      : status?.status === "completed"
        ? "Risposta pronta"
        : status?.status === "failed" || status?.status === "cancelled"
          ? "Richiesta non completata"
          : currentPosition === 1
            ? "Quasi pronto!"
            : "Sei in coda";
  const subtitle =
    status?.status === "processing"
      ? "Stiamo preparando la risposta..."
      : status?.status === "completed"
        ? "Sto inviando la risposta."
        : status?.status === "failed" || status?.status === "cancelled"
          ? status?.errorMessage ?? "La richiesta non è andata a buon fine."
          : queuedAhead > 0
            ? `Ci sono ${queuedAhead} richieste davanti a te`
            : "Verrai servito tra pochissimo";

  return (
    <div
      className={`${styles.container} ${
        isOverloaded ? styles.warning : ''
      } ${className || ''}`}
    >
      <div className={styles.icon}>
        {status?.status === 'processing' ? '⚙️' : isOverloaded ? '🚦' : '⏳'}
      </div>

      <div className={styles.content}>
        <h3 className={styles.title}>{headline}</h3>

        <p className={styles.position}>{subtitle}</p>

        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {status?.status === 'queued' && (
          <p className={styles.estimate}>
            Tempo stimato: <strong>~{Math.round(estimatedWaitTime)}s</strong>
          </p>
        )}

        <div className={styles.info}>
          <span className={styles.infoItem}>
            🎟 Ticket: <strong>#{ticketId.substring(0, 6)}</strong>
          </span>
          <span className={styles.infoItem}>
            ⏳ Davanti a te: <strong>{Math.max(0, queuedAhead)}</strong>
          </span>
        </div>

        {status?.errorMessage && (
          <div className={styles.warningBox}>
            <p>⚠️ {status.errorMessage}</p>
          </div>
        )}

        {isOverloaded && !status?.errorMessage && (
          <div className={styles.warningBox}>
            <p>⚡ Sistema sotto carico. Grazie per la pazienza!</p>
          </div>
        )}
      </div>

      <div className={styles.pulseAnimation}>
        <div className={styles.pulse}></div>
      </div>
    </div>
  );
}
