import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createOrUpdateShopifyCustomer } from "@/app/lib/shopify";
import { applyRateLimit, type RateLimitStore } from "@/app/lib/security";

const resend = new Resend(process.env.RESEND_API_KEY);

const CONTACT_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const CONTACT_RATE_LIMIT_MAX = 5;
const contactRateLimitStore: RateLimitStore = new Map();

const MAX_CHAT_MESSAGES = 50;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_EMAIL_LENGTH = 254;
const MAX_PHONE_LENGTH = 32;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ContactRequest {
  email?: string;
  phone?: string;
  privacyAccepted?: boolean;
  newsletterAccepted?: boolean;
  whatsappAccepted?: boolean;
  chatHistory?: Array<{
    role?: string;
    content?: string;
    timestamp?: string;
  }>;
}

function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().slice(0, maxLength);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeMultiline(value: unknown): string {
  const text = sanitizeText(value, MAX_MESSAGE_LENGTH);
  if (!text) {
    return "";
  }
  return escapeHtml(text).replace(/\n/g, "<br />");
}

function formatTimestamp(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toLocaleString("it-IT");
}

export async function POST(request: NextRequest) {
  const rateResult = applyRateLimit({
    headers: request.headers,
    store: contactRateLimitStore,
    limit: CONTACT_RATE_LIMIT_MAX,
    windowMs: CONTACT_RATE_LIMIT_WINDOW_MS,
  });

  if (rateResult.limited) {
    return NextResponse.json(
      { error: "Troppe richieste di contatto. Riprova più tardi." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateResult.retryAfter),
        },
      }
    );
  }

  let body: ContactRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Formato JSON non valido" },
      { status: 400 }
    );
  }

  const email = sanitizeText(body.email, MAX_EMAIL_LENGTH);
  const phone = sanitizeText(body.phone, MAX_PHONE_LENGTH);
  const privacyAccepted = body.privacyAccepted === true;
  const newsletterAccepted = body.newsletterAccepted === true;
  const whatsappAccepted = body.whatsappAccepted === true;

  if (!privacyAccepted) {
    return NextResponse.json(
      { error: "È necessario accettare la privacy policy." },
      { status: 400 }
    );
  }

  if (!email && !phone) {
    return NextResponse.json(
      { error: "Inserisci almeno un contatto (email o telefono)." },
      { status: 400 }
    );
  }

  if (email && !EMAIL_PATTERN.test(email)) {
    return NextResponse.json(
      { error: "Indirizzo email non valido." },
      { status: 400 }
    );
  }

  const rawChatHistory = Array.isArray(body.chatHistory)
    ? body.chatHistory.slice(0, MAX_CHAT_MESSAGES)
    : [];

  const chatHistoryHtml = rawChatHistory
    .map((message, index) => {
      const isUser = message?.role === "user";
      const roleLabel = isUser ? "👤 Utente" : "🤖 Assistente";
      const timestampLabel = formatTimestamp(message?.timestamp);
      const timestampHtml = timestampLabel
        ? `<small style="color: #666;">${escapeHtml(timestampLabel)}</small>`
        : "";
      const safeContent = sanitizeMultiline(message?.content);

      return `
        <div style="margin-bottom: 20px; padding: 15px; background-color: ${
          isUser ? "#f0f9ff" : "#f8fafc"
        }; border-radius: 8px; border-left: 4px solid ${
        isUser ? "#0ea5e9" : "#10b981"
      };">
          <strong>${roleLabel}</strong> ${timestampHtml}
          <div style="margin-top: 8px; white-space: normal;">${safeContent}</div>
        </div>
      `;
    })
    .join("");

  const safeEmailDisplay = email || "Non fornita";
  const safePhoneDisplay = phone || "Non fornito";
  const emailHref = email ? `mailto:${encodeURIComponent(email)}` : "#";
  const phoneHref = phone ? `tel:${encodeURIComponent(phone)}` : "#";
  const subjectSuffix = email ? ` - ${email}` : "";
  const requestTimestamp = new Date().toLocaleString("it-IT");

  try {
    await resend.emails.send({
      from: "noreply@nabe.it",
      to: ["giulio@nabecreation.com"],
      subject: `🔥 Nuovo contatto dalla chat AI${subjectSuffix}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
          <h2 style="color: #1f2937; border-bottom: 2px solid #10b981; padding-bottom: 10px;">
            📞 Nuovo Contatto dalla Chat AI
          </h2>
          
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #374151; margin-top: 0;">📋 Dati di Contatto</h3>
            <p><strong>Email:</strong> ${
              email
                ? `<a href="${emailHref}">${escapeHtml(safeEmailDisplay)}</a>`
                : escapeHtml(safeEmailDisplay)
            }</p>
            <p><strong>Telefono:</strong> ${
              phone
                ? `<a href="${phoneHref}">${escapeHtml(safePhoneDisplay)}</a>`
                : escapeHtml(safePhoneDisplay)
            }</p>
            <p><strong>Data richiesta:</strong> ${escapeHtml(requestTimestamp)}</p>
            <br>
            <h4 style="color: #374151; margin-bottom: 10px;">✅ Consensi Privacy</h4>
            <p><strong>Privacy Policy:</strong> ${
              privacyAccepted ? "✅ Accettata" : "❌ Non accettata"
            }</p>
            <p><strong>Newsletter (5% sconto):</strong> ${
              newsletterAccepted ? "✅ Richiesta (iscrizione)" : "❌ Non richiesta"
            }</p>
            <p><strong>WhatsApp Marketing:</strong> ${
              whatsappAccepted ? "✅ Richiesto (tag Whatsapp)" : "❌ Non richiesto"
            }</p>
            ${
              !newsletterAccepted && whatsappAccepted
                ? '<p><em>⚠️ Solo WhatsApp richiesto: stato email non iscritto</em></p>'
                : ""
            }
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
  } catch (error) {
    console.error("Errore nell'invio dell'email di contatto:", error);
    return NextResponse.json(
      { error: "Errore nell'invio della richiesta di contatto" },
      { status: 502 }
    );
  }

  let shopifyResult: Awaited<ReturnType<typeof createOrUpdateShopifyCustomer>> | null = null;

  if (newsletterAccepted || whatsappAccepted) {
    try {
      shopifyResult = await createOrUpdateShopifyCustomer({
        email: email || undefined,
        phone: phone || undefined,
        acceptsMarketing: newsletterAccepted,
        whatsappMarketing: whatsappAccepted,
      });
    } catch (error) {
      console.error("Errore integrazione Shopify:", error);
      shopifyResult = { success: false, error: "Errore integrazione Shopify" };
    }
  }

  console.info("Richiesta contatto elaborata", {
    consent: {
      privacyAccepted,
      newsletterAccepted,
      whatsappAccepted,
    },
    hasEmail: Boolean(email),
    hasPhone: Boolean(phone),
    messages: rawChatHistory.length,
  });

  let responseMessage = "Richiesta di contatto inviata con successo!";

  if (shopifyResult?.success) {
    responseMessage += " Ti abbiamo iscritto automaticamente ai servizi selezionati.";
  } else if (shopifyResult && !shopifyResult.success) {
    responseMessage += " (Nota: iscrizione automatica non riuscita, ti contatteremo manualmente)";
  }

  return NextResponse.json({
    success: true,
    message: responseMessage,
  });
}
