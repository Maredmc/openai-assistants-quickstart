'use client';

import React, { useEffect, useState } from 'react';
import Chat from './components/chat';
import styles from './page.module.css';

const BedAdvisorChatbot = () => {
  const [initialContext, setInitialContext] = useState(null);

  useEffect(() => {
    // Leggi parametri URL per personalizzare l'esperienza
    const urlParams = new URLSearchParams(window.location.search);
    const product = urlParams.get('product');
    const price = urlParams.get('price');
    const question = urlParams.get('question');

    if (product || price || question) {
      setInitialContext({
        product,
        price,
        question,
        fromShopify: true
      });
    }
  }, []);

  return (
    <div className={styles.container}>
      <Chat initialContext={initialContext} />
    </div>
  );
};

export default BedAdvisorChatbot;
