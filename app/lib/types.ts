// Product data types
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
