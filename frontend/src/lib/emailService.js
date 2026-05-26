const sentWelcomeEmails = new Set();

/**
 * Send Welcome Email Directly via Frontend using Brevo API Key
 */
export async function sendWelcomeEmailDirectly(toEmail, username) {
  const normalizedEmail = toEmail?.toLowerCase().trim();
  if (!normalizedEmail) return;

  if (sentWelcomeEmails.has(normalizedEmail)) {
    console.log(`[EmailService] Welcome email already sent or sending to ${normalizedEmail} in this session. Skipping.`);
    return;
  }
  sentWelcomeEmails.add(normalizedEmail);

  const apiKey = process.env.REACT_APP_BREVO_API_KEY;
  if (!apiKey) {
    console.warn('[EmailService] REACT_APP_BREVO_API_KEY is not defined in env.');
    return;
  }

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Discuss</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #374151;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F3F4F6; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 580px; background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
          <tr><td height="4" style="height: 4px; background: linear-gradient(90deg, #DC2626 0%, #2563EB 100%);"></td></tr>
          <tr>
            <td align="center" style="padding: 40px 40px 20px 40px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr><td align="center" style="font-size: 28px; font-weight: 800; letter-spacing: 0.05em; color: #111827;"><span style="color: #DC2626;">D</span>ISCUS<span style="color: #2563EB;">S</span></td></tr>
                <tr><td align="center" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.25em; color: #9CA3AF; font-weight: 700; padding-top: 6px;">Secure Hub</td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px 30px 40px;">
              <h1 style="font-size: 24px; font-weight: 700; color: #111827; margin: 0 0 16px 0; text-align: center;">Welcome, ${username || 'Discuss Member'}!</h1>
              <p style="font-size: 15px; line-height: 1.6; color: #4B5563; margin: 0 0 28px 0; text-align: center; font-weight: 500;">
                Hey, I'm Mohammed Maaz, founder and developer of Discuss. Thanks for joining, and welcome from the Discuss team!
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px; background-color: #F9FAFB; border-radius: 12px; border: 1px solid #E5E7EB; margin-bottom: 12px; display: block;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="48" valign="top" style="font-family: monospace; font-size: 15px; font-weight: 800; color: #DC2626; line-height: 1.2;">01 //</td>
                        <td valign="top">
                          <h4 style="font-size: 14px; font-weight: 700; color: #111827; margin: 0 0 4px 0; text-transform: uppercase; tracking: 0.05em;">Real-time Chats & Groups</h4>
                          <p style="font-size: 13px; line-height: 1.4; color: #6B7280; margin: 0;">Connect immediately with direct messaging and feature-rich group conversations.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td height="12" style="height: 12px;"></td></tr>
                <tr>
                  <td style="padding: 16px; background-color: #F9FAFB; border-radius: 12px; border: 1px solid #E5E7EB; margin-bottom: 12px; display: block;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="48" valign="top" style="font-family: monospace; font-size: 15px; font-weight: 800; color: #2563EB; line-height: 1.2;">02 //</td>
                        <td valign="top">
                          <h4 style="font-size: 14px; font-weight: 700; color: #111827; margin: 0 0 4px 0; text-transform: uppercase; tracking: 0.05em;">Telegram Notifications</h4>
                          <p style="font-size: 13px; line-height: 1.4; color: #6B7280; margin: 0;">Connect your Telegram under Profile to receive lightning-fast alerts even when offline.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td height="12" style="height: 12px;"></td></tr>
                <tr>
                  <td style="padding: 16px; background-color: #F9FAFB; border-radius: 12px; border: 1px solid #E5E7EB; margin-bottom: 12px; display: block;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="48" valign="top" style="font-family: monospace; font-size: 15px; font-weight: 800; color: #4B5563; line-height: 1.2;">03 //</td>
                        <td valign="top">
                          <h4 style="font-size: 14px; font-weight: 700; color: #111827; margin: 0 0 4px 0; text-transform: uppercase; tracking: 0.05em;">Privacy & Protection</h4>
                          <p style="font-size: 13px; line-height: 1.4; color: #6B7280; margin: 0;">Enjoy state-of-the-art security, PIN locks, and advanced data encryption controls.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td style="padding: 0 40px;"><div style="border-top: 1px solid #E5E7EB; height: 1px;"></div></td></tr>
          <tr>
            <td align="center" style="padding: 30px 40px 40px 40px;">
              <p style="font-size: 11px; line-height: 1.6; color: #6B7280; margin: 0 0 16px 0; max-width: 440px;">
                You received this email because you created an account on Discuss. If you did not register, please ignore this email.
              </p>
              <p style="font-size: 11px; line-height: 1.6; color: #DC2626; font-weight: 700; margin: 0 0 20px 0; max-width: 440px;">
                ⚠️ WARNING: If this account was not registered by you, please immediately email us at <a href="mailto:support@discussit.in" style="color: #DC2626; text-decoration: underline; font-weight: 800;">support@discussit.in</a> to immediately block the account.
              </p>
              <p style="font-size: 12px; font-weight: 700; color: #4B5563; margin: 0;">
                Developed by <a href="https://www.maazportfolio.site/" target="_blank" style="color: #4B5563; text-decoration: none; font-weight: 800; background: linear-gradient(120deg, #DC2626 0%, #2563EB 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">&lt;mma/&gt;</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: '<Discuss/>', email: 'support@discussit.in' },
        to: [{ email: toEmail, name: username || 'Discuss Member' }],
        subject: 'Welcome to Discuss!',
        htmlContent: htmlContent
      })
    });
    if (response.ok) {
      console.log(`[EmailService] Welcome email successfully triggered to ${toEmail}`);
    } else {
      const data = await response.text();
      console.error('[EmailService] Failed to trigger welcome email directly:', data);
    }
  } catch (err) {
    console.error('[EmailService] Network error triggering welcome email directly:', err.message);
  }
}
