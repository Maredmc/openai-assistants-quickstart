"use client";

import { useEffect, useState } from 'react';
import styles from './provider-switch-banner.module.css';

interface ProviderSwitchBannerProps {
  isVisible: boolean;
  provider: 'openai' | 'anthropic';
  onClose?: () => void;
}

export default function ProviderSwitchBanner({ 
  isVisible, 
  provider,
  onClose 
}: ProviderSwitchBannerProps) {
  const [show, setShow] = useState(false);
  const [autoHideTimer, setAutoHideTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isVisible && provider === 'anthropic') {
      setShow(true);
      
      // Auto-hide dopo 10 secondi
      const timer = setTimeout(() => {
        setShow(false);
        onClose?.();
      }, 10000);
      
      setAutoHideTimer(timer);
    } else {
      setShow(false);
    }

    return () => {
      if (autoHideTimer) clearTimeout(autoHideTimer);
    };
  }, [isVisible, provider]);

  const handleClose = () => {
    setShow(false);
    if (autoHideTimer) clearTimeout(autoHideTimer);
    onClose?.();
  };

  if (!show) return null;

  return (
    <div className={styles.banner}>
      <div className={styles.content}>
        <div className={styles.icon}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path 
              d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" 
              fill="currentColor"
            />
          </svg>
        </div>
        <div className={styles.text}>
          <strong>Servizio alternativo attivo</strong>
          <p>Stiamo utilizzando un provider alternativo per garantirti la migliore esperienza possibile</p>
        </div>
        <button 
          className={styles.closeBtn}
          onClick={handleClose}
          aria-label="Chiudi"
        >
          ×
        </button>
      </div>
    </div>
  );
}
