// Product data types
export interface ProductVariant {
  id: string;
  title: string;
  price: string;
  compareAtPrice?: string;
  sku: string;
  inventoryQuantity: number;
  available: boolean;
  image?: string;
  url: string;
}

export interface Product {
  id: string;
  url: string;
  name: string;
  price: string;
  description: string;
  images: string[];
  category: string;
  inStock: boolean;
  lastUpdated: Date;
  variants?: ProductVariant[];
}

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

export interface ProductsData {
  products: Product[];
  lastSync: Date;
  totalProducts: number;
}
