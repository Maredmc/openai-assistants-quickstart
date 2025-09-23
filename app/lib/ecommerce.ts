import { Product, SitemapUrl, ProductsData } from './types';

// Cache per evitare troppe richieste
const CACHE_DURATION = 60 * 60 * 1000; // 1 ora
let productsCache: ProductsData | null = null;

/**
 * Fetch e parsing della sitemap XML di Shopify (SERVER-SIDE)
 */
async function fetchSitemap(url: string): Promise<SitemapUrl[]> {
  try {
    console.log(`🔍 [SERVER] Fetching sitemap: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NabeBot/1.0; +https://nabecreation.com)',
        'Accept': 'application/xml, text/xml, */*',
      },
      // Important: questo gira server-side, non nel browser
    });
    
    if (!response.ok) {
      console.error(`❌ Sitemap fetch failed: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch sitemap: ${response.status}`);
    }

    const xmlText = await response.text();
    console.log(`📄 Sitemap XML length: ${xmlText.length} characters`);
    
    // Parse XML manualmente per evitare dipendenze aggiuntive
    const urls: SitemapUrl[] = [];
    
    // Prima cerchiamo sitemap index
    const sitemapMatches = xmlText.match(/<sitemap>.*?<\/sitemap>/gs);
    if (sitemapMatches) {
      console.log(`📋 Found sitemap index with ${sitemapMatches.length} entries`);
      sitemapMatches.forEach(sitemapBlock => {
        const locMatch = sitemapBlock.match(/<loc>(.*?)<\/loc>/);
        if (locMatch) {
          urls.push({
            loc: locMatch[1],
            lastmod: undefined
          });
        }
      });
    } else {
      // Se non è un index, cerca URL diretti
      const urlMatches = xmlText.match(/<url>.*?<\/url>/gs);
      if (urlMatches) {
        console.log(`🔗 Found ${urlMatches.length} direct URLs`);
        urlMatches.forEach(urlBlock => {
          const locMatch = urlBlock.match(/<loc>(.*?)<\/loc>/);
          const lastmodMatch = urlBlock.match(/<lastmod>(.*?)<\/lastmod>/);
          
          if (locMatch) {
            urls.push({
              loc: locMatch[1],
              lastmod: lastmodMatch ? lastmodMatch[1] : undefined
            });
          }
        });
      }
    }

    console.log(`✅ Parsed ${urls.length} URLs from sitemap`);
    return urls;
  } catch (error) {
    console.error('❌ Error fetching sitemap:', error);
    return [];
  }
}

/**
 * Scraping intelligente di una pagina prodotto
 */
async function scrapeProduct(url: string): Promise<Product | null> {
  try {
    console.log(`🕷️ Scraping product: ${url}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch product page: ${response.status}`);
    }

    const html = await response.text();
    
    // Extract product data using regex patterns
    const product: Product = {
      id: extractProductId(url),
      url,
      name: extractProductName(html),
      price: extractProductPrice(html),
      description: extractProductDescription(html),
      images: extractProductImages(html),
      category: extractProductCategory(html),
      inStock: extractStockStatus(html),
      lastUpdated: new Date()
    };

    return product;
  } catch (error) {
    console.error(`❌ Error scraping product ${url}:`, error);
    return null;
  }
}

/**
 * Funzioni di estrazione dati dalla pagina prodotto
 */
function extractProductId(url: string): string {
  const match = url.match(/\/products\/([^?]+)/);
  return match ? match[1] : url;
}

function extractProductName(html: string): string {
  // Cerca in vari selettori comuni per Shopify
  const patterns = [
    /<h1[^>]*class="[^"]*product[^"]*title[^"]*"[^>]*>(.*?)<\/h1>/i,
    /<h1[^>]*>(.*?)<\/h1>/i,
    /<title>(.*?)\s*–\s*Nabè<\/title>/i,
    /"name"\s*:\s*"([^"]+)"/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      return match[1].replace(/<[^>]*>/g, '').trim();
    }
  }

  return 'Prodotto Nabè';
}

function extractProductPrice(html: string): string {
  const patterns = [
    /"price"\s*:\s*"([^"]+)"/i,
    /<span[^>]*class="[^"]*price[^"]*"[^>]*>(.*?)<\/span>/i,
    /€\s*(\d+(?:[.,]\d{2})?)/i,
    /(\d+(?:[.,]\d{2})?)\s*€/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      const price = match[1].replace(/[^\d.,]/g, '');
      return price ? `€${price}` : 'Prezzo su richiesta';
    }
  }

  return 'Prezzo su richiesta';
}

function extractProductDescription(html: string): string {
  const patterns = [
    /<div[^>]*class="[^"]*product[^"]*description[^"]*"[^>]*>(.*?)<\/div>/is,
    /<div[^>]*class="[^"]*description[^"]*"[^>]*>(.*?)<\/div>/is,
    /"description"\s*:\s*"([^"]+)"/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      return match[1].replace(/<[^>]*>/g, '').trim().substring(0, 200) + '...';
    }
  }

  return 'Letto Montessori evolutivo di alta qualità, realizzato in Italia.';
}

function extractProductImages(html: string): string[] {
  const images: string[] = [];
  const patterns = [
    /src="([^"]*\/products\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/gi,
    /"src"\s*:\s*"([^"]*\/products\/[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/gi
  ];

  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const imageUrl = match[1].startsWith('http') ? match[1] : `https:${match[1]}`;
      if (!images.includes(imageUrl)) {
        images.push(imageUrl);
      }
    }
  });

  return images.slice(0, 5); // Limite a 5 immagini
}

function extractProductCategory(html: string): string {
  // Cerca breadcrumb o categorie
  const patterns = [
    /<nav[^>]*breadcrumb[^>]*>.*?<a[^>]*>([^<]+)</i,
    /collections\/([^\/\?"]+)/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      return match[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  }

  return 'Letti per Bambini';
}

function extractStockStatus(html: string): boolean {
  const outOfStockIndicators = [
    /sold[- ]out/i,
    /out[- ]of[- ]stock/i,
    /esaurito/i,
    /non disponibile/i
  ];

  return !outOfStockIndicators.some(pattern => pattern.test(html));
}

/**
 * Funzione principale per sincronizzare tutti i prodotti
 */
export async function syncProducts(forceRefresh = false): Promise<ProductsData> {
  // Controlla cache
  if (!forceRefresh && productsCache && 
      (Date.now() - productsCache.lastSync.getTime()) < CACHE_DURATION) {
    console.log('📦 Using cached products data');
    return productsCache;
  }

  console.log('🔄 Starting products sync...');
  const startTime = Date.now();

  try {
    // 1. Prima proviamo direttamente la sitemap prodotti Shopify
    let productUrls: SitemapUrl[] = [];
    
    // Lista degli URL da provare per Shopify
    const shopifySitemapUrls = [
      'https://nabecreation.com/sitemap_products_1.xml',
      'https://nabecreation.com/sitemap_products.xml'
    ];
    
    // Proviamo i direct URLs prima
    for (const sitemapUrl of shopifySitemapUrls) {
      console.log(`🎯 Trying direct product sitemap: ${sitemapUrl}`);
      productUrls = await fetchSitemap(sitemapUrl);
      if (productUrls.length > 0) {
        console.log(`✅ Found ${productUrls.length} products in direct sitemap`);
        break;
      }
    }
    
    // Se non troviamo nulla, proviamo il sitemap index
    if (productUrls.length === 0) {
      console.log('📁 Trying main sitemap index...');
      const mainSitemapUrls = await fetchSitemap('https://nabecreation.com/sitemap.xml');
      
      // Cerca sitemap prodotti nel main index
      const productSitemapUrl = mainSitemapUrls.find(url => 
        url.loc.includes('sitemap_products') || 
        url.loc.includes('products') ||
        url.loc.includes('product')
      );

      if (productSitemapUrl) {
        console.log(`🔗 Found product sitemap in index: ${productSitemapUrl.loc}`);
        productUrls = await fetchSitemap(productSitemapUrl.loc);
      }
    }

    // Se ancora non abbiamo prodotti, proviamo a cercare pagine prodotto nel main sitemap
    if (productUrls.length === 0) {
      console.log('⚠️ No product sitemap found, searching main sitemap for product pages...');
      const allUrls = await fetchSitemap('https://nabecreation.com/sitemap.xml');
      
      // Filtra URL che sembrano essere prodotti
      productUrls = allUrls.filter(url => 
        url.loc.includes('/products/') ||
        url.loc.includes('letto') ||
        url.loc.includes('zero')
      );
      console.log(`🔍 Found ${productUrls.length} potential product URLs in main sitemap`);
    }
    
    if (productUrls.length === 0) {
      console.log('❌ No product URLs found in any sitemap');
      // Fallback: aggiungiamo alcuni URL che sappiamo esistere
      productUrls = [
        { loc: 'https://nabecreation.com/products/letto-montessori-casetta-baldacchino-zeropiu' },
        { loc: 'https://nabecreation.com/products/sponde-protettive-per-letto-zeropiu' },
        { loc: 'https://nabecreation.com/collections/linea-zero' }
      ];
      console.log('🆘 Using fallback product URLs');
    }

    // 4. Scrape prodotti (con limite per non sovraccaricare)
    const maxProducts = Math.min(productUrls.length, 20); // Limita a 20 per ora
    const products = await processProductUrls(productUrls.slice(0, maxProducts));
    
    const endTime = Date.now();
    console.log(`✅ Products sync completed in ${(endTime - startTime) / 1000}s`);
    console.log(`📊 Total products scraped: ${products.length}`);

    return cacheAndReturn(products);

  } catch (error) {
    console.error('❌ Error during products sync:', error);
    
    // Ritorna cache se disponibile, altrimenti array vuoto
    if (productsCache) {
      console.log('⚠️ Returning cached data due to sync error');
      return productsCache;
    }
    
    // Fallback con prodotti hard-coded se tutto fallisce
    const fallbackProducts: Product[] = [
      {
        id: 'zero-plus-dream',
        url: 'https://nabecreation.com/products/letto-montessori-casetta-baldacchino-zeropiu',
        name: 'Letto Montessori zero+ Dream',
        price: 'da €590',
        description: 'Letto evolutivo montessoriano con casetta e baldacchino, realizzato in legno naturale.',
        images: ['/logo_nabè.png'],
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
        images: ['/logo_nabè.png'],
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
}

/**
 * Processa gli URL dei prodotti e li scrape
 */
async function processProductUrls(productUrls: SitemapUrl[]): Promise<Product[]> {
  const products: Product[] = [];
  const batchSize = 5; // Processa 5 prodotti alla volta per non sovraccaricare

  for (let i = 0; i < productUrls.length; i += batchSize) {
    const batch = productUrls.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (urlData) => {
      const product = await scrapeProduct(urlData.loc);
      return product;
    });

    const batchResults = await Promise.all(batchPromises);
    
    batchResults.forEach(product => {
      if (product) {
        products.push(product);
      }
    });

    // Piccola pausa tra i batch per non sovraccaricare il server
    if (i + batchSize < productUrls.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return products;
}

/**
 * Caching dei risultati
 */
function cacheAndReturn(products: Product[]): ProductsData {
  const result: ProductsData = {
    products,
    lastSync: new Date(),
    totalProducts: products.length
  };

  productsCache = result;
  return result;
}

/**
 * Cerca prodotti per query
 */
export function searchProducts(query: string, products: Product[]): Product[] {
  const searchTerms = query.toLowerCase().split(' ');
  
  return products.filter(product => {
    const searchableText = `${product.name} ${product.description} ${product.category}`.toLowerCase();
    
    return searchTerms.some(term => 
      searchableText.includes(term) ||
      product.name.toLowerCase().includes(term)
    );
  }).slice(0, 10); // Limita a 10 risultati
}

/**
 * Ottieni prodotti per categoria
 */
export function getProductsByCategory(category: string, products: Product[]): Product[] {
  return products.filter(product => 
    product.category.toLowerCase().includes(category.toLowerCase())
  );
}

/**
 * Ottieni cache status
 */
export function getCacheStatus(): { isCached: boolean; lastSync?: Date; totalProducts?: number } {
  if (!productsCache) {
    return { isCached: false };
  }

  return {
    isCached: true,
    lastSync: productsCache.lastSync,
    totalProducts: productsCache.totalProducts
  };
}
