import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createOrUpdateShopifyCustomer } from "../../lib/shopify-integration";

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

    // 🏪 INTEGRAZIONE SHOPIFY: Se l'utente ha accettato newsletter o WhatsApp, lo aggiungiamo a Shopify
    let shopifyResult = null;
    if (newsletterAccepted || whatsappAccepted) {
      console.log('🏪 Iniziando integrazione Shopify...');
      try {
        shopifyResult = await createOrUpdateShopifyCustomer({
          email: email || undefined,
          phone: phone || undefined,
          firstName: undefined, // Potremmo aggiungere questi campi al form in futuro
          lastName: undefined,
          newsletterAccepted,
          whatsappAccepted
        });
        
        console.log('✅ Integrazione Shopify completata:', shopifyResult);
      } catch (shopifyError) {
        console.error('⚠️ Errore Shopify (non bloccante):', shopifyError);
        // Non blocchiamo il processo se Shopify fallisce
      }
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

    // 📧 LOGICA EMAIL: Mostra che servizi sono stati attivati
    const servicesActivated = [];
    if (newsletterAccepted) servicesActivated.push('Newsletter (marketing email attivo)');
    if (whatsappAccepted) servicesActivated.push('WhatsApp (SMS marketing)');
    
    const servicesText = servicesActivated.length > 0 
      ? `<br><strong>🎯 Servizi richiesti:</strong> ${servicesActivated.join(', ')}` 
      : '';

    // Aggiungiamo informazioni sull'integrazione Shopify nell'email
    const shopifySection = shopifyResult ? `
      <div style="background-color: ${shopifyResult.success ? '#ecfdf5' : '#fef2f2'}; padding: 15px; border-radius: 8px; margin-top: 20px;">
        <h4 style="color: ${shopifyResult.success ? '#065f46' : '#991b1b'}; margin-top: 0;">
          🏪 Integrazione Shopify
        </h4>
        <p style="margin: 0; color: ${shopifyResult.success ? '#065f46' : '#991b1b'};">
          <strong>Stato:</strong> ${shopifyResult.success ? '✅ Completata' : '❌ Fallita'}<br>
          <strong>Dettagli:</strong> ${shopifyResult.message}<br>
          ${shopifyResult.customerId ? `<strong>ID Cliente:</strong> ${shopifyResult.customerId}<br>` : ''}
          ${shopifyResult.isNewCustomer !== undefined ? `<strong>Tipo:</strong> ${shopifyResult.isNewCustomer ? 'Nuovo cliente' : 'Cliente esistente aggiornato'}<br>` : ''}
          ${servicesText}
          ${shopifyResult.alreadySubscribed ? `
            <br><strong>📋 Stato precedente:</strong><br>
            - Newsletter: ${shopifyResult.alreadySubscribed.newsletter ? '✅ Già iscritto' : '❌ Non iscritto'}<br>
            - WhatsApp: ${shopifyResult.alreadySubscribed.whatsapp ? '✅ Già iscritto' : '❌ Non iscritto'}
          ` : ''}
        </p>
      </div>
    ` : '';

    // Invio email
    console.log('📧 Tentativo invio email a:', "giulio@nabecreation.com");
    console.log('📋 Dati ricevuti:', { email, phone, privacyAccepted, newsletterAccepted, whatsappAccepted });
    
    const emailResponse = await resend.emails.send({
      from: "noreply@nabe.it", // Dominio verificato su Resend
      to: ["giulio@nabecreation.com"],
      subject: `🔥 Nuovo contatto dalla chat AI - ${email}${shopifyResult?.success ? ' 🏪' : ''}`,
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

          ${shopifySection}

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

    // Prepara la risposta con informazioni sull'integrazione Shopify
    let responseMessage = "Richiesta di contatto inviata con successo!";
    
    if (shopifyResult?.success) {
      if (shopifyResult.alreadySubscribed?.newsletter && newsletterAccepted && 
          shopifyResult.alreadySubscribed?.whatsapp && whatsappAccepted) {
        responseMessage += " (Eri già iscritto a tutti i servizi selezionati)";
      } else {
        responseMessage += " Ti abbiamo iscritto automaticamente ai nuovi servizi selezionati.";
      }
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
