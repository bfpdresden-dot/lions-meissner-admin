import sgMail from "@sendgrid/mail";

function getSendGridClient() {
  const conns = (globalThis as any).__integrationConnections;
  const apiKey = conns?.sendgrid?.api_key || process.env.SENDGRID_API_KEY;
  const fromEmail = conns?.sendgrid?.from_email || process.env.SENDGRID_FROM_EMAIL || "noreply@lionsclub-meissnerlandl.de";
  if (!apiKey) throw new Error("SendGrid API-Key nicht konfiguriert");
  sgMail.setApiKey(apiKey);
  return { sgMail, fromEmail };
}

export async function sendPasswordResetEmail(
  toEmail: string,
  firstName: string,
  resetToken: string,
  baseUrl: string
): Promise<void> {
  const { sgMail, fromEmail } = getSendGridClient();
  const resetUrl = `${baseUrl}/passwort-reset?token=${resetToken}`;

  await sgMail.send({
    to: toEmail,
    from: fromEmail,
    subject: "Passwort zurücksetzen – Lions Club Meißner Land",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a3a5c; font-size: 24px; margin: 0;">Lions Club Meißner Land</h1>
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
          Lions Club Meißner Land · Seestraße 18e · 01640 Coswig
        </p>
      </div>
    `,
    text: `Guten Tag, ${firstName},\n\nSie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt.\n\nBitte klicken Sie auf folgenden Link (gültig für 1 Stunde):\n${resetUrl}\n\nFalls Sie kein neues Passwort angefordert haben, ignorieren Sie diese E-Mail.\n\nMit freundlichen Grüßen\nLions Club Meißner Land`,
  });
}
