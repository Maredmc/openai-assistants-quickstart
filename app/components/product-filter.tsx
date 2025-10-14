"use client";

import React from "react";
import styles from "./product-filter.module.css";

interface ProductFilterProps {
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  cartItemCount?: number;
  onCartClick?: () => void;
}

const ProductFilter = ({ 
  categories, 
  selectedCategory, 
  onCategoryChange,
  cartItemCount = 0,
  onCartClick
}: ProductFilterProps) => {
  return (
    <div className={styles.filterBar}>
      <span className={styles.filterLabel}>Categorie:</span>
      
      <button
        className={`${styles.categoryButton} ${selectedCategory === 'all' ? styles.active : ''}`}
        onClick={() => onCategoryChange('all')}
      >
        Tutti i prodotti
      </button>
      
      {categories.map((category) => (
        <button
          key={category}
          className={`${styles.categoryButton} ${selectedCategory === category ? styles.active : ''}`}
          onClick={() => onCategoryChange(category)}
        >
          {category}
        </button>
      ))}
      
      {onCartClick && (
        <button className={styles.cartButton} onClick={onCartClick}>
          🛒 Carrello
          {cartItemCount > 0 && (
            <span className={styles.cartBadge}>{cartItemCount}</span>
          )}
        </button>
      )}
    </div>
  );
};

export default ProductFilter;
