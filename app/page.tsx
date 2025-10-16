'use client';

import React from 'react';
import Chat from './components/chat';
import styles from './page.module.css';

const BedAdvisorChatbot = () => {
  return (
    <div className={styles.container}>
      <Chat />
    </div>
  );
};

export default BedAdvisorChatbot;
