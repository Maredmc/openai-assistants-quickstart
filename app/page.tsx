'use client';

import React, { useState, useEffect } from 'react';
import Chat from './components/chat';
import CartModal from './components/cart-modal';
import Image from 'next/image';
import styles from './page.module.css';
import { getCart, getCartItemCount } from './lib/cart';

const BedAdvisorChatbot = () => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [cartItems, setCartItems] = useState([]);

  // Carica carrello iniziale
  useEffect(() => {
    updateCartState();
  }, []);

  // Funzione per aggiornare lo stato del carrello
  const updateCartState = () => {
    const cart = getCart();
    setCartItems(cart);
    setCartCount(getCartItemCount(cart));
  };

  // Gestisci apertura/chiusura modal
  const toggleCart = () => {
    updateCartState(); // Aggiorna prima di aprire
    setIsCartOpen(!isCartOpen);
  };

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
              <h1 className={styles.title}>Assistente Letti AI</h1>
              <p className={styles.subtitle}>Il tuo consulente per il riposo perfetto</p>
            </div>
          </div>
          
          {/* Bottone Carrello */}
          <button onClick={toggleCart} className={styles.cartButton}>
            <span className={styles.cartIcon}>🛍️</span>
            {cartCount > 0 && (
              <span className={styles.cartBadge}>{cartCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* Chat Component */}
      <div className={styles.chatContainer}>
        <Chat onCartUpdate={updateCartState} />
      </div>

      {/* Cart Modal */}
      <CartModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onCartUpdate={updateCartState}
      />
    </div>
  );
};

export default BedAdvisorChatbot;