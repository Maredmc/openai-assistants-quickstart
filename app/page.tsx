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
    
    if (product || price) {
      setInitialContext({
        product,
        price,
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
