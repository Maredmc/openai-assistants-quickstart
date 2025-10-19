"use client";

import React, { useState, useEffect } from "react";
import ContactForm from "./contact-form";
import styles from "./floating-contact.module.css";

interface FloatingContactProps {
  chatHistory: Array<{
    role: string;
    content: string;
    timestamp?: string;
  }>;
  isVisible: boolean;
  onSuccess?: () => void;
}

const FloatingContact = ({ chatHistory, isVisible, onSuccess }: FloatingContactProps) => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Gestisci chiusura popup con ESC
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isPopupOpen) {
        closePopup();
      }
    };

    if (isPopupOpen) {
      document.addEventListener('keydown', handleEscape);
      // Previeni scroll della pagina di sfondo
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isPopupOpen]);

  const openPopup = () => {
    setIsAnimating(true);
    setIsPopupOpen(true);
  };

  const closePopup = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsPopupOpen(false);
    }, 200); // Tempo per animazione di chiusura
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    // Chiudi solo se clicchi sull'overlay, non sul contenuto
    if (e.target === e.currentTarget) {
      closePopup();
    }
  };

  const handleContactSuccess = () => {
    closePopup();
    if (onSuccess) {
      onSuccess();
    }
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Icona fluttuante */}
      <div 
        className={styles.floatingIcon}
        onClick={openPopup}
        title="Richiedi preventivo"
        aria-label="Richiedi preventivo"
      >
        <div className={styles.emailIcon} />
        <div className={styles.notificationBadge} />
      </div>

      {/* Popup overlay */}
      {isPopupOpen && (
        <div 
          className={styles.popupOverlay}
          onClick={handleOverlayClick}
        >
          <div 
            className={`${styles.popupContent} ${isAnimating ? styles.animating : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Pulsante chiusura */}
            <button 
              className={styles.closeButton}
              onClick={closePopup}
              aria-label="Chiudi popup"
            >
              ✕
            </button>

            {/* Titolo popup */}
            <div className={styles.popupTitle}>
              Preventivo Personalizzato
            </div>
            <div className={styles.popupSubtitle}>
              Il nostro team ti contatterà entro 24 ore per discutere del tuo progetto e offrirti la soluzione perfetta per i tuoi bambini.
            </div>

            {/* Form contatto */}
            <ContactForm 
              chatHistory={chatHistory}
              onContactDeclined={closePopup}
              onContactSuccess={handleContactSuccess}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingContact;