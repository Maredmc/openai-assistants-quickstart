import { NABE_KNOWLEDGE_BASE } from "@/app/data/nabe-knowledge";
import { NABE_PRODUCT_HANDLES } from "@/app/data/nabe-product-handles";

const BASE_MARKER =
  "📚 BASE DI CONOSCENZA NABÈ (estratta dal documento Addestramento IA)";

const PRODUCT_SUGGESTION_GUIDE = `ISTRUZIONI PRODOTTI:
- Quando consigli un articolo Nabè, inserisci sempre una riga a parte nel formato esatto [PRODOTTO: handle-prodotto].
- Prima del tag descrivi in 1-2 frasi il beneficio principale con tono Nabè (caloroso, motivazionale, professionale).
- Non usare liste puntate; costruisci al massimo tre paragrafi da 3-4 frasi, ciascuno iniziando con **grassetto**.
- Seleziona gli handle dal riferimento prodotti incluso di seguito.

ESEMPIO:
**Letto perfetto per te:** Ti consiglio questo modello perché regala al bambino uno spazio autonomo e sicuro, ideale per crescere con serenità.
[PRODOTTO: letto-montessori-casetta-baldacchino-zeropiu]`;

const MAX_KNOWLEDGE_LENGTH = 9000;
const MAX_MATCHED_SECTIONS = 10;
const FALLBACK_SECTION_COUNT = 6;

const headingRegex = /^[A-ZÀ-ÖØ-Ý][A-ZÀ-ÖØ-Ý0-9\s\+\-\/]*$/;

type PreparedSection = {
  raw: string;
  normalized: string;
};

function looksLikeHeading(value: string) {
  const cleaned = value.replace(/[^\wÀ-ÖØ-öø-ÿ\s\+\-\/]/g, "").trim();
  if (!cleaned) return false;
  if (cleaned.length > 80) return false;
  if (/[.!?]/.test(cleaned)) return false;
  return headingRegex.test(cleaned);
}

function splitSections(rawContent: string) {
  const blocks = rawContent
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const sections: string[] = [];
  let i = 0;

  while (i < blocks.length) {
    const block = blocks[i];

    if (looksLikeHeading(block) && i + 1 < blocks.length) {
      const contentParts: string[] = [];
      let j = i + 1;
      while (j < blocks.length && !looksLikeHeading(blocks[j])) {
        contentParts.push(blocks[j]);
        j += 1;
      }
      if (contentParts.length > 0) {
        sections.push([block, ...contentParts].join("\n\n"));
        i = j;
        continue;
      }
    }

    sections.push(block);
    i += 1;
  }

  return sections;
}

function prepareSections(rawContent: string): PreparedSection[] {
  return splitSections(rawContent).map((section) => ({
    raw: section,
    normalized: section.toLowerCase(),
  }));
}

function extractKeywords(text: string) {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .split(/[^a-zà-öø-ÿ0-9\+]+/i)
        .filter((token) => token.length > 3)
    )
  );
}

function scoreSection(section: PreparedSection, keywords: string[]) {
  let score = 0;
  for (const keyword of keywords) {
    if (section.normalized.includes(keyword)) {
      score += 1;
    }
  }
  return score;
}

function buildProductReference() {
  return NABE_PRODUCT_HANDLES.map(
    (product) =>
      `${product.name}: usa [PRODOTTO: ${product.id}] quando consigli questo articolo; vantaggio principale: ${product.focus}.`
  ).join("\n");
}

const [RAW_INTRO, RAW_BASE] = NABE_KNOWLEDGE_BASE.split(BASE_MARKER);
const INTRO_SECTION = RAW_INTRO ? `${RAW_INTRO.trim()}\n\n${BASE_MARKER}` : "";
const BASE_CONTENT = RAW_BASE ? RAW_BASE.trim() : NABE_KNOWLEDGE_BASE;
const PREPARED_SECTIONS = prepareSections(BASE_CONTENT);
const FALLBACK_SECTIONS = PREPARED_SECTIONS.slice(0, FALLBACK_SECTION_COUNT);
const PRODUCT_REFERENCE = buildProductReference();

export function buildKnowledgeContext(userMessage: string) {
  const keywords = extractKeywords(userMessage);

  const ranked =
    keywords.length > 0
      ? PREPARED_SECTIONS.map((section) => ({
          section,
          score: scoreSection(section, keywords),
        }))
          .filter((item) => item.score > 0)
          .sort((a, b) => b.score - a.score)
      : [];

  const selectedSections =
    ranked.length > 0
      ? ranked.slice(0, MAX_MATCHED_SECTIONS).map((item) => item.section.raw)
      : FALLBACK_SECTIONS.map((section) => section.raw);

  const knowledgeParts = [
    INTRO_SECTION,
    ...selectedSections,
    PRODUCT_SUGGESTION_GUIDE,
  ].filter(Boolean);
  let baseKnowledge = knowledgeParts.join("\n\n");

  const productReferenceLength = PRODUCT_REFERENCE.length + 2; // include spacing

  if (baseKnowledge.length > MAX_KNOWLEDGE_LENGTH - productReferenceLength) {
    baseKnowledge = baseKnowledge.slice(
      0,
      Math.max(0, MAX_KNOWLEDGE_LENGTH - productReferenceLength)
    );
  }

  const combined = [baseKnowledge.trim(), PRODUCT_REFERENCE]
    .filter(Boolean)
    .join("\n\n");

  return combined.length > MAX_KNOWLEDGE_LENGTH
    ? combined.slice(0, MAX_KNOWLEDGE_LENGTH)
    : combined;
}
