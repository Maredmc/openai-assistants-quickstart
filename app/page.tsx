'use client';

import React from 'react';
import Chat from './components/chat';
import styles from './page.module.css';

const BedAdvisorChatbot = () => {
  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerInner}>
            <div className={styles.logo}>
              <svg viewBox="0 0 100 100" className={styles.logoIcon}>
                <path d="M20,30 L50,10 L80,30 L80,70 L50,90 L20,70 Z" fill="white"/>
              </svg>
            </div>
            <div>
              <h1 className={styles.title}>Assistente Letti AI</h1>
              <p className={styles.subtitle}>Il tuo consulente per il riposo perfetto</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Component */}
      <div className={styles.chatContainer}>
        <Chat />
      </div>
    </div>
  );
};

export default BedAdvisorChatbot;