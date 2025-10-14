import React from 'react';
import Image from 'next/image';
import { CartItem, removeFromCart, updateQuantity, getCartTotal, createShopifyCheckout, clearCart } from '../lib/cart';
import { trackRemoveFromCart, trackCheckoutStarted } from '../lib/shopify-analytics';
import styles from './cart-modal.module.css';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onCartUpdate: () => void;
}

const CartModal: React.FC<CartModalProps> = ({ isOpen, onClose, cartItems, onCartUpdate }) => {
  if (!isOpen) return null;

  const handleRemove = (productId: string, productName: string) => {
    removeFromCart(productId);
    trackRemoveFromCart(productId, productName);
    onCartUpdate();
  };

  const handleQuantityChange = (productId: string, productName: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemove(productId, productName);
    } else {
      updateQuantity(productId, newQuantity);
      onCartUpdate();
    }
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    
    const total = getCartTotal(cartItems);
    const itemCount = cartItems.length;
    
    // Track checkout iniziato
    trackCheckoutStarted(total, itemCount);
    
    const checkoutUrl = await createShopifyCheckout(cartItems);
    if (checkoutUrl) {
      window.location.href = checkoutUrl;
    } else {
      alert('Errore durante la creazione del checkout. Riprova.');
    }
  };

  const handleClearCart = () => {
    if (confirm('Vuoi svuotare il carrello?')) {
      clearCart();
      onCartUpdate();
    }
  };

  const total = getCartTotal(cartItems);

  return (
    <>
      {/* Overlay */}
      <div className={styles.overlay} onClick={onClose} />
      
      {/* Modal */}
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>🛒 Il tuo carrello</h2>
          <button onClick={onClose} className={styles.closeButton}>
            ✕
          </button>
        </div>

        <div className={styles.content}>
          {cartItems.length === 0 ? (
            <div className={styles.emptyCart}>
              <p className={styles.emptyText}>Il carrello è vuoto</p>
              <p className={styles.emptySubtext}>Aggiungi prodotti per iniziare!</p>
            </div>
          ) : (
            <>
              <div className={styles.items}>
                {cartItems.map((item) => (
                  <div key={item.productId} className={styles.item}>
                    <div className={styles.itemImage}>
                      <Image
                        src={item.image}
                        alt={item.name}
                        width={80}
                        height={80}
                        style={{ objectFit: 'cover', borderRadius: '8px' }}
                      />
                    </div>
                    
                    <div className={styles.itemDetails}>
                      <h3 className={styles.itemName}>{item.name}</h3>
                      <p className={styles.itemPrice}>{item.price}</p>
                      
                      <div className={styles.quantityControls}>
                        <button
                          onClick={() => handleQuantityChange(item.productId, item.name, item.quantity - 1)}
                          className={styles.quantityButton}
                        >
                          −
                        </button>
                        <span className={styles.quantity}>{item.quantity}</span>
                        <button
                          onClick={() => handleQuantityChange(item.productId, item.name, item.quantity + 1)}
                          className={styles.quantityButton}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemove(item.productId, item.name)}
                      className={styles.removeButton}
                      title="Rimuovi dal carrello"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>

              <div className={styles.footer}>
                <div className={styles.totalSection}>
                  <span className={styles.totalLabel}>Totale:</span>
                  <span className={styles.totalAmount}>€{total.toFixed(2)}</span>
                </div>

                <button
                  onClick={handleCheckout}
                  className={styles.checkoutButton}
                >
                  Procedi al Checkout
                </button>

                <button
                  onClick={handleClearCart}
                  className={styles.clearButton}
                >
                  Svuota carrello
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default CartModal;
