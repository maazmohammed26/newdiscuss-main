const sentWelcomeEmails = new Set();

function escapeEmailHtml(value) {
  return String(value || 'Discuss Member')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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

  const safeUsername = escapeEmailHtml(username);

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Discuss</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F6F7F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #374151;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F6F7F9; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 600px; background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 60px rgba(15,23,42,0.08);">
          <tr><td height="4" style="height: 4px; background: linear-gradient(90deg, #DC2626 0%, #2563EB 100%);"></td></tr>
          <tr>
            <td align="center" style="padding: 40px 40px 20px 40px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr><td align="center" aria-label="Discuss" style="font-size: 34px; font-weight: 700; letter-spacing: -0.04em; color: #111827; font-family: 'Brush Script MT', 'Segoe Script', cursive;"><span style="color: #EF4444; font-family: Arial, sans-serif; font-weight: 900;">&lt;</span><span style="color: #111827;">Discuss</span><span style="color: #0095F6; font-family: Arial, sans-serif; font-weight: 900;">/&gt;</span></td></tr>
                <tr><td align="center" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: #9CA3AF; font-weight: 700; padding-top: 6px;">A focused network for developers</td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px 30px 40px;">
              <h1 style="font-size: 30px; line-height: 1.2; letter-spacing: -0.04em; font-weight: 800; color: #111827; margin: 0 0 14px 0; text-align: center;">Welcome to Discuss, ${safeUsername}.</h1>
              <p style="font-size: 15px; line-height: 1.6; color: #4B5563; margin: 0 0 28px 0; text-align: center; font-weight: 500;">
                Your developer profile is ready. Share ideas, publish what you are building, discover the right people, and join conversations that help you move forward.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 30px 0;"><tr><td align="center"><a href="https://discussit.in/feed" style="display: inline-block; background-color: #0095F6; color: #FFFFFF; font-size: 14px; line-height: 18px; font-weight: 800; padding: 14px 24px; border-radius: 12px; text-decoration: none; box-shadow: 0 8px 24px rgba(0,149,246,0.24);">Open your Discuss feed&nbsp;&nbsp;→</a></td></tr></table>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px; background-color: #F9FAFB; border-radius: 12px; border: 1px solid #E5E7EB; margin-bottom: 12px; display: block;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="48" valign="top" style="font-family: monospace; font-size: 15px; font-weight: 800; color: #DC2626; line-height: 1.2;">01 //</td>
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
                        <td width="48" valign="top" style="font-family: monospace; font-size: 15px; font-weight: 800; color: #2563EB; line-height: 1.2;">02 //</td>
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
                        <td width="48" valign="top" style="font-family: monospace; font-size: 15px; font-weight: 800; color: #4B5563; line-height: 1.2;">03 //</td>
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
          <tr><td style="padding: 0 40px;"><div style="border-top: 1px solid #E5E7EB; height: 1px;"></div></td></tr>
          <tr>
            <td align="center" style="padding: 30px 40px 40px 40px;">
              <p style="font-size: 11px; line-height: 1.6; color: #6B7280; margin: 0 0 16px 0; max-width: 440px;">
                You received this email because you created an account on Discuss. If you did not register, please ignore this email.
              </p>
              <p style="font-size: 11px; line-height: 1.6; color: #DC2626; font-weight: 700; margin: 0 0 20px 0; max-width: 440px;">
                Security notice: If this account was not registered by you, email <a href="mailto:support@discussit.in" style="color: #DC2626; text-decoration: underline; font-weight: 800;">support@discussit.in</a> so the account can be reviewed.
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
        subject: 'Welcome to Discuss — your developer network is ready',
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

/**
 * Send 6-digit Verification OTP Email Directly via Frontend using Brevo API
 */
export async function sendVerificationOTPDirectly(toEmail, username, otp) {
  const normalizedEmail = toEmail?.toLowerCase().trim();
  if (!normalizedEmail || !otp) return;

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
  <title>Verify Your Account</title>
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
                <tr><td align="center" aria-label="Discuss" style="font-size: 34px; font-weight: 700; letter-spacing: -0.04em; color: #111827; font-family: 'Brush Script MT', 'Segoe Script', cursive;"><span style="color: #EF4444; font-family: Arial, sans-serif; font-weight: 900;">&lt;</span><span style="color: #111827;">Discuss</span><span style="color: #0095F6; font-family: Arial, sans-serif; font-weight: 900;">/&gt;</span></td></tr>
                <tr><td align="center" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: #9CA3AF; font-weight: 700; padding-top: 6px;">Secure email verification</td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px 30px 40px; text-align: center;">
              <h1 style="font-size: 22px; font-weight: 700; color: #111827; margin: 0 0 16px 0;">Verify your email address</h1>
              <p style="font-size: 15px; line-height: 1.6; color: #4B5563; margin: 0 0 28px 0; font-weight: 500;">
                Hello ${username || 'Discuss Member'}, thank you for registering with Discuss. Use the security verification code below to activate your account. This code is valid for exactly 5 minutes.
              </p>
              
              <!-- OTP Display Area -->
              <div style="margin: 32px 0;">
                <span style="font-size: 38px; letter-spacing: 8px; font-weight: 800; font-family: monospace; color: #111827; background-color: #F9FAFB; padding: 16px 28px; border-radius: 12px; border: 1px solid #E5E7EB; display: inline-block; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">${otp}</span>
              </div>
              
              <!-- Warning Banner -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 24px; background-color: #FEF2F2; border: 1px solid #FEE2E2; border-radius: 12px; padding: 16px; text-align: left;">
                <tr>
                  <td>
                    <p style="font-size: 12px; line-height: 1.6; color: #991B1B; font-weight: 700; margin: 0;">
                      SECURITY WARNING: Do not share this verification code with anyone. Discuss support staff will never ask for your verification code. If you did not request this code, please immediately contact support@discussit.in to secure your account.
                    </p>
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
        subject: `${otp} is your Discuss verification code`,
        htmlContent: htmlContent
      })
    });
    if (response.ok) {
      console.log(`[EmailService] Verification OTP email successfully triggered to ${toEmail}`);
      return true;
    } else {
      const data = await response.text();
      console.error('[EmailService] Failed to trigger OTP email directly:', data);
      return false;
    }
  } catch (err) {
    console.error('[EmailService] Network error triggering OTP email directly:', err.message);
    return false;
  }
}
