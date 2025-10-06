'use client';

import React from 'react';
import Chat from './components/chat';
import Image from 'next/image';
import styles from './page.module.css';

const BedAdvisorChatbot = () => {
  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerInner}>
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