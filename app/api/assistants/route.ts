import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/app/openai";

export const runtime = "nodejs";

// Send a new message to a thread
export async function POST(
  request: NextRequest,
  { params }: { params: { threadId: string } }
) {
  const { content } = await request.json();

  try {
    // Crea il messaggio nel thread
    await openai.beta.threads.messages.create(params.threadId, {
      role: "user",
      content: content,
    });

    // Esegui il thread con l'assistente
    // NOTA: Le istruzioni di sistema devono essere configurate 
    // quando crei l'assistente, non qui
    const stream = openai.beta.threads.runs.stream(params.threadId, {
      assistant_id: process.env.OPENAI_ASSISTANT_ID ?? (() => {
        throw new Error("OPENAI_ASSISTANT_ID is not set");
      })(),
      // Se hai bisogno di istruzioni aggiuntive per questa esecuzione specifica,
      // puoi usare il parametro 'additional_instructions'
      // additional_instructions: "Rispondi sempre in italiano e sii conciso",
    });

    return new NextResponse(stream.toReadableStream());
  } catch (error) {
    console.error("Error creating message or running assistant:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}

// Get messages from a thread
export async function GET(
  request: NextRequest,
  { params }: { params: { threadId: string } }
) {
  try {
    const messages = await openai.beta.threads.messages.list(params.threadId);
    return NextResponse.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}