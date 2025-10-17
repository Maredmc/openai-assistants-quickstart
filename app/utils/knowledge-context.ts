import { NABE_KNOWLEDGE_BASE } from "@/app/data/nabe-knowledge";
import { NABE_PRODUCT_HANDLES } from "@/app/data/nabe-product-handles";

const BASE_MARKER =
  "📚 BASE DI CONOSCENZA NABÈ (estratta dal documento Addestramento IA)";

const headingRegex = /^[A-ZÀ-ÖØ-Ý][A-ZÀ-ÖØ-Ý0-9\s\+\-\/]*$/;

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

function scoreSection(section: string, keywords: string[]) {
  const normalized = section.toLowerCase();
  let score = 0;
  for (const keyword of keywords) {
    if (normalized.includes(keyword)) {
      score += 1;
    }
  }
  return score;
}

export function buildKnowledgeContext(userMessage: string) {
  const [introPart, basePart] = NABE_KNOWLEDGE_BASE.split(BASE_MARKER);
  const intro = introPart ? `${introPart.trim()}\n\n${BASE_MARKER}` : "";
  const baseContent = basePart ? basePart.trim() : NABE_KNOWLEDGE_BASE;

  const sections = splitSections(baseContent);
  const keywords = extractKeywords(userMessage);

  const ranked = sections
    .map((section) => ({
      section,
      score: keywords.length ? scoreSection(section, keywords) : 0,
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.section);

  const fallbackSections = sections.slice(0, 6);
  const selectedSections =
    ranked.length > 0 ? ranked.slice(0, 10) : fallbackSections;

  const productReference = NABE_PRODUCT_HANDLES.map(
    (product) =>
      `${product.name}: usa [PRODOTTO: ${product.id}] quando consigli questo articolo; vantaggio principale: ${product.focus}.`
  ).join("\n");

  const knowledgeParts = [intro, ...selectedSections].filter(Boolean);
  let baseKnowledge = knowledgeParts.join("\n\n");

  const maxLength = 9000;
  const productReferenceLength = productReference.length + 2; // include spacing

  if (baseKnowledge.length > maxLength - productReferenceLength) {
    baseKnowledge = baseKnowledge.slice(
      0,
      Math.max(0, maxLength - productReferenceLength)
    );
  }

  const combined = [baseKnowledge.trim(), productReference].filter(Boolean).join(
    "\n\n"
  );

  return combined.length > maxLength ? combined.slice(0, maxLength) : combined;
}
