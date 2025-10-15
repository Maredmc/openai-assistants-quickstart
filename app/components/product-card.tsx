"use client";

import React from "react";
import Image from "next/image";
import styles from "./product-card.module.css";

interface ProductCardProps {
  id: string;
  name: string;
  price: string;
  description?: string;
  image?: string;
  url: string;
  inStock?: boolean;
  onAddToCart?: (productId: string) => void;
}

const ProductCard = ({ 
  id, 
  name, 
  price, 
  description, 
  image, 
  url, 
  inStock = true,
  onAddToCart
}: ProductCardProps) => {
  const productImage = image || "/logo_nabè.png";
  
  return (
    <div className={`${styles.productCard} ${!inStock ? styles.outOfStock : ''}`}>
      <div style={{ position: 'relative', width: '100%', height: '200px' }}>
        <Image
          src={productImage}
          alt={name}
          fill
          style={{ objectFit: 'cover' }}
          className={styles.productImage}
          unoptimized={image?.includes('http')}
        />
      </div>
      
      <div className={styles.productContent}>
        <h3 className={styles.productTitle}>{name}</h3>
        
        <div className={styles.productPrice}>{price}</div>
        
        {description && (
          <p className={styles.productDescription}>{description}</p>
        )}
        
        {!inStock && (
          <span className={styles.productBadge}>Non disponibile</span>
        )}
        
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className={styles.productLink}
          onClick={(e) => {
            if (!inStock) {
              e.preventDefault();
            }
          }}
        >
          {inStock ? 'Vedi prodotto' : 'Non disponibile'}
        </a>
      </div>
    </div>
  );
};

export default ProductCard;
