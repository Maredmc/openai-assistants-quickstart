import { openai } from "@/app/openai";

export const runtime = "nodejs";

// Istruzioni ottimizzate per l'assistant
const ASSISTANT_INSTRUCTIONS = `Sei un consulente esperto Nabè per letti bambini.

**FOCUS**: Solo letti per bambini. Altri argomenti → "Contatta 351 984 8828 o hello@nabecreation.com"

**DOMANDE CHIAVE**: Età bambini, numero figli, spazio cameretta, autonomia bambino

**DIMENSIONI**: 190x80cm (2-6 anni), 160x80cm (compatto), 190x120cm (6+ anni)

**SPONDE per età**:
- 1-3 anni: Sponde complete
- 3-5 anni: Set metà superiore  
- 5-7 anni: Testiera pediera
- 7+ anni: Senza sponde

**CASTELLO**: Solo con più figli. Letto superiore: 6+ anni + sponde obbligatorie

**TONO**: Caloroso, sicurezza first, coinvolgi il bambino nelle scelte.`;

// Create a new assistant
export async function POST() {
  const assistant = await openai.beta.assistants.create({
    instructions: ASSISTANT_INSTRUCTIONS,
    name: "Nabè - Consulente Letti Bambini",
    model: "gpt-4-turbo-preview",
    tools: [
      { type: "code_interpreter" },
      { type: "file_search" }
    ],
  });
  return Response.json({ assistantId: assistant.id });
}
