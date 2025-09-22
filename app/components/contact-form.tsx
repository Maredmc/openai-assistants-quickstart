"use client";

import React, { useState } from "react";
import styles from "./contact-form.module.css";

interface ContactFormProps {
  chatHistory: Array<{
    role: string;
    content: string;
    timestamp?: string;
  }>;
}

export default function ContactForm({ chatHistory }: ContactFormProps) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !phone) {
      setError("Compila tutti i campi richiesti");
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
          chatHistory: chatHistory.map(msg => ({
            ...msg,
            timestamp: msg.timestamp || new Date().toISOString(),
          })),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSubmitted(true);
        setEmail("");
        setPhone("");
      } else {
        setError(data.error || "Errore nell'invio della richiesta");
      }
    } catch (err) {
      setError("Errore di connessione. Riprova più tardi.");
      console.error("Errore nell'invio:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className={styles["contact-form-container"]}>
        <div className={styles["success-message"]}>
          ✅ Perfetto! La tua richiesta è stata inviata con successo. 
          Il nostro team ti contatterà presto per un preventivo personalizzato!
        </div>
      </div>
    );
  }

  return (
    <div className={styles["contact-form-container"]}>
      <div className={styles["contact-form-header"]}>
        📞 Vuoi un preventivo personalizzato?
      </div>
      <div className={styles["contact-form-subtitle"]}>
        Lascia i tuoi contatti e ti richiameremo subito per discutere del tuo progetto!
      </div>
      
      <form onSubmit={handleSubmit} className={styles["contact-form"]}>
        <div className={styles["form-row"]}>
          <div className={styles["form-group"]}>
            <label className={styles["form-label"]} htmlFor="email">
              📧 Email *
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="la-tua-email@esempio.com"
              className={styles["form-input"]}
              required
              disabled={isSubmitting}
            />
          </div>
          
          <div className={styles["form-group"]}>
            <label className={styles["form-label"]} htmlFor="phone">
              📱 Telefono *
            </label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+39 xxx xxx xxxx"
              className={styles["form-input"]}
              required
              disabled={isSubmitting}
            />
          </div>
        </div>
        
        <button
          type="submit"
          className={styles["submit-button"]}
          disabled={isSubmitting}
        >
          {isSubmitting && <div className={styles["loading-spinner"]} />}
          {isSubmitting ? "Invio in corso..." : "🚀 Richiedi Preventivo"}
        </button>
        
        {error && (
          <div className={styles["error-message"]}>
            ❌ {error}
          </div>
        )}
      </form>
    </div>
  );
}
