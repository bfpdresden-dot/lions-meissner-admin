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

// ── Shared layout ─────────────────────────────────────────────────────────────

function buildEmailBase(content: string, clubName: string, address: string): string {
  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f2f5;padding:40px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

      <!-- Header -->
      <tr>
        <td style="background-color:#1a3a5c;border-radius:8px 8px 0 0;padding:32px 40px;text-align:center;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">${clubName}</p>
          <p style="margin:6px 0 0 0;font-size:13px;color:#c8a84b;letter-spacing:2px;text-transform:uppercase;font-style:italic;">We Serve</p>
        </td>
      </tr>

      <!-- Gold divider -->
      <tr>
        <td style="background-color:#c8a84b;height:3px;line-height:3px;font-size:0;">&nbsp;</td>
      </tr>

      <!-- Content -->
      <tr>
        <td style="background-color:#ffffff;padding:40px;border-radius:0 0 8px 8px;">
          ${content}
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding:24px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
            ${clubName}${address ? `&nbsp;&middot;&nbsp;${address}` : ""}
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function btn(href: string, label: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:32px auto;">
    <tr>
      <td style="background-color:#1a3a5c;border-radius:6px;">
        <a href="${href}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.3px;">${label}</a>
      </td>
    </tr>
  </table>`;
}

function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;width:110px;vertical-align:top;">
      <span style="font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">${label}</span>
    </td>
    <td style="padding:8px 0 8px 16px;border-bottom:1px solid #f3f4f6;vertical-align:top;">
      <span style="font-size:14px;color:#1f2937;">${value}</span>
    </td>
  </tr>`;
}

function greeting(firstName: string): string {
  return `<p style="font-size:18px;font-weight:600;color:#1a3a5c;margin:0 0 16px 0;">Guten Tag, ${firstName},</p>`;
}

function footnote(text: string): string {
  return `<p style="font-size:12px;color:#9ca3af;line-height:1.6;margin:24px 0 0 0;text-align:center;">${text}</p>`;
}

function fallbackLink(url: string): string {
  return `<p style="font-size:11px;color:#9ca3af;margin:8px 0 0 0;text-align:center;">
    Falls der Button nicht funktioniert, kopieren Sie diesen Link:<br/>
    <span style="word-break:break-all;color:#6b7280;">${url}</span>
  </p>`;
}

// ── sendPasswordResetEmail ────────────────────────────────────────────────────

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

  let settings: any = {};
  try { settings = await storage.getSettings(); } catch {}
  const clubName = settings.clubName || sender.name;
  const address = [settings.clubStreet, `${settings.clubZip || ""} ${settings.clubCity || ""}`.trim()]
    .filter(Boolean).join(" · ");

  const resetUrl = `${baseUrl}/passwort-reset?token=${resetToken}`;

  const content = `
    ${greeting(firstName)}
    <p style="font-size:14px;color:#4b5563;line-height:1.7;margin:0 0 8px 0;">
      Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts für den Mitgliederbereich gestellt.
      Klicken Sie auf den Button um ein neues Passwort zu vergeben:
    </p>
    ${btn(resetUrl, "Neues Passwort vergeben")}
    <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:0;">
      Dieser Link ist <strong>1 Stunde</strong> gültig. Falls Sie kein neues Passwort angefordert haben, können Sie diese E-Mail ignorieren.
    </p>
    ${fallbackLink(resetUrl)}
  `;

  try {
    await sgMail.send({
      to: toEmail,
      from: { name: sender.name, email: sender.email },
      subject: `Passwort zurücksetzen – ${clubName}`,
      html: buildEmailBase(content, clubName, address),
      text: `Guten Tag, ${firstName},\n\nSie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt.\n\nBitte klicken Sie auf folgenden Link (gültig für 1 Stunde):\n${resetUrl}\n\nFalls Sie kein neues Passwort angefordert haben, ignorieren Sie diese E-Mail.\n\nMit freundlichen Grüßen\n${clubName}`,
    });
  } catch (err: any) {
    if (err?.response?.body) throw new Error(JSON.stringify(err.response.body));
    throw err;
  }
}

// ── sendCustomEmail ───────────────────────────────────────────────────────────

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

  const bodyToHtml = (text: string) =>
    text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>");

  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    try {
      const personalizedBody = body.replace(/\{\{vorname\}\}/gi, recipient.firstName);
      const personalizedHtml = bodyToHtml(personalizedBody);
      const content = `
        ${greeting(recipient.firstName)}
        <div style="font-size:15px;color:#374151;line-height:1.8;">${personalizedHtml}</div>
        ${footnote(`Sie erhalten diese E-Mail, weil Sie den Newsletter des ${clubName} abonniert haben.`)}
      `;
      await sgMail.send({
        to: recipient.email,
        from: { name: sender.name, email: sender.email },
        subject,
        html: buildEmailBase(content, clubName, address),
        text: personalizedBody,
      });
      sent++;
    } catch {
      failed++;
    }
  }

  return { sent, failed };
}

// ── sendEventNotification ─────────────────────────────────────────────────────

export async function sendEventNotification(
  event: { id: number; title: string; date: string | Date; endDate?: string | Date | null; location: string; description?: string | null },
  subscribers: { email: string; firstName: string }[],
  baseUrl: string
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

  const dateStr = new Date(event.date).toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const timeStr = new Date(event.date).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  const endTimeStr = event.endDate ? new Date(event.endDate).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : null;
  const timeDisplay = endTimeStr ? `${timeStr} – ${endTimeStr} Uhr` : `${timeStr} Uhr`;
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`;
  const registerLink = `${baseUrl}/veranstaltungen`;
  const descHtml = (event.description || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>");

  let sent = 0;
  let failed = 0;

  for (const sub of subscribers) {
    const content = `
      ${greeting(sub.firstName)}
      <p style="font-size:15px;color:#4b5563;line-height:1.7;margin:0 0 24px 0;">
        wir freuen uns, Sie zu unserer nächsten Veranstaltung einladen zu dürfen.
      </p>

      <!-- Event card -->
      <table cellpadding="0" cellspacing="0" width="100%" style="background-color:#f8f9fb;border-radius:8px;border:1px solid #e5e7eb;margin-bottom:24px;">
        <tr>
          <td style="background-color:#1a3a5c;border-radius:8px 8px 0 0;padding:16px 24px;">
            <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;">${event.title}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 24px;">
            <table cellpadding="0" cellspacing="0" width="100%">
              ${detailRow("Datum", dateStr)}
              ${detailRow("Uhrzeit", timeDisplay)}
              ${detailRow("Ort", `<a href="${mapsLink}" style="color:#1a3a5c;text-decoration:underline;">${event.location}</a>`)}
              ${descHtml ? detailRow("Details", `<span style="line-height:1.7;">${descHtml}</span>`) : ""}
            </table>
          </td>
        </tr>
      </table>

      ${btn(registerLink, "Jetzt zur Veranstaltung anmelden")}
      ${footnote(`Sie erhalten diese E-Mail, weil Sie den Newsletter des ${clubName} abonniert haben.`)}
    `;

    const subject = `Einladung: ${event.title} – ${clubName}`;
    let success = true;
    try {
      await sgMail.send({
        to: sub.email,
        from: { name: sender.name, email: sender.email },
        subject,
        html: buildEmailBase(content, clubName, address),
        text: `Guten Tag, ${sub.firstName},\n\nwir laden Sie ein zur Veranstaltung:\n\n${event.title}\n${dateStr}, ${timeDisplay}\n${event.location}\n\n${event.description || ""}\n\nJetzt anmelden: ${registerLink}\n\n${clubName}`,
      });
      sent++;
    } catch {
      failed++;
      success = false;
    }
    try {
      await storage.createEmailLog({
        eventId: event.id,
        recipientEmail: sub.email,
        recipientName: sub.firstName,
        subject,
        success,
      });
    } catch {}
  }

  return { sent, failed };
}

// ── sendOptInEmail ────────────────────────────────────────────────────────────

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

  const content = `
    ${greeting(firstName)}
    <p style="font-size:15px;color:#4b5563;line-height:1.7;margin:0 0 8px 0;">
      vielen Dank für Ihre Anmeldung. Bitte bestätigen Sie Ihre E-Mail-Adresse mit einem Klick auf den Button:
    </p>
    ${btn(confirmUrl, "Anmeldung bestätigen")}
    <table cellpadding="0" cellspacing="0" width="100%" style="background-color:#f8f9fb;border-radius:6px;border:1px solid #e5e7eb;margin-bottom:8px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 6px 0;font-size:13px;font-weight:600;color:#374151;">Hinweis zum Datenschutz</p>
          <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
            Ein ggf. angegebener Geburtstag wird ausschließlich für unsere interne Geburtstagsliste genutzt und nicht an Dritte weitergegeben.
            Weitere Informationen finden Sie in unserer <a href="${datenschutzUrl}" style="color:#1a3a5c;">Datenschutzerklärung</a>.
          </p>
        </td>
      </tr>
    </table>
    ${footnote("Falls Sie sich nicht angemeldet haben, können Sie diese E-Mail ignorieren. Der Link ist 7 Tage gültig.")}
    ${fallbackLink(confirmUrl)}
  `;

  await sgMail.send({
    to: toEmail,
    from: { name: sender.name, email: sender.email },
    subject: `Bitte bestätigen Sie Ihre Anmeldung – ${clubName}`,
    html: buildEmailBase(content, clubName, address),
    text: `Guten Tag, ${firstName},\n\nBitte bestätigen Sie Ihre Anmeldung:\n${confirmUrl}\n\nDer Link ist 7 Tage gültig.\n\n${clubName}`,
  });
}
