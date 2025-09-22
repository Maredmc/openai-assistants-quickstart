import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface ContactRequest {
  email: string;
  phone: string;
  chatHistory: Array<{
    role: string;
    content: string;
    timestamp?: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: ContactRequest = await request.json();
    const { email, phone, chatHistory } = body;

    // Validazione dei dati
    if (!email || !phone) {
      return NextResponse.json(
        { error: "Email e numero di telefono sono obbligatori" },
        { status: 400 }
      );
    }

    // Formattazione della cronologia chat per l'email
    const chatHistoryHtml = chatHistory
      .map((message, index) => {
        const roleLabel = message.role === "user" ? "👤 Utente" : "🤖 Assistente";
        const timestamp = message.timestamp 
          ? `<small style="color: #666;">${new Date(message.timestamp).toLocaleString()}</small>` 
          : "";
        
        return `
          <div style="margin-bottom: 20px; padding: 15px; background-color: ${
            message.role === "user" ? "#f0f9ff" : "#f8fafc"
          }; border-radius: 8px; border-left: 4px solid ${
            message.role === "user" ? "#0ea5e9" : "#10b981"
          };">
            <strong>${roleLabel}</strong> ${timestamp}
            <div style="margin-top: 8px; white-space: pre-wrap;">${message.content}</div>
          </div>
        `;
      })
      .join("");

    // Invio email
    const data = await resend.emails.send({
      from: "noreply@nabecreation.com", // Dovrai verificare questo dominio su Resend
      to: ["hello@nabecreation.com"],
      subject: `🔥 Nuovo contatto dalla chat AI - ${email}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
          <h2 style="color: #1f2937; border-bottom: 2px solid #10b981; padding-bottom: 10px;">
            📞 Nuovo Contatto dalla Chat AI
          </h2>
          
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #374151; margin-top: 0;">📋 Dati di Contatto</h3>
            <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
            <p><strong>Telefono:</strong> <a href="tel:${phone}">${phone}</a></p>
            <p><strong>Data richiesta:</strong> ${new Date().toLocaleString()}</p>
          </div>

          <div style="margin: 30px 0;">
            <h3 style="color: #374151;">💬 Cronologia Conversazione</h3>
            ${chatHistoryHtml}
          </div>

          <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; margin-top: 30px;">
            <p style="margin: 0; color: #065f46;">
              <strong>🎯 Azione richiesta:</strong> Contattare il cliente per un preventivo personalizzato
            </p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ 
      success: true, 
      message: "Richiesta di contatto inviata con successo!",
      emailId: data.data?.id || data.id || "unknown"
    });

  } catch (error) {
    console.error("Errore nell'invio dell'email:", error);
    return NextResponse.json(
      { error: "Errore nell'invio della richiesta di contatto" },
      { status: 500 }
    );
  }
}
