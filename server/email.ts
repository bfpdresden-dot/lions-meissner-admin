import sgMail from "@sendgrid/mail";
import { storage } from "./storage";

async function getSendGridApiKey(): Promise<string> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME || process.env.CONNECTORS_HOSTNAME;
  const identity = process.env.REPL_IDENTITY;

  if (hostname && identity) {
    try {
      const res = await fetch(
        `https://${hostname}/v1/connections/conn_sendgrid_01KTKV4WPQRTDJ6ZSDDJK0DAQM/settings`,
        {
          headers: {
            "X-Replit-Identity": identity,
            "Content-Type": "application/json",
          },
        }
      );
      if (res.ok) {
        const data = await res.json() as { api_key?: string };
        if (data.api_key) return data.api_key;
      } else {
        console.warn("Connector API response:", res.status, await res.text().catch(() => ""));
      }
    } catch (err) {
      console.warn("Connector fetch failed:", err);
    }
  }

  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    throw new Error(
      "SendGrid API-Key nicht konfiguriert. Bitte setzen Sie SENDGRID_API_KEY als Umgebungsvariable."
    );
  }
  return apiKey;
}

function sanitizeEmail(raw: string): string {
  // trim whitespace, take first token, remove trailing punctuation
  const cleaned = raw.trim().split(/\s+/)[0].replace(/[.,;]+$/, "");
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned) ? cleaned : "";
}

async function getSenderInfo(): Promise<{ name: string; email: string }> {
  try {
    const settings = await storage.getSettings();
    const rawEmail = settings.senderEmail || process.env.SENDGRID_FROM_EMAIL || "";
    const email = sanitizeEmail(rawEmail);
    const name = settings.senderName || settings.clubName || "Lions Club Meißner Land";
    if (email) return { name, email };
  } catch {
    // fall through to env var
  }
  const email = sanitizeEmail(process.env.SENDGRID_FROM_EMAIL || "");
  return { name: "Lions Club Meißner Land", email };
}

export async function sendPasswordResetEmail(
  toEmail: string,
  firstName: string,
  resetToken: string,
  baseUrl: string
): Promise<void> {
  const apiKey = await getSendGridApiKey();
  const sender = await getSenderInfo();

  if (!sender.email) {
    throw new Error(
      "Absender-E-Mail nicht konfiguriert. Bitte hinterlegen Sie die Absender-E-Mail unter Einstellungen im Admin-Bereich."
    );
  }

  sgMail.setApiKey(apiKey);

  const resetUrl = `${baseUrl}/passwort-reset?token=${resetToken}`;

  const clubStreet = "";
  const clubZip = "";
  const clubCity = "";

  try {
    const settings = await storage.getSettings();
    const address = [
      settings.clubStreet,
      `${settings.clubZip || ""} ${settings.clubCity || ""}`.trim(),
    ].filter(Boolean).join(" · ");

    await sgMail.send({
      to: toEmail,
      from: { name: sender.name, email: sender.email },
      subject: `Passwort zurücksetzen – ${sender.name}`,
      html: buildResetEmailHtml(firstName, resetUrl, sender.name, address),
      text: `Guten Tag, ${firstName},\n\nSie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt.\n\nBitte klicken Sie auf folgenden Link (gültig für 1 Stunde):\n${resetUrl}\n\nFalls Sie kein neues Passwort angefordert haben, ignorieren Sie diese E-Mail.\n\nMit freundlichen Grüßen\n${sender.name}`,
    });
  } catch (err: any) {
    if (err?.response?.body) {
      throw new Error(JSON.stringify(err.response.body));
    }
    throw err;
  }
}

export async function sendCustomEmail(
  recipients: { email: string; firstName: string }[],
  subject: string,
  body: string
): Promise<{ sent: number; failed: number }> {
  const apiKey = await getSendGridApiKey();
  const sender = await getSenderInfo();

  if (!sender.email) {
    throw new Error(
      "Absender-E-Mail nicht konfiguriert. Bitte hinterlegen Sie die Absender-E-Mail unter Einstellungen im Admin-Bereich."
    );
  }

  sgMail.setApiKey(apiKey);

  let settings: any = {};
  try { settings = await storage.getSettings(); } catch {}
  const clubName = settings.clubName || sender.name;
  const address = [settings.clubStreet, `${settings.clubZip || ""} ${settings.clubCity || ""}`.trim()]
    .filter(Boolean).join(" · ");

  const bodyHtml = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");

  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    try {
      const personalizedHtml = bodyHtml.replace(/\{\{vorname\}\}/gi, recipient.firstName);
      const personalizedText = body.replace(/\{\{vorname\}\}/gi, recipient.firstName);
      await sgMail.send({
        to: recipient.email,
        from: { name: sender.name, email: sender.email },
        subject,
        html: buildCustomEmailHtml(subject, personalizedHtml, clubName, address),
        text: personalizedText,
      });
      sent++;
    } catch {
      failed++;
    }
  }

  return { sent, failed };
}

function buildCustomEmailHtml(subject: string, bodyHtml: string, clubName: string, address: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1a3a5c; font-size: 24px; margin: 0;">${clubName}</h1>
        <p style="color: #b8860b; margin: 5px 0 0 0; font-style: italic;">We Serve</p>
      </div>
      <div style="background: #f8f9fa; border-radius: 8px; padding: 30px;">
        <h2 style="color: #1a3a5c; margin-top: 0;">${subject}</h2>
        <div style="color: #333; line-height: 1.7;">${bodyHtml}</div>
      </div>
      <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
        ${clubName}${address ? " · " + address : ""}
      </p>
    </div>
  `;
}

export async function sendOptInEmail(
  toEmail: string,
  firstName: string,
  confirmToken: string,
  baseUrl: string
): Promise<void> {
  const apiKey = await getSendGridApiKey();
  const sender = await getSenderInfo();

  if (!sender.email) {
    throw new Error(
      "Absender-E-Mail nicht konfiguriert. Bitte hinterlegen Sie die Absender-E-Mail unter Einstellungen."
    );
  }

  sgMail.setApiKey(apiKey);

  let settings: any = {};
  try { settings = await storage.getSettings(); } catch {}
  const clubName = settings.clubName || "Lions Club Meißner Land";
  const address = [settings.clubStreet, settings.clubZip, settings.clubCity].filter(Boolean).join(", ");

  const confirmUrl = `${baseUrl}/subscribe/confirm/${confirmToken}`;
  const datenschutzUrl = `${baseUrl}/datenschutz`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1a3a5c; font-size: 24px; margin: 0;">${clubName}</h1>
        <p style="color: #b8860b; margin: 5px 0 0 0; font-style: italic;">We Serve</p>
      </div>

      <div style="background: #f8f9fa; border-radius: 8px; padding: 30px;">
        <h2 style="color: #1a3a5c; margin-top: 0;">Guten Tag, ${firstName},</h2>
        <p style="color: #333; line-height: 1.6;">
          vielen Dank für Ihre Anmeldung zum Newsletter des ${clubName}.
          Bitte bestätigen Sie Ihre E-Mail-Adresse, indem Sie auf den folgenden Button klicken:
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${confirmUrl}"
             style="background-color: #1a3a5c; color: white; padding: 14px 28px;
                    text-decoration: none; border-radius: 6px; font-size: 16px;
                    display: inline-block;">
            ✅ Anmeldung bestätigen
          </a>
        </div>

        <p style="color: #333; line-height: 1.6;">
          <strong>Hinweis zum Geburtstag:</strong> Falls Sie Ihren Geburtstag angegeben haben,
          wird dieser ausschließlich für unsere interne Geburtstagsliste verwendet –
          um Sie an Ihrem Geburtstag zu gratulieren. Er wird nicht für andere Zwecke
          genutzt und nicht an Dritte weitergegeben.
        </p>

        <p style="color: #666; font-size: 14px; line-height: 1.6;">
          Weitere Informationen zur Verarbeitung Ihrer Daten finden Sie in unserer
          <a href="${datenschutzUrl}" style="color: #1a3a5c;">Datenschutzerklärung</a>.
        </p>

        <p style="color: #999; font-size: 12px; line-height: 1.6;">
          Falls Sie sich nicht angemeldet haben, können Sie diese E-Mail einfach ignorieren.
          Der Bestätigungslink ist 7 Tage gültig.<br/>
          Falls der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:<br/>
          <span style="word-break: break-all;">${confirmUrl}</span>
        </p>
      </div>

      <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
        ${clubName}${address ? " · " + address : ""}
      </p>
    </div>
  `;

  await sgMail.send({
    to: toEmail,
    from: { name: sender.name, email: sender.email },
    subject: `Bitte bestätigen Sie Ihre Newsletter-Anmeldung – ${clubName}`,
    html,
  });
}

function buildResetEmailHtml(firstName: string, resetUrl: string, clubName: string, address: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1a3a5c; font-size: 24px; margin: 0;">${clubName}</h1>
        <p style="color: #b8860b; margin: 5px 0 0 0; font-style: italic;">We Serve</p>
      </div>

      <div style="background: #f8f9fa; border-radius: 8px; padding: 30px;">
        <h2 style="color: #1a3a5c; margin-top: 0;">Guten Tag, ${firstName},</h2>
        <p style="color: #333; line-height: 1.6;">
          Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts für den Mitgliederbereich gestellt.
        </p>
        <p style="color: #333; line-height: 1.6;">
          Klicken Sie auf den folgenden Button, um ein neues Passwort zu vergeben:
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}"
             style="background-color: #1a3a5c; color: white; padding: 14px 28px;
                    text-decoration: none; border-radius: 6px; font-size: 16px;
                    display: inline-block;">
            Neues Passwort vergeben
          </a>
        </div>

        <p style="color: #666; font-size: 14px; line-height: 1.6;">
          Dieser Link ist <strong>1 Stunde</strong> gültig. Falls Sie kein neues Passwort angefordert haben,
          können Sie diese E-Mail ignorieren.
        </p>

        <p style="color: #999; font-size: 12px; word-break: break-all;">
          Falls der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:<br/>
          ${resetUrl}
        </p>
      </div>

      <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
        ${clubName}${address ? " · " + address : ""}
      </p>
    </div>
  `;
}
