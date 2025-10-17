import { assistantId } from "@/app/assistant-config";
import { NABE_KNOWLEDGE_BASE } from "@/app/data/nabe-knowledge";
import { openai } from "@/app/openai";

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
    additional_messages: [
      {
        role: "system",
        content: [
          {
            type: "text",
            text: NABE_KNOWLEDGE_BASE,
          },
        ],
        metadata: {
          name: "knowledgeBase",
        },
      },
    ],
  });

  return new Response(stream.toReadableStream());
}
