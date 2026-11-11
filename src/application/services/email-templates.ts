export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));

/** E-mail de vérification : version texte (repli) + HTML professionnel avec bouton d'activation. */
export function verificationEmail({ name, link, expiresHours = 24 }: { name: string; link: string; expiresHours?: number }): EmailContent {
  const firstName = name.trim().split(/\s+/)[0] || 'étudiant';
  const safeName = escapeHtml(firstName);
  const safeLink = escapeHtml(link);
  const subject = 'Go-TEK-UP : confirmez votre adresse e-mail';
  const text =
    `Bonjour ${firstName},\n\n` +
    `Merci pour votre inscription sur Go-TEK-UP.\n` +
    `Pour activer votre compte, ouvrez ce lien (valable ${expiresHours} heures) :\n${link}\n\n` +
    `Si vous n'êtes pas à l'origine de cette inscription, ignorez simplement ce message.\n\n` +
    `L'équipe Go-TEK-UP`;
  const html = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f3f6fb;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f3f6fb;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,0.08);">
            <tr>
              <td style="background-color:#0f766e;padding:24px 32px;">
                <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">Go-TEK-UP</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#0f172a;">Confirmez votre adresse e-mail</h1>
                <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Bonjour ${safeName},</p>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">
                  Merci pour votre inscription sur <strong>Go-TEK-UP</strong>. Cliquez sur le bouton ci-dessous pour activer votre compte.
                </p>
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px;">
                  <tr>
                    <td style="border-radius:8px;background-color:#0f766e;">
                      <a href="${safeLink}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Confirmer mon adresse</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#475569;">
                  Ce lien est valable <strong>${expiresHours} heures</strong> et ne peut être utilisé qu'une seule fois.
                </p>
                <p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:#475569;">
                  Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br />
                  <a href="${safeLink}" style="color:#0f766e;word-break:break-all;">${safeLink}</a>
                </p>
                <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 20px;" />
                <p style="margin:0;font-size:12px;line-height:1.6;color:#64748b;">
                  Si vous n'êtes pas à l'origine de cette inscription, ignorez simplement ce message : aucun compte ne sera activé sans ce clic.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background-color:#f8fafc;padding:18px 32px;font-size:12px;color:#64748b;">
                Go-TEK-UP — plateforme d'entraide étudiante
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  return { subject, text, html };
}
