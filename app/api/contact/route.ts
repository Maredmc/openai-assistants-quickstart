import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createOrUpdateShopifyCustomer } from "@/app/lib/shopify";

const resend = new Resend(process.env.RESEND_API_KEY);

interface ContactRequest {
  email: string;
  phone: string;
  privacyAccepted: boolean;
  newsletterAccepted: boolean;
  whatsappAccepted: boolean;
  chatHistory: Array<{
    role: string;
    content: string;
    timestamp?: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: ContactRequest = await request.json();
    const { email, phone, privacyAccepted, newsletterAccepted, whatsappAccepted, chatHistory } = body;

    // Validazione dei dati
    if (!email && !phone) {
      return NextResponse.json(
        { error: "Inserisci almeno un contatto (email o telefono)" },
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
    console.log('📧 Tentativo invio email a:', "giulio@nabecreation.com");
    console.log('📋 Dati ricevuti:', { email, phone, privacyAccepted, newsletterAccepted, whatsappAccepted });
    
    const emailResponse = await resend.emails.send({
      from: "noreply@nabe.it", // Dominio verificato su Resend
      to: ["giulio@nabecreation.com"],
      subject: `🔥 Nuovo contatto dalla chat AI - ${email}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
          <h2 style="color: #1f2937; border-bottom: 2px solid #10b981; padding-bottom: 10px;">
            📞 Nuovo Contatto dalla Chat AI
          </h2>
          
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #374151; margin-top: 0;">📋 Dati di Contatto</h3>
            <p><strong>Email:</strong> <a href="mailto:${email}">${email || 'Non fornita'}</a></p>
            <p><strong>Telefono:</strong> <a href="tel:${phone}">${phone || 'Non fornito'}</a></p>
            <p><strong>Data richiesta:</strong> ${new Date().toLocaleString()}</p>
            <br>
            <h4 style="color: #374151; margin-bottom: 10px;">✅ Consensi Privacy</h4>
            <p><strong>Privacy Policy:</strong> ${privacyAccepted ? '✅ Accettata' : '❌ Non accettata'}</p>
            <p><strong>Newsletter (5% sconto):</strong> ${newsletterAccepted ? '✅ Richiesta (accepts_marketing: true)' : '❌ Non richiesta'}</p>
            <p><strong>WhatsApp Marketing:</strong> ${whatsappAccepted ? '✅ Richiesto (tag Whatsapp)' : '❌ Non richiesto'}</p>
            ${!newsletterAccepted && whatsappAccepted ? '<p><em>⚠️ Solo WhatsApp richiesto: accepts_marketing = false (unsubscribed)</em></p>' : ''}
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

    console.log('✅ Email inviata con successo:', emailResponse);

    // 🏪 Crea/aggiorna customer in Shopify se richiesto
    let shopifyResult = null;
    if (newsletterAccepted || whatsappAccepted) {
      console.log('🛍️ Creating/updating customer in Shopify...');

      shopifyResult = await createOrUpdateShopifyCustomer({
        email: email || undefined,
        phone: phone || undefined,
        acceptsMarketing: newsletterAccepted,
        whatsappMarketing: whatsappAccepted,
      });

      if (shopifyResult.success) {
        console.log(`✅ Customer ${shopifyResult.customerId} created/updated in Shopify`);
      } else {
        console.error('⚠️ Failed to create/update customer in Shopify:', shopifyResult.error);
        // Non blocca l'operazione, continua comunque
      }
    }

    // Prepara la risposta con informazioni sull'integrazione Shopify
    let responseMessage = "Richiesta di contatto inviata con successo!";
    
    if (shopifyResult?.success) {
      responseMessage += " Ti abbiamo anche iscritto automaticamente ai servizi selezionati.";
    } else if (shopifyResult && !shopifyResult.success) {
      responseMessage += " (Nota: errore nell'iscrizione automatica ai servizi, ti contatteremo comunque)";
    }

    return NextResponse.json({ 
      success: true, 
      message: responseMessage,
      shopify: shopifyResult // Informazioni opzionali per debugging
    });

  } catch (error) {
    console.error("Errore nell'invio dell'email:", error);
    return NextResponse.json(
      { error: "Errore nell'invio della richiesta di contatto" },
      { status: 500 }
    );
  }
}
