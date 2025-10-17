import { assistantId } from "@/app/assistant-config";
import { openai } from "@/app/openai";
import { NABE_KNOWLEDGE_BASE } from "@/app/data/nabe-knowledge";

export const runtime = "nodejs";

// Send a new message to a thread
export async function POST(request, { params: { threadId } }) {
  const { content } = await request.json();

  await openai.beta.threads.messages.create(threadId, {
    role: "user",
    content: content,
  });

  const stream = openai.beta.threads.runs.stream(threadId, {
    assistant_id: assistantId,
    additional_instructions: NABE_KNOWLEDGE_BASE,
  });

  return new Response(stream.toReadableStream());
}
