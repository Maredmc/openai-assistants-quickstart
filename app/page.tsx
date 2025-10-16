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
            <div className={styles.logo}>
              <Image 
                src="/logo_nabè.png" 
                alt="Logo Nabè" 
                width={28} 
                height={28}
                className={styles.logoIcon}
              />
            </div>
            <div>
              <h1 className={styles.title}>Assistente AI di Nabè</h1>
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
