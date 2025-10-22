"use client";

import React, { useState } from "react";
import { trackContactSubmit } from "../lib/shopify-analytics";
import styles from "./contact-form.module.css";

interface ContactFormProps {
  chatHistory: Array<{
    role: string;
    content: string;
    timestamp?: string;
  }>;
  onContactDeclined?: () => void;
  showAlternativeOffer?: boolean;
  onContactSuccess?: () => void;
}

export default function ContactForm({ chatHistory, onContactDeclined, showAlternativeOffer, onContactSuccess }: ContactFormProps) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [newsletterAccepted, setNewsletterAccepted] = useState(false);
  const [whatsappAccepted, setWhatsappAccepted] = useState(false);
  const [honeypot, setHoneypot] = useState(""); // 🍯 Honeypot field
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email && !phone) {
      setError("Inserisci almeno un contatto (email o telefono)");
      return;
    }

    if (!privacyAccepted) {
      setError("Devi accettare la Privacy Policy per continuare");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          phone,
          privacyAccepted,
          newsletterAccepted,
          whatsappAccepted,
          honeypot, // 🍯 Include honeypot
          chatHistory: chatHistory.map(msg => ({
            ...msg,
            timestamp: msg.timestamp || new Date().toISOString(),
          })),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Track contatto inviato
        trackContactSubmit(email, phone);
        
        setIsSubmitted(true);
        setEmail("");
        setPhone("");
        setPrivacyAccepted(false);
        setNewsletterAccepted(false);
        setWhatsappAccepted(false);
        
        // Notifica successo se callback fornito
        if (onContactSuccess) {
          setTimeout(() => onContactSuccess(), 2000); // Dopo 2 secondi per mostrare il messaggio
        }
      } else {
        setError(data.error || "Errore nell'invio della richiesta");
      }
    } catch (err) {
      setError("Errore di connessione. Riprova più tardi.");
      // Non loggare errori con dettagli in produzione
      if (process.env.NODE_ENV === 'development') {
        console.error("Errore nell'invio:", err);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showAlternativeOffer) {
    return (
      <div className={styles["contact-form-container"]}>
        <div className={styles["contact-form-header"]}>
          Vuoi maggiori informazioni o un preventivo personalizzato?
        </div>
        <div className={styles["contact-form-subtitle"]}>
          Posso ripresentarti il modulo per essere ricontattato se vuoi...
        </div>
        
        <div className={styles["form-row"]}>
          <button
            onClick={() => window.location.reload()}
            className={styles["submit-button"]}
            style={{ marginRight: '10px' }}
          >
            Sì, mostra il modulo
          </button>
          <button
            onClick={onContactDeclined}
            className={styles["submit-button"]}
            style={{ background: 'rgba(255, 255, 255, 0.1)' }}
          >
            No, continua la chat
          </button>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className={styles["contact-form-container"]}>
        <div className={styles["success-message"]}>
          Perfetto! La tua richiesta è stata inviata con successo. 
          Il nostro team ti contatterà presto per un preventivo personalizzato!
        </div>
      </div>
    );
  }

  return (
    <div className={styles["contact-form-container"]}>
      <div className={styles["contact-form-header"]}>
        Vuoi un preventivo personalizzato?
      </div>
      <div className={styles["contact-form-subtitle"]}>
        Lascia i tuoi contatti e ti ricontatteremo entro 24 ore per approfondire del tuo progetto!
      </div>
      
      <form onSubmit={handleSubmit} className={styles["contact-form"]}>
        {/* 🍯 Honeypot field - Hidden from users, attracts bots */}
        <input
          type="text"
          name="website"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          style={{
            position: "absolute",
            left: "-9999px",
            width: "1px",
            height: "1px",
            opacity: 0,
            pointerEvents: "none"
          }}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />

        <div className={styles["form-row"]}>
          <div className={styles["form-group"]}>
            <label className={styles["form-label"]} htmlFor="email">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="la-tua-email@esempio.com"
              className={styles["form-input"]}
              disabled={isSubmitting}
            />
          </div>

          <div className={styles["form-group"]}>
            <label className={styles["form-label"]} htmlFor="phone">
              Telefono
            </label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+39 xxx xxx xxxx"
              className={styles["form-input"]}
              disabled={isSubmitting}
            />
          </div>
        </div>
        
        {/* Sezione Privacy e Consensi */}
        <div className={styles["consent-section"]}>
          <div className={styles["consent-item"]}>
            <input
              type="checkbox"
              id="privacy"
              checked={privacyAccepted}
              onChange={(e) => setPrivacyAccepted(e.target.checked)}
              className={styles["consent-checkbox"]}
              disabled={isSubmitting}
            />
            <label htmlFor="privacy" className={styles["consent-label"]}>
              Accetto la <a href="#" className={styles["privacy-link"]}>Privacy Policy</a> *
            </label>
          </div>

          <div className={styles["consent-item"]}>
            <input
              type="checkbox"
              id="newsletter"
              checked={newsletterAccepted}
              onChange={(e) => setNewsletterAccepted(e.target.checked)}
              className={styles["consent-checkbox"]}
              disabled={isSubmitting}
            />
            <label htmlFor="newsletter" className={styles["consent-label"]}>
              Iscrivimi alla newsletter per ricevere il 5% di sconto sul catalogo
            </label>
          </div>

          <div className={styles["consent-item"]}>
            <input
              type="checkbox"
              id="whatsapp"
              checked={whatsappAccepted}
              onChange={(e) => setWhatsappAccepted(e.target.checked)}
              className={styles["consent-checkbox"]}
              disabled={isSubmitting}
            />
            <label htmlFor="whatsapp" className={styles["consent-label"]}>
              Aggiungi il mio numero WhatsApp per promozioni e sconti esclusivi
            </label>
          </div>
        </div>
        
        <div className={styles["form-row"]}>
          <button
            type="submit"
            className={styles["submit-button"]}
            disabled={isSubmitting}
            style={{ marginRight: '10px' }}
          >
            {isSubmitting && <div className={styles["loading-spinner"]} />}
            {isSubmitting ? "Invio in corso..." : "Richiedi Preventivo"}
          </button>
          
          <button
            type="button"
            onClick={onContactDeclined}
            className={styles["submit-button"]}
            style={{ background: 'rgba(255, 255, 255, 0.1)' }}
            disabled={isSubmitting}
          >
            Non ora
          </button>
        </div>
        
        {error && (
          <div className={styles["error-message"]}>
            {error}
          </div>
        )}
      </form>
    </div>
  );
}
