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
    handle: 'letto-a-soppalco-mezza-altezza-evolutivo-zero-up',
    name: 'Letto a soppalco mezza altezza zero+ Up',
    description: 'Soppalco mezza altezza per liberare spazio',
    category: 'letto'
  },
  'zero+ Uppy': {
    handle: 'letto-a-soppalco-evolutivo-zero-uppy',
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
    handle: 'cuscino-camomilla',
    name: 'Coppia cuscini zero+ Camomilla',
    description: 'Memory pro con trattamenti alla camomilla',
    category: 'comfort'
  },
  'Cuscini Plin': {
    handle: 'coppia-cuscini-plin',
    name: 'Coppia cuscini zero+ Plin',
    description: 'Guanciali lavabili in due taglie evolutive',
    category: 'comfort'
  },

  // 🔄 KIT DI CONVERSIONE
  'Kit di Conversione zero+ Dream <-> Earth': {
    handle: 'kit-di-conversione-zero-piu',
    name: 'Kit di Conversione zero+ Dream <-> Earth',
    description: 'il Kit di Conversione zero+ Dream <-> Earth ti permetterà di cambiare l\'aspetto di zero+ senza mai cambiare letto. Facci sapere quale letto hai e che cosa vuoi ottenere, al resto pensiamo noi! Il letto e altri accessori sono disponibili separatamente.',
    category: 'kit di conversione'
  },
  'Kit di Conversione zero+ Dream/Earth <--> Duo': {
    handle: 'kit-di-conversione-zero-dream-o-earth-duo',
    name: 'Kit di Conversione zero+ Dream/Earth <--> Duo',
    description: 'Il Kit di Conversione da zero+ Dream/Earth a Duo ti permetterà di passare al letto a castello zero+ Duo, seguendo così il percorso evolutivo dei tuoi bambini. oppure È possibile effettuare la conversione da letto a castello Duo a letto zero+ Earth/Dream contattando il nostro servizio clienti, che sarà felice di assisterti e guidarti nel processo. Contattaci per maggiori informazioni.',
    category: 'kit di conversione'
  },
  'Kit conversione cassettone Letto <--> Contenitore': {
    handle: 'kit-cassettone-estraibile-zero',
    name: 'Kit conversione cassettone Letto <--> Contenitore',
    description: 'Hai già il cassettone estraibile zero+? Con questo kit potrai acquistare separatamente pannelli o doghe in base alle tue necessità, trasformando quando vuoi il tuo cassettone in un contenitore o in un secondo letto.',
    category: 'kit di conversione'
  },
  'Kit Testiera contenitore zero+ Fun': {
    handle: 'kit-testiera-contenitore-zero-fun',
    name: 'Kit Testiera contenitore zero+ Fun',
    description: 'Grazie al Kit evolutivo Testiera contenitore zero+ Fun potrai trasformare il tuo letto montessoriano evolutivo zero+ Earth o zero+ Dream in zero+ Fun. Questo kit include la testiera contenitore e tutti gli accessori necessari per effettuare la conversione in modo semplice e veloce.',
    category: 'kit di conversione'
  },

  // 📦 BUNDLE 190x80 - EARTH
  'Bundle Young Earth': {
    handle: 'bundle-young-190x80',
    name: 'Bundle Young',
    description: 'Un letto da grandi! Completo di materasso e cuscini, il letto zero+ Earth con sponda testiera e il kit piedOni in omaggio è la proposta evolutiva per accompagnare i bambini dai 6 anni. Raddoppia lo spazio con il cassettone estraibile zero+ e scegli tra la versione contenitore o secondo letto.',
    category: 'bundle'
  },
  'Bundle Junior Earth': {
    handle: 'bundle-junior-190-80',
    name: 'Bundle Junior',
    description: 'La soluzione evolutiva per accompagnare i bambini da 3 a 6 anni. Assicura il comfort di sempre con il letto zero+ Earth con set sponde metà superiore letto, completo di materasso, coprimaterasso, cuscini e paracolpi. Raddoppia lo spazio con il cassettone estraibile zero+e scegli tra la versione contenitore o secondo letto.',
    category: 'bundle'
  },
  'Bundle Baby Earth': {
    handle: 'bundle-baby-190x80',
    name: 'Bundle Baby',
    description: 'Il letto Montessori Evolutivo zero+ Earth con set sponde completo è il luogo ideale per le prime nanne. Il materasso evolutivo zero+, il coprimaterasso impermeabile, la coppia di cuscini Camomilla e i paracolpi assicureranno il massimo comfort. Una soluzione pensata per offrire sicurezza e indipendenza ai più piccoli.',
    category: 'bundle'
  },
  'Bundle Starter Earth': {
    handle: 'bundle-starter-190x80',
    name: 'Bundle Starter',
    description: 'Il Bundle Starter è la soluzione perfetta per iniziare. Con il letto evolutivo zero+ Earth set sponde completo i bambini avranno tutta la protezione di cui hanno bisogno. Il materasso evolutivo zero+ e il suo coprimaterasso impermeabile assicureranno il massimo comfort per la nanna.',
    category: 'bundle'
  },

  // 📦 BUNDLE 190x80 - EARTH BIO PAINT
  'Bundle Young Earth Bio Paint': {
    handle: 'bundle-earth-bio-paint-young-190-80',
    name: 'Bundle Earth bio paint Young',
    description: 'Un letto da grandi! Completo di materasso e cuscini, il letto zero+ Earth con sponda testiera e il kit piedOni in omaggio è la proposta evolutiva per accompagnare i bambini dai 6 anni. Raddoppia lo spazio con il cassettone estraibile zero+ e scegli tra la versione contenitore o secondo letto.',
    category: 'bundle'
  },
  'Bundle Junior Earth Bio Paint': {
    handle: 'bundle-earth-bio-paint-junior-190-80',
    name: 'Bundle Earth bio paint Junior',
    description: 'La soluzione evolutiva per accompagnare i bambini da 3 a 6 anni. Assicura il comfort di sempre con il letto zero+ Earth con set sponde metà superiore letto, completo di materasso, coprimaterasso, cuscini e paracolpi. Raddoppia lo spazio con il cassettone estraibile zero+e scegli tra la versione contenitore o secondo letto.',
    category: 'bundle'
  },
  'Bundle Baby Earth Bio Paint': {
    handle: 'bundle-earth-bio-paint-baby-190-80',
    name: 'Bundle Earth bio paint Baby',
    description: 'Il letto Montessori Evolutivo zero+ Earth con set sponde completo è il luogo ideale per le prime nanne. Il materasso evolutivo zero+, il coprimaterasso impermeabile, la coppia di cuscini Camomilla e i paracolpi assicureranno il massimo comfort. Una soluzione pensata per offrire sicurezza e indipendenza ai più piccoli.',
    category: 'bundle'
  },
  'Bundle Starter Earth Bio Paint': {
    handle: 'bundle-earth-bio-paint-starter-190-80',
    name: 'Bundle Earth bio paint Starter',
    description: 'Il Bundle Starter è la soluzione perfetta per iniziare. Con il letto evolutivo zero+ Earth set sponde completo i bambini avranno tutta la protezione di cui hanno bisogno. Il materasso evolutivo zero+ e il suo coprimaterasso impermeabile assicureranno il massimo comfort per la nanna.',
    category: 'bundle'
  },

  // 📦 BUNDLE 190x80 - DREAM
  'Bundle Young Dream': {
    handle: 'bundle-young-dream-190x80',
    name: 'Bundle Young',
    description: 'Un letto da grandi! Completo di materasso e cuscini, il letto zero+ Dream con sponda testiera e il kit piedOni in omaggio è la proposta evolutiva per accompagnare i bambini dai 6 anni. Raddoppia lo spazio con il cassettone estraibile zero+ e scegli tra la versione contenitore o secondo letto.',
    category: 'bundle'
  },
  'Bundle Junior Dream': {
    handle: 'bundle-junior-dream-190x80',
    name: 'Bundle Junior',
    description: 'La soluzione evolutiva per accompagnare i bambini da 3 a 6 anni. Assicura il comfort di sempre con il letto zero+ Dream con set sponde metà superiore letto, completo di materasso, coprimaterasso, cuscini e paracolpi. Raddoppia lo spazio con il cassettone estraibile zero+ e scegli tra la versione contenitore o secondo letto.',
    category: 'bundle'
  },
  'Bundle Baby Dream': {
    handle: 'bundle-baby-dream-190x80',
    name: 'Bundle Baby',
    description: 'Il letto Montessori Evolutivo zero+ Dream con set sponde completo è il luogo ideale per le prime nanne. Il materasso evolutivo zero+, il coprimaterasso impermeabile, la coppia di cuscini Camomilla e i paracolpi assicureranno il massimo comfort. Una soluzione pensata per offrire sicurezza e indipendenza ai più piccoli.',
    category: 'bundle'
  },
  'Bundle Starter Dream': {
    handle: 'bundle-starter-dream-190x80',
    name: 'Bundle Starter',
    description: 'Il Bundle Starter è la soluzione perfetta per iniziare. Con il letto evolutivo zero+ Dream set sponde completo i bambini avranno tutta la protezione di cui hanno bisogno. Il materasso evolutivo zero+ e il suo coprimaterasso impermeabile assicureranno il massimo comfort per la nanna.',
    category: 'bundle'
  },

  // 📦 BUNDLE 190x80 - FUN
  'Bundle Fun Young': {
    handle: 'bundle-fun-young-190-80',
    name: 'Bundle Fun Young',
    description: 'Un letto da grandi! Completo di materasso, cuscini e imbottitura per la testiera, il letto zero+ Fun con testiera contenitore, senza sponde, e il kit piedOni in omaggio è la proposta evolutiva per accompagnare i bambini dai 6 anni. Raddoppia lo spazio con il cassettone estraibile zero+ e scegli tra la versione contenitore o secondo letto.',
    category: 'bundle'
  },
  'Bundle Fun Junior': {
    handle: 'bundle-fun-junior-190-80',
    name: 'Bundle Fun Junior',
    description: 'La soluzione evolutiva per accompagnare i bambini da 3 a 6 anni. Assicura il comfort di sempre con il letto zero+ Fun con set sponde metà superiore letto e testiera contenitore, completo di materasso, coprimaterasso, cuscini e paracolpi. Raddoppia lo spazio con il cassettone estraibile zero+ e scegli tra la versione contenitore o secondo letto.',
    category: 'bundle'
  },
  'Bundle Fun Baby': {
    handle: 'bundle-fun-baby-190-80',
    name: 'Bundle Fun Baby',
    description: 'Il letto Montessori Evolutivo zero+ Fun con set sponde completo e testiera contenitore è il luogo ideale per le prime nanne. Il materasso evolutivo zero+, il coprimaterasso impermeabile, la coppia di cuscini Camomilla e paracolpi assicureranno il massimo comfort. Una soluzione pensata per offrire sicurezza e indipendenza ai più piccoli.',
    category: 'bundle'
  },
  'Bundle Fun Starter': {
    handle: 'bundle-fun-starter-190-80',
    name: 'Bundle Fun Starter',
    description: 'Il Bundle Starter è la soluzione perfetta per iniziare. Con il letto evolutivo zero+ Fun, dotato di testiera contenitore e set sponde completo, i bambini hanno tutta la protezione di cui hanno bisogno. Il materasso evolutivo zero+ e il suo coprimaterasso impermeabile assicureranno il massimo comfort per la nanna.',
    category: 'bundle'
  },

  // 📦 BUNDLE 190x80 - SPECIALI
  'Bundle Buonanotte': {
    handle: 'bundle-buonanotte-190-80',
    name: 'Bundle Buonanotte',
    description: 'Un letto evolutivo e un percorso esclusivo in omaggio. Con il Bundle Buonanotte ricevi in omaggio 1 mese di supporto personalizzato con Sonno in Rosa.',
    category: 'bundle'
  },
  'Bundle Nanna Plus': {
    handle: 'bundle-nanna-plus-19080',
    name: 'Bundle Nanna Plus | 2 step evolutivi',
    description: 'Il bundle Nanna 2 step evolutivi include i piedini e i piedOni, gli elementi essenziali per trasformare il letto Nabè e accompagnare ogni fase della crescita. Da letto a terra a letto rialzato, l\'evoluzione è semplice e sicura.',
    category: 'bundle'
  },

  // 🛏️ LENZUOLA E COPRIPIUMINI - COLLEZIONE #PianetaTerraChiamaNabè
  'Set Lenzuola Ama il tuo pianeta': {
    handle: 'set-lenzuola-ama-il-tuo-pianeta-letto-montessori',
    name: 'Set Lenzuola Ama il tuo pianeta',
    description: '"Ama il tuo pianeta" è una delle 3 fantasie realizzate insieme alla illustratrice Simona Baronti, con cui abbiamo creato la collezione di lenzuola e copripiumini per lettini Montessori #PianetaTerraChiamaNabè. Una collezione che rappresenta, attraverso le immagini, tre temi che ci stanno molto a cuore e per cui abbiamo deciso di impegnarci. "Ama il tuo pianeta" è la fantasia che parla di come i piccoli gesti, fatti con amore, facciano la differenza, e di come ognunə di noi possa contribuire a prendersi cura del nostro bellissimo pianeta. Il set lenzuola è composto da: Lenzuolo di sotto verde Primavera con angoli elastici, Lenzuolo di sopra con fantasia Ama il tuo pianeta con risvolto intelligente Smart-flap®, Federa per cuscino con fantasia Ama il tuo pianeta. Tutto il set è realizzato in Italia in 100% cotone percalle di alta qualità, 115 grammi, 200 fili.',
    category: 'biancheria'
  },
  'Set copripiumino Ama il tuo pianeta': {
    handle: 'set-copripiumino-ama-il-tuo-pianeta',
    name: 'Set copripiumino Ama il tuo pianeta',
    description: '"Ama il tuo pianeta" è una delle 3 fantasie realizzate insieme alla illustratrice Simona Baronti, con cui abbiamo creato la collezione di lenzuola e copripiumini per lettini Montessori #PianetaTerraChiamaNabè. "Ama il tuo pianeta" è la fantasia che parla di come i piccoli gesti, fatti con amore, facciano la differenza. Il set copripiumino è composto da: Lenzuolo di sotto verde Primavera con angoli elastici, Copripiumino con fantasia Ama il tuo pianeta, Federa per cuscino con fantasia Ama il tuo pianeta. Tutto il set è realizzato in Italia in 100% cotone percalle di alta qualità, 115 grammi, 200 fili.',
    category: 'biancheria'
  },
  'Set Lenzuola Proteggi la vita': {
    handle: 'set-lenzuola-proteggi-la-vita',
    name: 'Set Lenzuola Proteggi la vita',
    description: '"Proteggi la vita" è una delle 3 fantasie realizzate insieme alla illustratrice Simona Baronti, con cui abbiamo creato la collezione di lenzuola e copripiumini per lettini Montessori #PianetaTerraChiamaNabè. "Proteggi la vita" è la fantasia che rappresenta una serie di animali a rischio di estinzione con lo scopo di passare ai nostri bambini il messaggio che le azioni che compiamo ogni giorno hanno un effetto nel pianeta in cui viviamo, si riflettono sulla vita nel suo insieme. Il set lenzuola è composto da: Lenzuolo di sotto bianco Panna con angoli elastici, Lenzuolo di sopra con fantasia Proteggi la vita con risvolto intelligente Smart-flap®, Federa per cuscino con fantasia Proteggi la vita. Tutto il set è realizzato in Italia in 100% cotone percalle di alta qualità.',
    category: 'biancheria'
  },
  'Set copripiumino Proteggi la vita': {
    handle: 'set-copripiumino-proteggi-la-vita',
    name: 'Set copripiumino Proteggi la vita',
    description: '"Proteggi la vita" è una delle 3 fantasie realizzate insieme alla illustratrice Simona Baronti, con cui abbiamo creato la collezione di lenzuola e copripiumini per lettini Montessori #PianetaTerraChiamaNabè. "Proteggi la vita" rappresenta animali a rischio di estinzione per sensibilizzare i bambini. Il set copripiumino è composto da: Lenzuolo di sotto bianco Panna con angoli elastici, Copripiumino con fantasia Proteggi la vita, Federa per cuscino con fantasia Proteggi la vita. Tutto il set è realizzato in Italia in 100% cotone percalle di alta qualità.',
    category: 'biancheria'
  },
  'Set Lenzuola Rispetta la natura': {
    handle: 'set-lenzuola-rispetta-la-natura',
    name: 'Set Lenzuola Rispetta la natura',
    description: '"Rispetta la natura" è una delle 3 fantasie realizzate insieme alla illustratrice Simona Baronti, con cui abbiamo creato la collezione di lenzuola e copripiumini per lettini Montessori #PianetaTerraChiamaNabè. "Rispetta la natura" vuole portare all\'attenzione dei bambini il delicato equilibrio in cui vivono tutti gli elementi della natura e di quanto tempo sia servito per crearlo. Il set lenzuola è composto da: Lenzuolo di sotto bianco Panna con angoli elastici, Lenzuolo di sopra con fantasia Rispetta la natura con risvolto intelligente Smart-flap®, Federa per cuscino con fantasia Rispetta la natura. Tutto il set è realizzato in Italia in 100% cotone percalle di alta qualità.',
    category: 'biancheria'
  },
  'Set copripiumino Rispetta la natura': {
    handle: 'set-copripiumino-rispetta-la-natura',
    name: 'Set copripiumino Rispetta la natura',
    description: '"Rispetta la natura" è una delle 3 fantasie realizzate insieme alla illustratrice Simona Baronti, con cui abbiamo creato la collezione di lenzuola e copripiumini per lettini Montessori #PianetaTerraChiamaNabè. "Rispetta la natura" vuole portare all\'attenzione dei bambini il delicato equilibrio della natura. Il set copripiumino è composto da: Lenzuolo di sotto bianco Panna con angoli elastici, Copripiumino con fantasia Rispetta la natura, Federa per cuscino con fantasia Rispetta la natura. Tutto il set è realizzato in Italia in 100% cotone percalle di alta qualità.',
    category: 'biancheria'
  },
  'nabag - Set letto con zip integrata': {
    handle: 'nabag-set-lenzuola-e-copripiumino-tutto-in-uno',
    name: 'nabag - Set letto con zip integrata',
    description: 'Completa il tuo letto zero+ con nabag, il set lenzuola e copripiumino tutto in uno, in morbido cotone percalle. Mai più notti scoperte: nabag è il primo set lenzuola che mantiene i bambini coperti durante la notte. Inoltre, grazie ai soffietti laterali, permette loro di muoversi liberamente rimanendo al caldo. Semplice e alla portata di tutti: grazie alle pratiche zip laterali rifare il letto è facile, veloce e alla portata dei bambini. Incoraggia la loro autonomia e il senso di responsabilità. Un unico set, per tutte le necessità: un unico pezzo con lenzuola e copripiumino, per comprare di meno ed avere di più. Il lenzuolo di sotto con angoli elastici è integrato al lenzuolo di sopra e tramite una tasca posteriore, inserire il piumino è semplice e veloce. nabag è realizzato in 100% cotone percalle di alta qualità, 115 grammi, 200 fili.',
    category: 'biancheria'
  },

  // 🚪 ARMADI EVOLUTIVI
  'Armadio evolutivo EverGrow Maxi': {
    handle: 'armadio-evolutivo-evergrow-maxi',
    name: 'Armadio evolutivo EverGrow Maxi',
    description: 'L\'armadio evolutivo EverGrow Maxi è la soluzione ideale per una cameretta montessori completa. Unisce estetica e funzionalità. Realizzato in legno massello, questo armadio a 2 ante si ispira alla filosofia Montessori ed è il complemento ideale del letto montessoriano evolutivo zero+ per offrire un ambiente di crescita stimolante e indipendente. Più di un guardaroba Montessori: un compagno di crescita! Progettato come armadio evolutivo grazie alla sua struttura modulare, il guardaroba evolutivo EverGrow Maxi consente di personalizzare completamente lo spazio interno adattandosi alle esigenze in cambiamento del tuo bambino. Intuitivo e accessibile: l\'appendiabiti si può posizionare in basso per permettere ai più piccoli di raggiungere facilmente i loro vestiti, promuovendo l\'autonomia fin dai primi passi. Via via che diventano grandi, l\'armadio cresce con loro, permettendoti di aggiungere cassetti, ulteriori ripiani e ante, per un\'organizzazione dello spazio su misura.',
    category: 'armadio'
  },

  // 🪜 TORRE MONTESSORIANA
  'Torre montessoriana Mia': {
    handle: 'torre-montessoriana-mia',
    name: 'Torre montessoriana Mia',
    description: 'La torre montessoriana evolutiva che cresce con i bambini: da learning tower con ripiano regolabile, si trasforma in scaletta salvaspazio o comoda sediolina, accompagnando ogni fase della loro autonomia. La torre montessoriana Mia è realizzata in 100% legno massello naturale di faggio, non trattato, del tutto privo di sostanze potenzialmente nocive. Il legno naturale non trattato, con le sue venature e nodi unici in ogni pezzo, conferisce carattere e autenticità. Questa variabilità intrinseca non solo esalta l\'estetica, ma rende ogni arredo unico e irripetibile.',
    category: 'torre montessoriana'
  },
  'Torre montessoriana Mia bio paint': {
    handle: 'torre-montessoriana-mia-bio-paint',
    name: 'Torre montessoriana Mia bio paint',
    description: 'La torre montessoriana evolutiva laccata bianca, con vernice all\'acqua bio-paint, per una protezione ecologica, atossica e sicura per i più piccoli. Da learning tower con ripiano regolabile, si trasforma in scaletta salvaspazio o comoda sediolina, accompagnando ogni fase della loro autonomia. La torre montessoriana Mia bio paint è realizzata in 100% legno massello naturale di faggio, del tutto privo di sostanze potenzialmente nocive. Laccata bianca, con vernice all\'acqua bio-paint, per una protezione ecologica, atossica e sicura per i più piccoli. Il legno naturale, con le sue venature e nodi unici in ogni pezzo, conferisce carattere e autenticità.',
    category: 'torre montessoriana'
  },
  'Torre montessoriana Mia bicolor': {
    handle: 'torre-montessoriana-mia-bicolor',
    name: 'Torre montessoriana Mia bicolor',
    description: 'La torre montessoriana evolutiva in versione bicolor per chi le vorrebbe entrambe! Legno naturale e laccata bianca, con vernice all\'acqua bio-paint. Da learning tower con ripiano regolabile, si trasforma in scaletta salvaspazio o comoda sediolina, accompagnando ogni fase della loro autonomia. La torre montessoriana Mia in versione bicolor è realizzata in 100% legno massello naturale di faggio, del tutto privo di sostanze potenzialmente nocive. In legno naturale e laccata bianca con vernice all\'acqua bio-paint.',
    category: 'torre montessoriana'
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

  const bundles = Object.entries(PRODUCT_MAPPING)
    .filter(([_, product]) => product.category === 'bundle')
    .map(([key, product]) => `- ${key}: [PRODOTTO: ${product.handle}]`)
    .join('\n');

  const kitConversione = Object.entries(PRODUCT_MAPPING)
    .filter(([_, product]) => product.category === 'kit di conversione')
    .map(([key, product]) => `- ${key}: [PRODOTTO: ${product.handle}]`)
    .join('\n');

  const biancheria = Object.entries(PRODUCT_MAPPING)
    .filter(([_, product]) => product.category === 'biancheria')
    .map(([key, product]) => `- ${key}: [PRODOTTO: ${product.handle}]`)
    .join('\n');

  const armadio = Object.entries(PRODUCT_MAPPING)
    .filter(([_, product]) => product.category === 'armadio')
    .map(([key, product]) => `- ${key}: [PRODOTTO: ${product.handle}]`)
    .join('\n');

  const torre = Object.entries(PRODUCT_MAPPING)
    .filter(([_, product]) => product.category === 'torre')
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

🔄 KIT DI CONVERSIONE:
${kitConversione}

📦 BUNDLE 190x80:
${bundles}

🛏️ LENZUOLA E COPRIPIUMINI:
${biancheria}

🚪 ARMADI EVOLUTIVI:
${armadio}

🪜 TORRE MONTESSORIANA:
${torre}
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
