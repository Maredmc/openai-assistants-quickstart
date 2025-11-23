'use client';

import React from 'react';
import Image from 'next/image';
import styles from './mode-selector.module.css';

interface ModeSelectorProps {
  onSelectMode: (mode: 'chat' | 'personal-shopper') => void;
}

const ModeSelector: React.FC<ModeSelectorProps> = ({ onSelectMode }) => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.logoContainer}>
          <Image
            src="/logo_nabè.png"
            alt="Logo Nabè"
            width={60}
            height={60}
          />
        </div>
        <h1 className={styles.title}>Benvenuto in Nabè</h1>
        <p className={styles.subtitle}>
          Come preferisci iniziare la tua esperienza?
        </p>
      </div>

      <div className={styles.modesContainer}>
        {/* Modalità Chat Libera */}
        <div
          className={styles.modeCard}
          onClick={() => onSelectMode('chat')}
        >
          <div className={styles.modeIcon}>
            💬
          </div>
          <h2 className={styles.modeTitle}>Conversazione Libera</h2>
          <p className={styles.modeDescription}>
            Chatta direttamente con il nostro assistente AI.
            Fai tutte le domande che vuoi sui nostri letti evolutivi.
          </p>
          <div className={styles.modeFeatures}>
            <div className={styles.feature}>✓ Risposte immediate</div>
            <div className={styles.feature}>✓ Domande personalizzate</div>
            <div className={styles.feature}>✓ Consigli su misura</div>
          </div>
          <button className={styles.modeButton}>
            Inizia a chattare
          </button>
        </div>

        {/* Modalità Personal Shopper */}
        <div
          className={`${styles.modeCard} ${styles.modeCardHighlight}`}
          onClick={() => onSelectMode('personal-shopper')}
        >
          <div className={styles.modeBadge}>Consigliato</div>
          <div className={styles.modeIcon}>
            🛏️
          </div>
          <h2 className={styles.modeTitle}>Personal Shopper</h2>
          <p className={styles.modeDescription}>
            Lasciati guidare passo dopo passo nella scelta del letto perfetto
            per il tuo bambino.
          </p>
          <div className={styles.modeFeatures}>
            <div className={styles.feature}>✓ Percorso guidato</div>
            <div className={styles.feature}>✓ Domande mirate</div>
            <div className={styles.feature}>✓ Suggerimenti finali</div>
          </div>
          <button className={`${styles.modeButton} ${styles.modeButtonPrimary}`}>
            Inizia il percorso
          </button>
        </div>
      </div>

      <p className={styles.footerNote}>
        💡 Potrai sempre passare da una modalità all'altra in qualsiasi momento
      </p>
    </div>
  );
};

export default ModeSelector;
