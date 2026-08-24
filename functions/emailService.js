'use strict';

const https = require('https');

function escapeEmailHtml(value) {
  return String(value || 'Discuss Member')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generates the premium HTML welcome email template matching the Discuss branding.
 * @param {string} name - The user's name or username.
 * @returns {string} The fully compiled HTML template.
 */
function getWelcomeEmailHtml(name) {
  const sanitizedName = escapeEmailHtml(name);
  
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
      background-color: #F6F7F9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #374151;
    }
    table {
      border-collapse: collapse;
    }
    a {
      text-decoration: none;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F6F7F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #374151;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F6F7F9; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 600px; background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 60px rgba(15,23,42,0.08);">
          <!-- Top Accent Line -->
          <tr>
            <td height="4" style="height: 4px; background: linear-gradient(90deg, #DC2626 0%, #2563EB 100%);"></td>
          </tr>
          <!-- Header/Logo Area -->
          <tr>
            <td align="center" style="padding: 40px 40px 20px 40px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" aria-label="Discuss" style="font-size: 34px; font-weight: 700; letter-spacing: -0.04em; color: #111827; font-family: 'Brush Script MT', 'Segoe Script', cursive;">
                    <span style="color: #EF4444; font-family: Arial, sans-serif; font-weight: 900;">&lt;</span><span style="color: #111827;">Discuss</span><span style="color: #0095F6; font-family: Arial, sans-serif; font-weight: 900;">/&gt;</span>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.25em; color: #9CA3AF; font-weight: 700; padding-top: 6px;">
                    A focused network for developers
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Content Body -->
          <tr>
            <td style="padding: 20px 40px 30px 40px;">
              <h1 style="font-size: 30px; line-height: 1.2; letter-spacing: -0.04em; font-weight: 800; color: #111827; margin: 0 0 14px 0; text-align: center;">
                Welcome to Discuss, ${sanitizedName}.
              </h1>
              
              <!-- Your Custom Personal Message -->
              <p style="font-size: 15px; line-height: 1.6; color: #4B5563; margin: 0 0 28px 0; text-align: center; font-weight: 500;">
                Your developer profile is ready. Share ideas, publish what you are building, discover the right people, and join conversations that help you move forward.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 30px 0;">
                <tr>
                  <td align="center">
                    <a href="https://discussit.in/feed" style="display: inline-block; background-color: #0095F6; color: #FFFFFF; font-size: 14px; line-height: 18px; font-weight: 800; padding: 14px 24px; border-radius: 12px; text-decoration: none; box-shadow: 0 8px 24px rgba(0,149,246,0.24);">Open your Discuss feed&nbsp;&nbsp;→</a>
                  </td>
                </tr>
              </table>
              
              <!-- Monospace Developer Features Layout -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px; background-color: #F9FAFB; border-radius: 12px; border: 1px solid #E5E7EB; margin-bottom: 12px; display: block;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="48" valign="top" style="font-family: monospace; font-size: 15px; font-weight: 800; color: #DC2626; line-height: 1.2;">
                          01 //
                        </td>
                        <td valign="top">
                          <h4 style="font-size: 14px; font-weight: 800; color: #111827; margin: 0 0 4px 0;">Start a useful discussion</h4>
                          <p style="font-size: 13px; line-height: 1.5; color: #6B7280; margin: 0;">Ask a technical question, share context, and learn from developers who care about the details.</p>
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
                        <td width="48" valign="top" style="font-family: monospace; font-size: 15px; font-weight: 800; color: #2563EB; line-height: 1.2;">
                          02 //
                        </td>
                        <td valign="top">
                          <h4 style="font-size: 14px; font-weight: 800; color: #111827; margin: 0 0 4px 0;">Show what you are building</h4>
                          <p style="font-size: 13px; line-height: 1.5; color: #6B7280; margin: 0;">Publish projects, code, links, images, and progress in a clean developer-first format.</p>
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
                        <td width="48" valign="top" style="font-family: monospace; font-size: 15px; font-weight: 800; color: #4B5563; line-height: 1.2;">
                          03 //
                        </td>
                        <td valign="top">
                          <h4 style="font-size: 14px; font-weight: 800; color: #111827; margin: 0 0 4px 0;">Find your developer network</h4>
                          <p style="font-size: 13px; line-height: 1.5; color: #6B7280; margin: 0;">Discover people through TalentGraph and DevRadar, then connect through groups and private chat.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer Divider -->
          <tr>
            <td style="padding: 0 40px;"><div style="border-top: 1px solid #E5E7EB; height: 1px;"></div></td>
          </tr>
          <!-- Footer Content -->
          <tr>
            <td align="center" style="padding: 30px 40px 40px 40px;">
              <p style="font-size: 11px; line-height: 1.6; color: #6B7280; margin: 0 0 16px 0; max-width: 440px;">
                You received this email because you created an account on Discuss. If you did not register, please ignore this email.
              </p>
              
              <!-- Warning Note -->
              <p style="font-size: 11px; line-height: 1.6; color: #DC2626; font-weight: 700; margin: 0 0 20px 0; max-width: 440px;">
                ⚠️ WARNING: If this account was not registered by you, please immediately email us at <a href="mailto:support@discussit.in" style="color: #DC2626; text-decoration: underline; font-weight: 800;">support@discussit.in</a> to immediately block the account.
              </p>
              
              <!-- Follow Us On & Instagram Link -->
              <p style="font-size: 11px; color: #9CA3AF; margin: 0 0 10px 0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;">
                Follow us on
              </p>
              <div style="margin-bottom: 24px;">
                <a href="https://www.instagram.com/discussit.in" target="_blank" style="display: inline-block; padding: 8px 16px; background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%); border-radius: 8px; font-size: 12px; font-weight: 700; color: #FFFFFF; text-decoration: none;">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Instagram_icon.png/600px-Instagram_icon.png" width="12" height="12" alt="" style="vertical-align: middle; margin-right: 6px; border: 0; display: inline-block;" />
                  discussit.in
                </a>
              </div>
              
              <!-- Linked Portfolio Signature -->
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
}

/**
 * Generates the premium HTML community engagement newsletter email template.
 * @param {string} name - The user's name or username.
 * @returns {string} The fully compiled HTML template.
 */
function getEngagementEmailHtml(name) {
  const displayName = name || 'Discuss Member';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connect, Build, and Interact on Discuss</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #F3F4F6;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #374151;
    }
    table {
      border-collapse: collapse;
    }
    a {
      text-decoration: none;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #374151;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F3F4F6; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 580px; background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
          <!-- Top Accent Line -->
          <tr>
            <td height="4" style="height: 4px; background: linear-gradient(90deg, #DC2626 0%, #2563EB 100%);"></td>
          </tr>
          <!-- Header/Logo Area -->
          <tr>
            <td align="center" style="padding: 40px 40px 20px 40px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="font-size: 28px; font-weight: 800; letter-spacing: 0.05em; color: #111827;">
                    <span style="color: #DC2626;">D</span>ISCUS<span style="color: #2563EB;">S</span>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.25em; color: #9CA3AF; font-weight: 700; padding-top: 6px;">
                    Ecosystem Engagement
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Content Body -->
          <tr>
            <td style="padding: 20px 40px 30px 40px;">
              <h1 style="font-size: 22px; font-weight: 800; color: #111827; margin: 0 0 16px 0; text-align: center; tracking: -0.02em;">
                Share Your Insights on Discuss!
              </h1>
              
              <p style="font-size: 15px; line-height: 1.6; color: #4B5563; margin: 0 0 24px 0; text-align: left; font-weight: 500;">
                Hey ${displayName},
              </p>
              
              <p style="font-size: 15px; line-height: 1.6; color: #4B5563; margin: 0 0 24px 0; text-align: left; font-weight: 500;">
                Discuss is growing! We built this high-signal space to give developers like you the absolute best environment to share code, ask technical questions, and collaborate with zero noise. 
              </p>
              
              <p style="font-size: 15px; line-height: 1.6; color: #4B5563; margin: 0 0 28px 0; text-align: left; font-weight: 500;">
                The platform is alive with active technical exchanges—here's how you can make the most of your membership today:
              </p>
              
              <!-- Monospace Developer Features Layout -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 28px;">
                <tr>
                  <td style="padding: 16px; background-color: #F9FAFB; border-radius: 12px; border: 1px solid #E5E7EB; margin-bottom: 12px; display: block;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="48" valign="top" style="font-family: monospace; font-size: 15px; font-weight: 800; color: #DC2626; line-height: 1.2;">
                          01 //
                        </td>
                        <td valign="top">
                          <h4 style="font-size: 14px; font-weight: 700; color: #111827; margin: 0 0 4px 0; text-transform: uppercase; tracking: 0.05em;">Publish a Pulse Log</h4>
                          <p style="font-size: 13px; line-height: 1.4; color: #6B7280; margin: 0;">Have a new project or some neat code insight? Share a live log with repository context on the feed!</p>
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
                        <td width="48" valign="top" style="font-family: monospace; font-size: 15px; font-weight: 800; color: #2563EB; line-height: 1.2;">
                          02 //
                        </td>
                        <td valign="top">
                          <h4 style="font-size: 14px; font-weight: 700; color: #111827; margin: 0 0 4px 0; text-transform: uppercase; tracking: 0.05em;">Broadcast a Signal</h4>
                          <p style="font-size: 13px; line-height: 1.4; color: #6B7280; margin: 0;">Share temporary builder logs or project milestones directly with the community signal feed.</p>
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
                        <td width="48" valign="top" style="font-family: monospace; font-size: 15px; font-weight: 800; color: #4B5563; line-height: 1.2;">
                          03 //
                        </td>
                        <td valign="top">
                          <h4 style="font-size: 14px; font-weight: 700; color: #111827; margin: 0 0 4px 0; text-transform: uppercase; tracking: 0.05em;">Modular Group Chats</h4>
                          <p style="font-size: 13px; line-height: 1.4; color: #6B7280; margin: 0;">Connect directly with other engineers in public groups or start your own workspace hubs.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Personal Signature note -->
              <p style="font-size: 14px; line-height: 1.6; color: #6B7280; margin: 0 0 8px 0; text-align: left; font-weight: 500; border-left: 2px solid #E5E7EB; padding-left: 12px; font-style: italic;">
                "Your engagement is what shapes this builder community. I'm excited to see the next thing you publish on the feed!"
              </p>
              <p style="font-size: 13px; font-weight: 700; color: #111827; margin: 0 0 28px 0; padding-left: 14px;">
                — Mohammed Maaz, Founder & Developer of Discuss
              </p>
            </td>
          </tr>
          <!-- Footer Divider -->
          <tr>
            <td style="padding: 0 40px;"><div style="border-top: 1px solid #E5E7EB; height: 1px;"></div></td>
          </tr>
          <!-- Footer Content -->
          <tr>
            <td align="center" style="padding: 30px 40px 40px 40px;">
              <p style="font-size: 11px; line-height: 1.6; color: #6B7280; margin: 0 0 16px 0; max-width: 440px;">
                You received this email because you are a registered member of Discuss. If you wish to disable notifications, configure your profile preferences.
              </p>
              
              <!-- Warning Note -->
              <p style="font-size: 11px; line-height: 1.6; color: #DC2626; font-weight: 700; margin: 0 0 20px 0; max-width: 440px;">
                ⚠️ WARNING: If this account was not registered by you, please immediately email us at <a href="mailto:support@discussit.in" style="color: #DC2626; text-decoration: underline; font-weight: 800;">support@discussit.in</a> to immediately block the account.
              </p>
              
              <!-- Follow Us On & Instagram Link -->
              <p style="font-size: 11px; color: #9CA3AF; margin: 0 0 10px 0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;">
                Follow us on
              </p>
              <div style="margin-bottom: 24px;">
                <a href="https://www.instagram.com/discussit.in" target="_blank" style="display: inline-block; padding: 8px 16px; background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%); border-radius: 8px; font-size: 12px; font-weight: 700; color: #FFFFFF; text-decoration: none;">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Instagram_icon.png/600px-Instagram_icon.png" width="12" height="12" alt="" style="vertical-align: middle; margin-right: 6px; border: 0; display: inline-block;" />
                  discussit.in
                </a>
              </div>
              
              <!-- Linked Portfolio Signature -->
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
}

/**
 * Shared core HTTP client helper that sends requests to the Brevo SMTP API.
 */
async function sendBrevoEmail(toEmail, displayName, subject, htmlContent, apiKey) {
  if (!apiKey) {
    console.error('[EmailService] Brevo API Key is missing.');
    return false;
  }
  if (!toEmail) {
    console.error('[EmailService] Recipient email is missing.');
    return false;
  }

  const payload = JSON.stringify({
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
    subject: subject,
    htmlContent: htmlContent
  });

  const options = {
    hostname: 'api.brevo.com',
    port: 443,
    path: '/v3/smtp/email',
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(payload)
    }
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(data);
            console.log(`[EmailService] Email successfully sent to ${toEmail}. MessageId:`, parsed.messageId);
          } catch (e) {
            console.log(`[EmailService] Email successfully sent to ${toEmail}.`);
          }
          resolve(true);
        } else {
          console.error(`[EmailService] Failed to send email via Brevo API (Status ${res.statusCode}):`, data);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.error('[EmailService] HTTPS request error sending email:', error.message);
      resolve(false);
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Generates the premium HTML email verification template.
 * @param {string} name - The user's name or username.
 * @param {string} link - The verification redirection link.
 * @returns {string} The fully compiled HTML template.
 */
function getVerificationEmailHtml(name, link) {
  const sanitizedName = name || 'Discuss Member';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - Discuss</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #F3F4F6;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #374151;
    }
    table {
      border-collapse: collapse;
    }
    a {
      text-decoration: none;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #374151;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F3F4F6; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 580px; background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
          <!-- Top Accent Line -->
          <tr>
            <td height="4" style="height: 4px; background: linear-gradient(90deg, #DC2626 0%, #2563EB 100%);"></td>
          </tr>
          <!-- Header/Logo Area -->
          <tr>
            <td align="center" style="padding: 40px 40px 20px 40px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="font-size: 28px; font-weight: 800; letter-spacing: 0.05em; color: #111827;">
                    <span style="color: #DC2626;">D</span>ISCUS<span style="color: #2563EB;">S</span>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.25em; color: #9CA3AF; font-weight: 700; padding-top: 6px;">
                    Verification Gateway
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Content Body -->
          <tr>
            <td style="padding: 20px 40px 30px 40px; text-align: center;">
              <h1 style="font-size: 24px; font-weight: 700; color: #111827; margin: 0 0 16px 0; text-align: center;">
                Verify your email address
              </h1>
              
              <p style="font-size: 15px; line-height: 1.6; color: #4B5563; margin: 0 0 28px 0; font-weight: 500;">
                Hey ${sanitizedName}, thanks for creating an account on Discuss! Please verify your email address to active your account and connect with other builders.
              </p>
              
              <!-- Verify CTA Button -->
              <div style="margin: 32px 0;">
                <a href="${link}" target="_blank" style="display: inline-block; padding: 14px 28px; background: linear-gradient(90deg, #DC2626 0%, #2563EB 100%); border-radius: 12px; font-size: 14px; font-weight: 700; color: #FFFFFF; text-decoration: none; box-shadow: 0 4px 15px rgba(220, 38, 38, 0.25);">
                  Verify Email Address
                </a>
              </div>
              
              <p style="font-size: 13px; color: #9CA3AF; margin: 28px 0 0 0; line-height: 1.5;">
                Or copy and paste this URL into your browser:<br>
                <a href="${link}" target="_blank" style="color: #2563EB; word-break: break-all; font-size: 12px; font-weight: 600;">${link}</a>
              </p>
            </td>
          </tr>
          <!-- Footer Divider -->
          <tr>
            <td style="padding: 0 40px;"><div style="border-top: 1px solid #E5E7EB; height: 1px;"></div></td>
          </tr>
          <!-- Footer Content -->
          <tr>
            <td align="center" style="padding: 30px 40px 40px 40px;">
              <p style="font-size: 11px; line-height: 1.6; color: #6B7280; margin: 0 0 16px 0; max-width: 440px;">
                You received this email because you created an account on Discuss. If you did not register, please ignore this email.
              </p>
              
              <!-- Linked Portfolio Signature -->
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
}

/**
 * Sends a welcome transactional email via Brevo's API.
 */
async function sendWelcomeEmail(toEmail, displayName, apiKey) {
  const htmlContent = getWelcomeEmailHtml(displayName);
  return sendBrevoEmail(toEmail, displayName, 'Welcome to Discuss — your developer network is ready', htmlContent, apiKey);
}

/**
 * Sends an ecosystem engagement broadcast email via Brevo's API.
 */
async function sendEngagementEmail(toEmail, displayName, subject, apiKey) {
  const htmlContent = getEngagementEmailHtml(displayName);
  return sendBrevoEmail(toEmail, displayName, subject || 'Share Your Insights on Discuss!', htmlContent, apiKey);
}

/**
 * Sends a branded verification link email via Brevo's API.
 */
async function sendVerificationEmail(toEmail, displayName, verificationLink, apiKey) {
  const htmlContent = getVerificationEmailHtml(displayName, verificationLink);
  return sendBrevoEmail(toEmail, displayName, 'Verify Your Email Address - Discuss', htmlContent, apiKey);
}

module.exports = {
  sendWelcomeEmail,
  sendEngagementEmail,
  sendVerificationEmail,
  getWelcomeEmailHtml,
  getEngagementEmailHtml,
  getVerificationEmailHtml
};
