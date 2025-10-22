import { Product, ProductsData } from './types';

// Configurazione Shopify
const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || 'nabecreation.myshopify.com';
const SHOPIFY_ADMIN_API_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN;
const SHOPIFY_API_VERSION = '2024-10';

// Cache ottimizzata - durata ridotta a 4 ore per dati più freschi
const CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 ore
const API_TIMEOUT = 8000; // 8 secondi timeout
let productsCache: ProductsData | null = null;

// Solo cache in memoria - rimosso localStorage per evitare conflitti

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
 * Fetch con timeout per evitare blocchi
 */
const fetchWithTimeout = async (url: string, options: RequestInit, timeout = API_TIMEOUT): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
};

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

  console.log('🛍️ Fetching products from Shopify API...');
  console.log('📋 Filters: status=active, published_status=published (Online Store only)');

  if (!SHOPIFY_ADMIN_API_TOKEN) {
    console.error('❌ SHOPIFY_ADMIN_API_TOKEN not configured');
    return getFallbackProducts();
  }

  try {
    const products: Product[] = [];
    let hasNextPage = true;
    let pageInfo: string | null = null;
    let pageCount = 0;

    // Fetch tutti i prodotti con paginazione
    while (hasNextPage && pageCount < 20) { // Limite di sicurezza: max 20 pagine (5000 prodotti)
      pageCount++;
      
      const url = buildApiUrl(pageInfo);
      console.log(`📄 Fetching page ${pageCount}: ${url}`);

      const response = await fetchWithTimeout(url, {
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

/**
 * Interfacce per Customer API
 */
interface ShopifyCustomer {
  id?: number;
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  accepts_marketing?: boolean;
  tags?: string;
  note?: string;
}

interface CreateCustomerParams {
  email?: string;
  phone?: string;
  acceptsMarketing: boolean;
  whatsappMarketing: boolean;
  firstName?: string;
  lastName?: string;
}

/**
 * Cerca un customer esistente per email
 */
async function findCustomerByEmail(email: string): Promise<ShopifyCustomer | null> {
  if (!SHOPIFY_ADMIN_API_TOKEN) {
    console.error('❌ SHOPIFY_ADMIN_API_TOKEN not configured');
    return null;
  }

  try {
    const url = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/customers/search.json?query=email:${encodeURIComponent(email)}`;

    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ADMIN_API_TOKEN,
      },
    });

    if (!response.ok) {
      console.error(`❌ Shopify Customer Search error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.customers && data.customers.length > 0) {
      return data.customers[0];
    }

    return null;
  } catch (error) {
    console.error('❌ Error searching customer:', error);
    return null;
  }
}

/**
 * Crea o aggiorna un customer in Shopify
 */
export async function createOrUpdateShopifyCustomer(params: CreateCustomerParams): Promise<{ success: boolean; customerId?: number; error?: string }> {
  if (!SHOPIFY_ADMIN_API_TOKEN) {
    console.error('❌ SHOPIFY_ADMIN_API_TOKEN not configured');
    return { success: false, error: 'Shopify API token not configured' };
  }

  if (!params.email && !params.phone) {
    return { success: false, error: 'Email or phone required' };
  }

  try {
    // Cerca customer esistente per email
    let existingCustomer: ShopifyCustomer | null = null;

    if (params.email) {
      existingCustomer = await findCustomerByEmail(params.email);
    }

    const tags: string[] = [];

    // Aggiungi tag WhatsApp se richiesto
    if (params.whatsappMarketing) {
      tags.push('WhatsApp');
    }

    // Aggiungi tag Newsletter se richiesto
    if (params.acceptsMarketing) {
      tags.push('Newsletter');
    }

    const customerData: ShopifyCustomer = {
      email: params.email,
      phone: params.phone,
      first_name: params.firstName,
      last_name: params.lastName,
      accepts_marketing: params.acceptsMarketing,
      tags: tags.join(', '),
      note: `Iscritto da chat AI il ${new Date().toLocaleDateString('it-IT')}`,
    };

    let response;
    let customerId: number;

    if (existingCustomer) {
      // Aggiorna customer esistente
      console.log(`📝 Updating existing customer ${existingCustomer.id}`);

      // Merge dei tag esistenti con i nuovi
      const existingTags = existingCustomer.tags ? existingCustomer.tags.split(',').map(t => t.trim()) : [];
      const mergedTags = [...new Set([...existingTags, ...tags])];
      customerData.tags = mergedTags.join(', ');

      const url = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/customers/${existingCustomer.id}.json`;

      response = await fetchWithTimeout(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': SHOPIFY_ADMIN_API_TOKEN,
        },
        body: JSON.stringify({ customer: customerData }),
      });

      customerId = existingCustomer.id;
    } else {
      // Crea nuovo customer
      console.log(`✨ Creating new customer`);

      const url = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/customers.json`;

      response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': SHOPIFY_ADMIN_API_TOKEN,
        },
        body: JSON.stringify({ customer: customerData }),
      });

      const data = await response.json();
      customerId = data.customer?.id;
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Shopify Customer API error: ${response.status}`, errorText);
      return { success: false, error: `Shopify API error: ${response.status}` };
    }

    console.log(`✅ Customer ${existingCustomer ? 'updated' : 'created'} successfully:`, customerId);
    console.log(`   - Email: ${params.email || 'N/A'}`);
    console.log(`   - Phone: ${params.phone || 'N/A'}`);
    console.log(`   - Newsletter: ${params.acceptsMarketing ? '✅' : '❌'}`);
    console.log(`   - WhatsApp: ${params.whatsappMarketing ? '✅' : '❌'}`);
    console.log(`   - Tags: ${tags.join(', ') || 'Nessun tag'}`);

    return { success: true, customerId };

  } catch (error) {
    console.error('❌ Error creating/updating customer:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
