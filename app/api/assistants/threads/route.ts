import { openai } from "@/app/openai";

export const runtime = "nodejs";
export const maxDuration = 10; // 10 secondi max per creare thread

// Create a new thread
export async function POST() {
  try {
    const thread = await openai.beta.threads.create();
    return Response.json({ threadId: thread.id });
  } catch (error) {
    console.error("Error creating thread:", error);
    return Response.json(
      { error: "Impossibile creare una nuova conversazione. Riprova." },
      { status: 500 }
    );
  }
}
