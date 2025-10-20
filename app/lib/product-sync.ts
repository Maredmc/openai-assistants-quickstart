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
    name: 'Letto montessori evolutivo zero+ Fun',
    description: 'Testiera contenitore per autonomia e ordine',
    category: 'letto'
  },
  'zero+ Family': {
    handle: 'letto-evolutivo-zero-family-con-kit-piedini-omaggio',
    name: 'Letto a due piazze zero+ Family', 
    description: 'Due piazze per co-sleeping e comfort familiare',
    category: 'letto'
  },
  'zero+ Duo': {
    handle: 'letto-a-castello-zero-duo-con-kit-piedini-omaggio',
    name: 'Letto a castello zero+ Duo',
    description: 'Soluzione a castello evolutiva per fratelli e sorelle di tutte le età',
    category: 'letto'
  },
  'zero+ Up': {
    handle: 'letto-a-soppalco-mezza-altezza-evolutivo-zero-up', // ✅ CORRETTO
    name: 'Letto a soppalco mezza altezza zero+ Up',
    description: 'Soppalco mezza altezza per liberare spazio',
    category: 'letto'
  },
  'zero+ Uppy': {
    handle: 'letto-a-soppalco-evolutivo-zero-uppy', // ✅ CORRETTO
    name: 'Letto a soppalco evolutivo zero+ Uppy',
    description: 'Il letto evolutivo zero+ Uppy è molto più di un letto a soppalco, è un sistema evolutivo che cresce con il tuo bambino e si adatta ai cambiamenti della famiglia.',
    category: 'letto'
  },

  // 🛏️ ACCESSORI LETTO
  'Sponde': {
    handle: 'sponde-protettive-per-letto-zeropiu',
    name: 'Sponde protettive zero+',
    description: 'Modulari per accompagnare l\'autonomia in sicurezza',
    category: 'accessorio'
  },
  'Kit piedini': {
    handle: 'kit-piedoni-per-letto-zero-dream',
    name: 'Kit piedOni',
    description: 'Rialza il letto di 11cm',
    category: 'accessorio'
  },
  'Kit piedOni': {
    handle: 'kit-piedoni-per-letto-zero-dream',
    name: 'Kit piedOni',
    description: 'Rialza il letto di 23cm per cassettone o autonomia avanzata',
    category: 'accessorio'
  },
  'Cassettone': {
    handle: 'letto-contenitore-estraibile-zeropiu',
    name: 'Cassettone estraibile zero+',
    description: 'Secondo letto o grande contenitore salvaspazio',
    category: 'accessorio'
  },

  // 💤 COMFORT E RIPOSO
  'Materasso': {
    handle: 'materasso-evolutivo-zeropiu',
    name: 'Materasso evolutivo zero+',
    description: 'Schiume ecologiche a zone per ogni fase di crescita',
    category: 'comfort'
  },
  'Cuscini Camomilla': {
    handle: 'cuscino-camomilla', // ✅ AGGIUNTO
    name: 'Coppia cuscini zero+ Camomilla',
    description: 'Memory pro con trattamenti alla camomilla',
    category: 'comfort'
  },
  'Cuscini Plin': {
    handle: 'coppia-cuscini-plin', // ✅ AGGIUNTO
    name: 'Coppia cuscini zero+ Plin',
    description: 'Guanciali lavabili in due taglie evolutive',
    category: 'comfort'
  },

 // 🛏️ ACCESSORI LETTO
 'Kit di Conversione zero+ Dream <-> Earth': {
    handle: 'kit-di-conversione-zero-piu', // ✅ AGGIUNTO
    name: 'Kit di Conversione zero+ Dream <-> Earth',
    description: 'il Kit di Conversione zero+ Dream <-> Earth ti permetterà di cambiare l\'aspetto di zero+ senza mai cambiare letto. Facci sapere quale letto hai e che cosa vuoi ottenere, al resto pensiamo noi! Il letto e altri accessori sono disponibili separatamente.',
    category: 'kit di conversione'
  },
 'Kit di Conversione zero+ Dream/Earth <--> Duo': {
    handle: 'kit-di-conversione-zero-dream-o-earth-duo', // ✅ AGGIUNTO
    name: 'Kit di Conversione zero+ Dream <-> Earth',
    description: 'Il Kit di Conversione da zero+ Dream/Earth a Duo ti permetterà di passare al letto a castello zero+ Duo, seguendo così il percorso evolutivo dei tuoi bambini. oppure È possibile effettuare la conversione da letto a castello Duo a letto zero+ Earth/Dream contattando il nostro servizio clienti, che sarà felice di assisterti e guidarti nel processo. Contattaci per maggiori informazioni.',
    category: 'kit di conversione'
  },
  'Kit conversione cassettone Letto <--> Contenitore': {
    handle: 'kit-cassettone-estraibile-zero', // ✅ AGGIUNTO
    name: 'Kit conversione cassettone Letto <--> Contenitore',
    description: 'Hai già il cassettone estraibile zero+? Con questo kit potrai acquistare separatamente pannelli o doghe in base alle tue necessità, trasformando quando vuoi il tuo cassettone in un contenitore o in un secondo letto.',
    category: 'kit di conversione'
  },
  'Kit Testiera contenitore zero+ Fun': {
    handle: 'kit-testiera-contenitore-zero-fun', // ✅ AGGIUNTO
    name: 'Kit Testiera contenitore zero+ Fun',
    description: 'Grazie al Kit evolutivo Testiera contenitore zero+ Fun potrai trasformare il tuo letto montessoriano evolutivo zero+ Earth o zero+ Dream in zero+ Fun. Questo kit include la testiera contenitore e tutti gli accessori necessari per effettuare la conversione in modo semplice e veloce.',
    category: 'kit di conversione'
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