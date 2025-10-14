// Cart management with localStorage
export interface CartItem {
  productId: string;
  name: string;
  price: string;
  image: string;
  quantity: number;
  url: string;
}

const CART_KEY = 'nabe_cart';

export const getCart = (): CartItem[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const cart = localStorage.getItem(CART_KEY);
    return cart ? JSON.parse(cart) : [];
  } catch (error) {
    console.error('Error reading cart:', error);
    return [];
  }
};

export const addToCart = (product: Omit<CartItem, 'quantity'>): CartItem[] => {
  const cart = getCart();
  
  // Controlla se il prodotto è già nel carrello
  const existingItemIndex = cart.findIndex(item => item.productId === product.productId);
  
  if (existingItemIndex >= 0) {
    // Incrementa quantità
    cart[existingItemIndex].quantity += 1;
  } else {
    // Aggiungi nuovo prodotto
    cart.push({ ...product, quantity: 1 });
  }
  
  saveCart(cart);
  return cart;
};

export const removeFromCart = (productId: string): CartItem[] => {
  const cart = getCart();
  const updatedCart = cart.filter(item => item.productId !== productId);
  saveCart(updatedCart);
  return updatedCart;
};

export const updateQuantity = (productId: string, quantity: number): CartItem[] => {
  const cart = getCart();
  const itemIndex = cart.findIndex(item => item.productId === productId);
  
  if (itemIndex >= 0) {
    if (quantity <= 0) {
      return removeFromCart(productId);
    }
    cart[itemIndex].quantity = quantity;
    saveCart(cart);
  }
  
  return cart;
};

export const clearCart = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CART_KEY);
  }
};

export const getCartTotal = (cart: CartItem[]): number => {
  return cart.reduce((total, item) => {
    const price = parseFloat(item.price.replace(/[€,]/g, '').replace(',', '.'));
    return total + (price * item.quantity);
  }, 0);
};

export const getCartItemCount = (cart: CartItem[]): number => {
  return cart.reduce((count, item) => count + item.quantity, 0);
};

const saveCart = (cart: CartItem[]): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }
};

// Funzione per creare un checkout su Shopify
export const createShopifyCheckout = async (cart: CartItem[]): Promise<string | null> => {
  try {
    const response = await fetch('/api/cart/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items: cart }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create checkout');
    }
    
    const data = await response.json();
    return data.checkoutUrl;
  } catch (error) {
    console.error('Error creating Shopify checkout:', error);
    return null;
  }
};
