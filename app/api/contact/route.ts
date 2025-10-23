import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createOrUpdateShopifyCustomer } from "@/app/lib/shopify";
import {
  applyRateLimit,
  type RateLimitStore,
  isValidEmail,
  isValidPhone,
  sanitizeString,
  isHoneypotFilled,
  detectBot,
  validateJSONPayload,
} from "@/app/lib/security";
import { secureLog } from "@/app/lib/secure-logger";

export const maxDuration = 15; // 15 secondi max per invio email + Shopify

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
  honeypot?: string; // Campo nascosto per bot detection
  chatHistory?: Array<{
    role?: string;
    content?: string;
    timestamp?: string;
  }>;
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
  const text = sanitizeString(String(value || ''), MAX_MESSAGE_LENGTH);
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
  // 🛡️ Bot Detection
  const botCheck = detectBot(request.headers);
  if (botCheck.isBot) {
    secureLog.warn('Bot detected in contact form', { reason: botCheck.reason });
    return NextResponse.json(
      { error: "Richiesta non valida" },
      { status: 403 }
    );
  }

  // 🚦 Rate Limiting
  const rateResult = applyRateLimit({
    headers: request.headers,
    store: contactRateLimitStore,
    limit: CONTACT_RATE_LIMIT_MAX,
    windowMs: CONTACT_RATE_LIMIT_WINDOW_MS,
  });

  if (rateResult.limited) {
    secureLog.warn('Contact rate limit exceeded');
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

  // 📥 Parse JSON
  let body: ContactRequest;
  try {
    body = await request.json();
  } catch {
    secureLog.warn('Invalid JSON in contact request');
    return NextResponse.json(
      { error: "Formato JSON non valido" },
      { status: 400 }
    );
  }

  // 🍯 Honeypot Check
  if (isHoneypotFilled(body.honeypot)) {
    secureLog.warn('Honeypot triggered in contact form');
    // Ritorna successo fake per non far capire al bot
    return NextResponse.json({
      success: true,
      message: "Richiesta di contatto inviata con successo!",
    });
  }

  // ✅ Validazione e sanitizzazione input
  const email = body.email ? sanitizeString(body.email, MAX_EMAIL_LENGTH) : '';
  const phone = body.phone ? sanitizeString(body.phone, MAX_PHONE_LENGTH) : '';
  const privacyAccepted = body.privacyAccepted === true;
  const newsletterAccepted = body.newsletterAccepted === true;
  const whatsappAccepted = body.whatsappAccepted === true;

  // Validazione privacy
  if (!privacyAccepted) {
    secureLog.info('Contact form submission without privacy acceptance');
    return NextResponse.json(
      { error: "È necessario accettare la privacy policy." },
      { status: 400 }
    );
  }

  // Validazione contatti
  if (!email && !phone) {
    return NextResponse.json(
      { error: "Inserisci almeno un contatto (email o telefono)." },
      { status: 400 }
    );
  }

  // Validazione email avanzata
  if (email && !isValidEmail(email)) {
    secureLog.info('Invalid or disposable email rejected');
    return NextResponse.json(
      { error: "Indirizzo email non valido." },
      { status: 400 }
    );
  }

  // Validazione telefono
  if (phone && !isValidPhone(phone)) {
    return NextResponse.json(
      { error: "Numero di telefono non valido." },
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

  // 📧 Invio email
  try {
    await resend.emails.send({
      from: "noreply@nabe.it",
      to: ["hello@nabecreation.com"],
      subject: `💸 Nuovo contatto dalla chat AI${subjectSuffix}`,
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

    secureLog.event('contact_email_sent', {
      hasEmail: Boolean(email),
      hasPhone: Boolean(phone),
      newsletterAccepted,
      whatsappAccepted
    });

  } catch (error) {
    secureLog.error("Error sending contact email", error);
    return NextResponse.json(
      { error: "Errore nell'invio della richiesta di contatto" },
      { status: 502 }
    );
  }

  // 🛒 Integrazione Shopify
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
      secureLog.error("Shopify integration error", error);
      shopifyResult = { success: false, error: "Errore integrazione Shopify" };
    }
  }

  // ⚠️ Log sicuro senza PII
  secureLog.event("contact_form_submitted", {
    hasEmail: Boolean(email),
    hasPhone: Boolean(phone),
    newsletterAccepted,
    whatsappAccepted,
    messagesCount: rawChatHistory.length,
    shopifySuccess: shopifyResult?.success || false,
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
