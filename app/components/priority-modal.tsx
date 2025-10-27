'use client';

import { useState } from 'react';
import styles from './priority-modal.module.css';

type PriorityModalProps = {
  userId: string;
  isVisible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  trigger: 'queue' | 'manual';
};

type ModalStep = 'register' | 'verify' | 'success';

export default function PriorityModal({
  userId,
  isVisible,
  onClose,
  onSuccess,
  trigger,
}: PriorityModalProps) {
  const [step, setStep] = useState<ModalStep>('register');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  if (!isVisible) return null;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/priority', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          email: email.trim(),
          userId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage(data.message);
        const skipVerification =
          Boolean(data.alreadyRegistered) || data.requiresVerification === false;

        if (skipVerification) {
          setCode('');
          setStep('success');
          setTimeout(() => {
            onSuccess();
          }, 2000);
        } else {
          setStep('verify');
        }
      } else {
        setError(data.error || data.message || 'Errore durante la registrazione');
      }
    } catch (err) {
      setError('Errore di connessione. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/priority', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          userId,
          code: code.toUpperCase(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStep('success');
        setTimeout(() => {
          onSuccess();
        }, 2000);
      } else {
        setError(data.message || 'Codice non valido');
      }
    } catch (err) {
      setError('Errore di connessione. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('register');
    setCode('');
    setError('');
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Chiudi"
        >
          ×
        </button>

        {/* STEP 1: Registrazione */}
        {step === 'register' && (
          <>
            <div className={styles.header}>
              <div className={styles.icon}>⚡</div>
              <h2 className={styles.title}>Accesso Prioritario</h2>
              <p className={styles.subtitle}>
                {trigger === 'queue'
                  ? 'Stanco di aspettare? Registrati per saltare sempre la coda!'
                  : 'Ottieni accesso immediato anche nei momenti di picco'}
              </p>
            </div>

            <div className={styles.benefits}>
              <h3 className={styles.benefitsTitle}>✨ Cosa ottieni:</h3>
              <ul className={styles.benefitsList}>
                <li>
                  <span className={styles.benefitIcon}>🚀</span>
                  <span>
                    <strong>Zero attesa</strong> - Risposte immediate anche con traffico intenso
                  </span>
                </li>
                <li>
                  <span className={styles.benefitIcon}>🎯</span>
                  <span>
                    <strong>Supporto dedicato</strong> - Assistenza personalizzata prioritaria
                  </span>
                </li>
                <li>
                  <span className={styles.benefitIcon}>💎</span>
                  <span>
                    <strong>Sempre disponibile</strong> - Accesso garantito 24/7
                  </span>
                </li>
              </ul>
            </div>

            <form onSubmit={handleRegister} className={styles.form}>
              <div className={styles.inputGroup}>
                <label htmlFor="email" className={styles.label}>
                  La tua email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@esempio.com"
                  className={styles.input}
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>

              {error && (
                <div className={styles.error}>
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className={styles.submitButton}
                disabled={loading}
              >
                {loading ? 'Registrazione...' : 'Ottieni Accesso Priority 🚀'}
              </button>

              <p className={styles.disclaimer}>
                Ti invieremo un codice di verifica. Nessuno spam, promesso! 🤝
              </p>
            </form>
          </>
        )}

        {/* STEP 2: Verifica codice */}
        {step === 'verify' && (
          <>
            <div className={styles.header}>
              <div className={styles.icon}>📧</div>
              <h2 className={styles.title}>Controlla la tua email</h2>
              <p className={styles.subtitle}>
                Abbiamo inviato un codice di 6 caratteri a <strong>{email}</strong>
              </p>
            </div>

            <form onSubmit={handleVerify} className={styles.form}>
              <div className={styles.inputGroup}>
                <label htmlFor="code" className={styles.label}>
                  Codice di verifica
                </label>
                <input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  className={styles.codeInput}
                  maxLength={6}
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>

              {error && (
                <div className={styles.error}>
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {message && (
                <div className={styles.message}>
                  <span>✉️</span>
                  <span>{message}</span>
                </div>
              )}

              <button
                type="submit"
                className={styles.submitButton}
                disabled={loading || code.length !== 6}
              >
                {loading ? 'Verifica...' : 'Verifica e Attiva 🎉'}
              </button>

              <button
                type="button"
                className={styles.backButton}
                onClick={handleBack}
                disabled={loading}
              >
                ← Cambia email
              </button>
            </form>
          </>
        )}

        {/* STEP 3: Successo */}
        {step === 'success' && (
          <>
            <div className={styles.header}>
              <div className={`${styles.icon} ${styles.successIcon}`}>🎉</div>
              <h2 className={styles.title}>Benvenuto in Priority!</h2>
              <p className={styles.subtitle}>Il tuo accesso prioritario è ora attivo</p>
            </div>

            <div className={styles.successMessage}>
              <p>
                <strong>🚀 Accesso prioritario attivato con successo!</strong>
              </p>
              <p>
                Da ora in poi, salterai sempre la coda e avrai risposte immediate anche
                nei momenti di maggior traffico.
              </p>
              <p>Benvenuto nel nostro programma Priority! 💎</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
