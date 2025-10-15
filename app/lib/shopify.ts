import { Product, ProductsData, ProductVariant } from './types';

// Configurazione Shopify
const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || 'nabecreation.myshopify.com';
const SHOPIFY_ADMIN_API_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN;
const SHOPIFY_API_VERSION = '2024-10';

// Cache
const CACHE_DURATION = 60 * 60 * 1000; // 1 ora
let productsCache: ProductsData | null = null;

// Flag per usare GraphQL invece di REST
const USE_GRAPHQL = true;

/**
 * Interfacce GraphQL
 */
interface GraphQLProduct {
  id: string;
  handle: string;
  title: string;
  description: string;
  productType: string;
  publishedAt: string;
  updatedAt: string;
  status: string;
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        price: string;
        compareAtPrice?: string;
        sku: string;
        inventoryQuantity: number;
        availableForSale: boolean;
        image?: {
          url: string;
          altText?: string;
        };
      };
    }>;
  };
  images: {
    edges: Array<{
      node: {
        url: string;
        altText?: string;
      };
    }>;
  };
}

/**
 * Query GraphQL per ottenere prodotti con varianti e immagini
 */
const PRODUCTS_QUERY = `
  query getProducts($first: Int!, $after: String, $query: String) {
    products(first: $first, after: $after, query: $query) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          handle
          title
          description
          productType
          publishedAt
          updatedAt
          status
          variants(first: 250) {
            edges {
              node {
                id
                title
                price
                compareAtPrice
                sku
                inventoryQuantity
                availableForSale
                image {
                  url
                  altText
                }
              }
            }
          }
          images(first: 250) {
            edges {
              node {
                url
                altText
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * Interfacce Shopify REST API
 */
interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  handle: string;
  created_at: string;
  updated_at: string;
  published_at: string;
  status: string;
  variants: ShopifyVariant[];
  images: ShopifyImage[];
  options: any[];
}

interface ShopifyVariant {
  id: number;
  title: string;
  price: string;
  compare_at_price: string | null;
  sku: string;
  inventory_quantity: number;
  available: boolean;
}

interface ShopifyImage {
  id: number;
  src: string;
  alt: string | null;
}

/**
 * Fetch prodotti usando GraphQL
 */
async function fetchProductsGraphQL(): Promise<Product[]> {
  console.log('🔷 Fetching products using GraphQL...');
  
  const products: Product[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;
  let pageCount = 0;

  while (hasNextPage && pageCount < 20) {
    pageCount++;
    
    const variables: any = {
      first: 250,
      query: 'status:active AND published_status:published'
    };
    
    if (cursor) {
      variables.after = cursor;
    }

    try {
      const response = await fetch(
        `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': SHOPIFY_ADMIN_API_TOKEN!,
          },
          body: JSON.stringify({
            query: PRODUCTS_QUERY,
            variables,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`GraphQL API error: ${response.status}`);
      }

      const { data, errors } = await response.json();

      if (errors) {
        console.error('❌ GraphQL errors:', errors);
        throw new Error('GraphQL query failed');
      }

      const edges = data.products.edges;
      console.log(`✅ Fetched ${edges.length} products from GraphQL page ${pageCount}`);

      for (const edge of edges) {
        const product = convertGraphQLProduct(edge.node);
        if (product) {
          products.push(product);
        }
      }

      hasNextPage = data.products.pageInfo.hasNextPage;
      cursor = data.products.pageInfo.endCursor;

      if (hasNextPage) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } catch (error) {
      console.error('❌ GraphQL fetch error:', error);
      throw error;
    }
  }

  console.log(`✅ Total products fetched via GraphQL: ${products.length}`);
  return products;
}

/**
 * Converte un prodotto GraphQL nel formato interno
 */
function convertGraphQLProduct(gqlProduct: GraphQLProduct): Product | null {
  try {
    if (!gqlProduct.publishedAt) {
      console.warn(`⚠️ Product ${gqlProduct.title} is not published, skipping`);
      return null;
    }

    // Estrai tutte le immagini
    const images = gqlProduct.images.edges.map(edge => edge.node.url);

    // Converti varianti
    const variants: ProductVariant[] = gqlProduct.variants.edges.map(edge => {
      const variantNode = edge.node;
      const variantId = variantNode.id.split('/').pop() || variantNode.id;
      
      return {
        id: variantId,
        title: variantNode.title,
        price: formatPrice(variantNode.price),
        compareAtPrice: variantNode.compareAtPrice ? formatPrice(variantNode.compareAtPrice) : undefined,
        sku: variantNode.sku,
        inventoryQuantity: variantNode.inventoryQuantity,
        available: variantNode.availableForSale,
        image: variantNode.image?.url,
        url: `https://nabecreation.com/products/${gqlProduct.handle}?variant=${variantId}`
      };
    });

    // Determina disponibilità generale
    const inStock = variants.some(v => v.inventoryQuantity > 0);

    // Prendi prezzo della prima variante
    const firstVariant = variants[0];
    const price = firstVariant ? firstVariant.price : 'Prezzo su richiesta';

    return {
      id: gqlProduct.handle,
      url: `https://nabecreation.com/products/${gqlProduct.handle}`,
      name: gqlProduct.title,
      price,
      description: cleanHtmlDescription(gqlProduct.description),
      images,
      category: gqlProduct.productType || 'Prodotti',
      inStock,
      variants,
      lastUpdated: new Date(gqlProduct.updatedAt)
    };
  } catch (error) {
    console.error(`❌ Error converting GraphQL product:`, error);
    return null;
  }
}

/**
 * Fetch prodotti da Shopify Admin API
 */
export async function fetchShopifyProducts(forceRefresh = false): Promise<ProductsData> {
  // Controlla cache
  if (!forceRefresh && productsCache && 
      (Date.now() - productsCache.lastSync.getTime()) < CACHE_DURATION) {
    console.log('📦 Using cached Shopify products data');
    return productsCache;
  }

  if (!SHOPIFY_ADMIN_API_TOKEN) {
    console.error('❌ SHOPIFY_ADMIN_API_TOKEN not configured');
    return getFallbackProducts();
  }

  try {
    // Usa GraphQL se il flag è attivo
    if (USE_GRAPHQL) {
      console.log('🛍️ Fetching products using GraphQL API...');
      console.log('📋 Filters: status=active, published_status=published (Online Store only)');
      
      const products = await fetchProductsGraphQL();
      
      const result: ProductsData = {
        products,
        lastSync: new Date(),
        totalProducts: products.length
      };
      
      productsCache = result;
      return result;
    }
    
    // Altrimenti usa REST API (fallback)
    console.log('🛍️ Fetching products from Shopify REST API...');
    console.log('📋 Filters: status=active, published_status=published (Online Store only)');
    const products: Product[] = [];
    let hasNextPage = true;
    let pageInfo: string | null = null;
    let pageCount = 0;

    // Fetch tutti i prodotti con paginazione
    while (hasNextPage && pageCount < 20) { // Limite di sicurezza: max 20 pagine (5000 prodotti)
      pageCount++;
      
      const url = buildApiUrl(pageInfo);
      console.log(`📄 Fetching page ${pageCount}: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': SHOPIFY_ADMIN_API_TOKEN,
        },
      });

      if (!response.ok) {
        console.error(`❌ Shopify API error: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        throw new Error(`Shopify API returned ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.products || data.products.length === 0) {
        console.log('✅ No more products to fetch');
        hasNextPage = false;
        break;
      }

      console.log(`✅ Fetched ${data.products.length} products from page ${pageCount}`);

      // Converti prodotti Shopify in formato interno
      for (const shopifyProduct of data.products) {
        const product = convertShopifyProduct(shopifyProduct);
        if (product) {
          products.push(product);
        }
      }

      // Gestione paginazione tramite Link header
      const linkHeader = response.headers.get('Link');
      if (linkHeader) {
        const nextLink = parseLinkHeader(linkHeader);
        if (nextLink) {
          pageInfo = extractPageInfo(nextLink);
        } else {
          hasNextPage = false;
        }
      } else {
        hasNextPage = false;
      }

      // Piccola pausa per non sovraccaricare l'API
      if (hasNextPage) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`✅ Total products fetched: ${products.length}`);

    const result: ProductsData = {
      products,
      lastSync: new Date(),
      totalProducts: products.length
    };

    productsCache = result;
    return result;

  } catch (error) {
    console.error('❌ Error fetching from Shopify API:', error);
    
    // Ritorna cache se disponibile
    if (productsCache) {
      console.log('⚠️ Returning cached data due to API error');
      return productsCache;
    }
    
    return getFallbackProducts();
  }
}

/**
 * Costruisce URL API con paginazione
 */
function buildApiUrl(pageInfo: string | null, status?: string): string {
  const baseUrl = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products.json`;
  
  if (pageInfo) {
    const params = new URLSearchParams({
      page_info: pageInfo,
      limit: '250'
    });
    if (status) params.set('status', status);
    params.set('published_status', 'published'); // Mantieni il filtro anche nelle pagine successive
    return `${baseUrl}?${params.toString()}`;
  }
  
  const params = new URLSearchParams({ limit: '250' });
  // Di default prendi solo prodotti active E pubblicati su Online Store
  const productStatus = status || 'active';
  params.set('status', productStatus);
  params.set('published_status', 'published'); // Solo prodotti pubblicati su Online Store
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Parse Link header per paginazione
 */
function parseLinkHeader(linkHeader: string): string | null {
  const links = linkHeader.split(',');
  
  for (const link of links) {
    if (link.includes('rel="next"')) {
      const match = link.match(/<([^>]+)>/);
      return match ? match[1] : null;
    }
  }
  
  return null;
}

/**
 * Estrae page_info dall'URL
 */
function extractPageInfo(url: string): string | null {
  const match = url.match(/page_info=([^&]+)/);
  return match ? match[1] : null;
}

/**
 * Converte un prodotto Shopify nel formato interno
 */
function convertShopifyProduct(shopifyProduct: ShopifyProduct): Product | null {
  try {
    // Verifica che il prodotto sia pubblicato
    if (!shopifyProduct.published_at) {
      console.warn(`⚠️ Product ${shopifyProduct.title} is not published, skipping`);
      return null;
    }
    
    // Prendi la prima variante disponibile per il prezzo
    const firstVariant = shopifyProduct.variants[0];
    
    if (!firstVariant) {
      console.warn(`⚠️ Product ${shopifyProduct.title} has no variants, skipping`);
      return null;
    }

    // Determina se è disponibile
    const inStock = shopifyProduct.variants.some(v => v.inventory_quantity > 0);

    // Formatta prezzo
    const price = formatPrice(firstVariant.price);

    // Pulisci descrizione HTML
    const description = cleanHtmlDescription(shopifyProduct.body_html);

    // Estrai immagini
    const images = shopifyProduct.images.map(img => img.src);

    return {
      id: shopifyProduct.handle,
      url: `https://nabecreation.com/products/${shopifyProduct.handle}`,
      name: shopifyProduct.title,
      price,
      description,
      images,
      category: shopifyProduct.product_type || 'Prodotti',
      inStock,
      lastUpdated: new Date(shopifyProduct.updated_at)
    };

  } catch (error) {
    console.error(`❌ Error converting product ${shopifyProduct.id}:`, error);
    return null;
  }
}

/**
 * Formatta il prezzo
 */
function formatPrice(price: string): string {
  const numPrice = parseFloat(price);
  
  if (isNaN(numPrice)) {
    return 'Prezzo su richiesta';
  }
  
  return `€${numPrice.toFixed(2).replace('.', ',')}`;
}

/**
 * Pulisce la descrizione HTML
 */
function cleanHtmlDescription(html: string): string {
  if (!html) return 'Prodotto di qualità realizzato da Nabè Creation';
  
  // Rimuovi tag HTML
  let text = html.replace(/<[^>]*>/g, ' ');
  
  // Rimuovi spazi multipli
  text = text.replace(/\s+/g, ' ').trim();
  
  // Limita lunghezza
  if (text.length > 300) {
    text = text.substring(0, 297) + '...';
  }
  
  return text || 'Prodotto di qualità realizzato da Nabè Creation';
}

/**
 * Prodotti di fallback in caso di errore
 */
function getFallbackProducts(): ProductsData {
  console.log('⚠️ Using fallback products');
  
  const fallbackProducts: Product[] = [
    {
      id: 'zero-plus-dream',
      url: 'https://nabecreation.com/products/letto-montessori-casetta-baldacchino-zeropiu',
      name: 'Letto Montessori zero+ Dream',
      price: 'da €590',
      description: 'Letto evolutivo montessoriano con casetta e baldacchino, realizzato in legno naturale italiano.',
      images: [],
      category: 'Letti Evolutivi',
      inStock: true,
      lastUpdated: new Date()
    },
    {
      id: 'sponde-protettive',
      url: 'https://nabecreation.com/products/sponde-protettive-per-letto-zeropiu',
      name: 'Sponde Protettive zero+',
      price: 'da €120',
      description: 'Sponde modulari per letto Montessori, sicurezza e comfort per i più piccoli.',
      images: [],
      category: 'Accessori',
      inStock: true,
      lastUpdated: new Date()
    }
  ];

  return {
    products: fallbackProducts,
    lastSync: new Date(),
    totalProducts: fallbackProducts.length
  };
}

/**
 * Cerca prodotti
 */
export function searchShopifyProducts(query: string, products: Product[]): Product[] {
  const searchTerms = query.toLowerCase().split(' ');
  
  return products.filter(product => {
    const searchableText = `${product.name} ${product.description} ${product.category}`.toLowerCase();
    
    return searchTerms.some(term => 
      searchableText.includes(term)
    );
  }).slice(0, 10);
}

/**
 * Ottieni cache status
 */
export function getShopifyCacheStatus(): { isCached: boolean; lastSync?: Date; totalProducts?: number } {
  if (!productsCache) {
    return { isCached: false };
  }

  return {
    isCached: true,
    lastSync: productsCache.lastSync,
    totalProducts: productsCache.totalProducts
  };
}
