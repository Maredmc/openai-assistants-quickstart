'use client';

import React, { useEffect, useState } from 'react';
import Chat from './components/chat';
import ModeSelector from './components/mode-selector';
import PersonalShopper from './components/personal-shopper';
import styles from './page.module.css';

type ViewMode = 'mode-selector' | 'chat' | 'personal-shopper';

const BedAdvisorChatbot = () => {
  const [currentView, setCurrentView] = useState<ViewMode>('mode-selector');
  const [initialContext, setInitialContext] = useState<{
    product?: string | null;
    price?: string | null;
    prefillQuestion?: string | null;
    fromShopify?: boolean;
  } | null>(null);

  useEffect(() => {
    // Leggi parametri URL per personalizzare l'esperienza
    const urlParams = new URLSearchParams(window.location.search);
    const product = urlParams.get('product');
    const price = urlParams.get('price');
    const prefillQuestion = urlParams.get('question');

    if (product || price || prefillQuestion) {
      setInitialContext({
        product,
        price,
        prefillQuestion,
        fromShopify: true
      });
      // Se ci sono parametri da Shopify, vai direttamente alla chat
      setCurrentView('chat');
    }
  }, []);

  const handleSelectMode = (mode: 'chat' | 'personal-shopper') => {
    setCurrentView(mode);
  };

  const handleSwitchToChat = (prefillQuestion?: string) => {
    if (prefillQuestion) {
      setInitialContext({
        prefillQuestion,
        fromShopify: false
      });
    }
    setCurrentView('chat');
  };

  const handleBackToSelector = () => {
    setCurrentView('mode-selector');
    setInitialContext(null);
  };

  return (
    <div className={styles.container}>
      {currentView === 'mode-selector' && (
        <ModeSelector onSelectMode={handleSelectMode} />
      )}

      {currentView === 'chat' && (
        <Chat
          initialContext={initialContext}
        />
      )}

      {currentView === 'personal-shopper' && (
        <PersonalShopper
          onSwitchToChat={handleSwitchToChat}
          onBack={handleBackToSelector}
        />
      )}
    </div>
  );
};

export default BedAdvisorChatbot;
