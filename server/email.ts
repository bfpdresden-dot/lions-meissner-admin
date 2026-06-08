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

async function getSenderInfo(): Promise<{ name: string; email: string }> {
  try {
    const settings = await storage.getSettings();
    const email = settings.senderEmail || process.env.SENDGRID_FROM_EMAIL || "";
    const name = settings.senderName || settings.clubName || "Lions Club Meißner Land";
    if (email) return { name, email };
  } catch {
    // fall through to env var
  }
  const email = process.env.SENDGRID_FROM_EMAIL || "";
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
