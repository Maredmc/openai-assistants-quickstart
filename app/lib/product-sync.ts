// 🔄 Product Sync Utility - Mantiene allineati handle assistente e dati
// Usa questo file per sincronizzare automaticamente i prodotti

import { NABE_PRODUCT_HANDLES } from '../data/nabe-product-handles';

// 🎯 MAPPING PRODOTTI SINCRONIZZATO
export const PRODUCT_MAPPING = {
  // ✨ LETTI EVOLUTIVI
  'zero+ Earth': {
    handle: 'letto-zeropiu-earth-con-kit-piedini-omaggio',
    name: 'Letto zero+ Earth',
    description: 'Design essenziale, cresce con i bambini',
    category: 'letto'
  },
  'zero+ Dream': {
    handle: 'letto-montessori-casetta-baldacchino-zeropiu', 
    name: 'Letto montessori zero+ Dream',
    description: 'Casetta o baldacchino per creare rifugio intimo',
    category: 'letto'
  },
  'zero+ Fun': {
    handle: 'letto-evolutivo-fun',
    name: 'Letto zero+ Fun',
    description: 'Testiera contenitore per autonomia e ordine',
    category: 'letto'
  },
  'zero+ Family': {
    handle: 'letto-montessori-evolutivo-zeropiu-family',
    name: 'Letto zero+ Family', 
    description: 'Due piazze per co-sleeping e comfort familiare',
    category: 'letto'
  },
  'zero+ Duo': {
    handle: 'letto-castello-evolutivo-zeropiu-duo',
    name: 'Letto zero+ Duo',
    description: 'Soluzione a castello evolutiva per fratelli',
    category: 'letto'
  },
  'zero+ Up': {
    handle: 'letto-a-soppalco-zeropiu-up', // ✅ CORRETTO
    name: 'Letto zero+ Up',
    description: 'Soppalco mezza altezza per liberare spazio',
    category: 'letto'
  },

  // 🛏️ ACCESSORI LETTO
  'Sponde': {
    handle: 'kit-sponde-di-sicurezza-per-letto-zeropiu',
    name: 'Sponde protettive zero+',
    description: 'Modulari per accompagnare l\'autonomia in sicurezza',
    category: 'accessorio'
  },
  'Kit piedOni': {
    handle: 'kit-piedoni-zeropiu',
    name: 'Kit piedOni',
    description: 'Rialza il letto di 23cm per cassettone o autonomia avanzata',
    category: 'accessorio'
  },
  'Cassettone': {
    handle: 'cassettone-estraibile-letto-zeropiu',
    name: 'Cassettone estraibile zero+',
    description: 'Secondo letto o grande contenitore salvaspazio',
    category: 'accessorio'
  },

  // 💤 COMFORT E RIPOSO
  'Materasso': {
    handle: 'materasso-evolutivo-letto-zeropiu',
    name: 'Materasso evolutivo zero+',
    description: 'Schiume ecologiche a zone per ogni fase di crescita',
    category: 'comfort'
  },
  'Cuscini Camomilla': {
    handle: 'coppia-cuscini-zeropiu-camomilla', // ✅ AGGIUNTO
    name: 'Coppia cuscini zero+ Camomilla',
    description: 'Memory pro con trattamenti alla camomilla',
    category: 'comfort'
  },
  'Cuscini Plin': {
    handle: 'coppia-cuscini-zeropiu-plin', // ✅ AGGIUNTO
    name: 'Coppia cuscini zero+ Plin',
    description: 'Guanciali lavabili in due taglie evolutive',
    category: 'comfort'
  }
};

// 🎯 GENERA ISTRUZIONI PER ASSISTENTE (SINCRONIZZATE)
export function generateAssistantProductInstructions(): string {
  const letti = Object.entries(PRODUCT_MAPPING)
    .filter(([_, product]) => product.category === 'letto')
    .map(([key, product]) => `- ${key}: [PRODOTTO: ${product.handle}]`)
    .join('\n');

  const accessori = Object.entries(PRODUCT_MAPPING)
    .filter(([_, product]) => product.category === 'accessorio')
    .map(([key, product]) => `- ${key}: [PRODOTTO: ${product.handle}]`)
    .join('\n');

  const comfort = Object.entries(PRODUCT_MAPPING)
    .filter(([_, product]) => product.category === 'comfort')
    .map(([key, product]) => `- ${key}: [PRODOTTO: ${product.handle}]`)
    .join('\n');

  return `
🛍️ PRODOTTI AUTOMATICI (OBBLIGATORIO):
Quando consigli qualsiasi prodotto Nabè, inserisci SEMPRE la riga:
[PRODOTTO: handle-prodotto]

HANDLE PRODOTTI CORRETTI E SINCRONIZZATI:

🛏️ LETTI EVOLUTIVI:
${letti}

🔧 ACCESSORI:
${accessori}

💤 COMFORT E RIPOSO:
${comfort}
  `.trim();
}

// 🔍 VALIDAZIONE SINCRONIZZAZIONE
export function validateProductSync(): { 
  isSync: boolean; 
  missing: string[]; 
  extra: string[]; 
  incorrect: Array<{key: string, configured: string, correct: string}>;
} {
  const dataHandles = NABE_PRODUCT_HANDLES.map(p => p.id);
  const configuredHandles = Object.values(PRODUCT_MAPPING).map(p => p.handle);
  
  const missing = dataHandles.filter(h => !configuredHandles.includes(h));
  const extra = configuredHandles.filter(h => !dataHandles.includes(h));
  
  const incorrect: Array<{key: string, configured: string, correct: string}> = [];
  
  Object.entries(PRODUCT_MAPPING).forEach(([key, product]) => {
    const dataProduct = NABE_PRODUCT_HANDLES.find(p => p.id === product.handle);
    if (!dataProduct) {
      const closestMatch = NABE_PRODUCT_HANDLES.find(p => 
        p.name.toLowerCase().includes(key.toLowerCase()) ||
        key.toLowerCase().includes(p.name.toLowerCase())
      );
      if (closestMatch) {
        incorrect.push({
          key,
          configured: product.handle,
          correct: closestMatch.id
        });
      }
    }
  });

  return {
    isSync: missing.length === 0 && extra.length === 0 && incorrect.length === 0,
    missing,
    extra,
    incorrect
  };
}

// 📊 REPORT SINCRONIZZAZIONE
export function getSyncReport(): string {
  const validation = validateProductSync();
  
  if (validation.isSync) {
    return '✅ Tutti i prodotti sono sincronizzati correttamente!';
  }

  let report = '🔄 REPORT SINCRONIZZAZIONE PRODOTTI:\n\n';
  
  if (validation.missing.length > 0) {
    report += '❌ PRODOTTI MANCANTI nell\'assistente:\n';
    validation.missing.forEach(handle => {
      const product = NABE_PRODUCT_HANDLES.find(p => p.id === handle);
      report += `   - ${product?.name} (${handle})\n`;
    });
    report += '\n';
  }

  if (validation.extra.length > 0) {
    report += '⚠️ HANDLE NON VALIDI nell\'assistente:\n';
    validation.extra.forEach(handle => {
      report += `   - ${handle}\n`;
    });
    report += '\n';
  }

  if (validation.incorrect.length > 0) {
    report += '🔧 HANDLE DA CORREGGERE:\n';
    validation.incorrect.forEach(item => {
      report += `   - ${item.key}: "${item.configured}" → "${item.correct}"\n`;
    });
  }

  return report;
}

// 🚀 EXPORT PER USO IMMEDIATO
export const SYNCED_PRODUCT_HANDLES = Object.values(PRODUCT_MAPPING).map(p => p.handle);
export const ALL_PRODUCT_NAMES = Object.entries(PRODUCT_MAPPING).map(([key, product]) => ({
  shortName: key,
  fullName: product.name,
  handle: product.handle,
  category: product.category
}));