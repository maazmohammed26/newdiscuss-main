'use strict';

/**
 * Generates the premium HTML welcome email template matching the Discuss branding.
 * @param {string} name - The user's name or username.
 * @returns {string} The fully compiled HTML template.
 */
function getWelcomeEmailHtml(name) {
  const sanitizedName = name || 'Discuss Member';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Discuss</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #080808;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #E1E0CC;
    }
    table {
      border-collapse: collapse;
    }
    a {
      text-decoration: none;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #080808; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E1E0CC;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #080808; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 580px; background-color: #101010; border: 1px solid #1c1c1c; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <!-- Top Accent Line -->
          <tr>
            <td height="4" style="height: 4px; background: linear-gradient(90deg, #DC2626 0%, #2563EB 100%);"></td>
          </tr>
          <!-- Header/Logo Area -->
          <tr>
            <td align="center" style="padding: 40px 40px 20px 40px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="font-size: 28px; font-weight: 800; letter-spacing: 0.05em; color: #FFFFFF;">
                    <span style="color: #DC2626;">D</span>ISCUS<span style="color: #2563EB;">S</span>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.25em; color: #666666; font-weight: 700; padding-top: 6px;">
                    Secure Communication Hub
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Content Body -->
          <tr>
            <td style="padding: 20px 40px 30px 40px;">
              <h1 style="font-size: 24px; font-weight: 700; color: #FFFFFF; margin: 0 0 16px 0; text-align: center;">
                Welcome, ${sanitizedName}!
              </h1>
              <p style="font-size: 15px; line-height: 1.6; color: #A0A090; margin: 0 0 24px 0; text-align: center;">
                Your account is ready. Welcome to a premium, secure social space designed for real-time messaging, immediate notification alerts, and active discussions.
              </p>
              
              <!-- Features List -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px; background-color: #161616; border-radius: 12px; border: 1px solid #222222; margin-bottom: 12px; display: block;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="36" valign="top" style="font-size: 20px; line-height: 1;">💬</td>
                        <td valign="top">
                          <h4 style="font-size: 14px; font-weight: 700; color: #FFFFFF; margin: 0 0 4px 0;">Real-time Chats & Groups</h4>
                          <p style="font-size: 13px; line-height: 1.4; color: #888877; margin: 0;">Connect immediately with direct messaging and feature-rich group conversations.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td height="12" style="height: 12px;"></td></tr>
                <tr>
                  <td style="padding: 16px; background-color: #161616; border-radius: 12px; border: 1px solid #222222; margin-bottom: 12px; display: block;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="36" valign="top" style="font-size: 20px; line-height: 1;">🔔</td>
                        <td valign="top">
                          <h4 style="font-size: 14px; font-weight: 700; color: #FFFFFF; margin: 0 0 4px 0;">Telegram Notifications</h4>
                          <p style="font-size: 13px; line-height: 1.4; color: #888877; margin: 0;">Connect your Telegram under Profile to receive lightning-fast alerts even when offline.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td height="12" style="height: 12px;"></td></tr>
                <tr>
                  <td style="padding: 16px; background-color: #161616; border-radius: 12px; border: 1px solid #222222; margin-bottom: 12px; display: block;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="36" valign="top" style="font-size: 20px; line-height: 1;">🛡️</td>
                        <td valign="top">
                          <h4 style="font-size: 14px; font-weight: 700; color: #FFFFFF; margin: 0 0 4px 0;">Privacy & Protection</h4>
                          <p style="font-size: 13px; line-height: 1.4; color: #888877; margin: 0;">Enjoy state-of-the-art security, PIN locks, and advanced data encryption controls.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Call to Action -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding: 12px 0 24px 0;">
                    <a href="https://discussit.in/" target="_blank" style="display: inline-block; padding: 14px 36px; background: linear-gradient(90deg, #DC2626 0%, #2563EB 100%); color: #FFFFFF; font-weight: 700; font-size: 15px; border-radius: 12px; text-decoration: none; border: none; outline: none; letter-spacing: 0.02em;">
                      Launch Discuss App
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer Divider -->
          <tr>
            <td style="padding: 0 40px;"><div style="border-top: 1px solid #1c1c1c; height: 1px;"></div></td>
          </tr>
          <!-- Footer Content -->
          <tr>
            <td align="center" style="padding: 30px 40px 40px 40px;">
              <p style="font-size: 11px; line-height: 1.6; color: #555555; margin: 0 0 12px 0; max-width: 380px;">
                You received this email because you created an account on Discuss. If you did not register, please ignore this email.
              </p>
              <p style="font-size: 12px; font-weight: 700; color: #777777; margin: 0;">
                Developed by <span style="background: linear-gradient(120deg, #DC2626 0%, #2563EB 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-shadow: 0 0 8px rgba(220, 38, 38, 0.1); font-weight: 800;">&lt;mma/&gt;</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Sends a welcome transactional email via Brevo's API.
 * @param {string} toEmail - The recipient's email address.
 * @param {string} displayName - The recipient's display name or username.
 * @param {string} apiKey - The Brevo API key.
 * @returns {Promise<boolean>} Resolves to true if successful, false otherwise.
 */
async function sendWelcomeEmail(toEmail, displayName, apiKey) {
  if (!apiKey) {
    console.error('[EmailService] API Key is missing. Cannot send welcome email.');
    return false;
  }
  if (!toEmail) {
    console.error('[EmailService] Recipient email is missing.');
    return false;
  }

  const url = 'https://api.brevo.com/v3/smtp/email';
  const htmlContent = getWelcomeEmailHtml(displayName);

  const payload = {
    sender: {
      name: '<Discuss/>',
      email: 'support@discussit.in'
    },
    to: [
      {
        email: toEmail,
        name: displayName || 'Discuss Member'
      }
    ],
    subject: 'Welcome to Discuss!',
    htmlContent: htmlContent
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`[EmailService] Welcome email successfully sent to ${toEmail}. MessageId:`, data.messageId);
      return true;
    } else {
      console.error('[EmailService] Failed to send email via Brevo API:', JSON.stringify(data));
      return false;
    }
  } catch (error) {
    console.error('[EmailService] Network or unexpected error sending email:', error.message);
    return false;
  }
}

module.exports = {
  sendWelcomeEmail,
  getWelcomeEmailHtml
};
