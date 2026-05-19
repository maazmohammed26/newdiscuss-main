'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment variables manually from our functions/.env file
const envPath = path.join(__dirname, 'functions', '.env');
let apiKey = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/BREVO_API_KEY\s*=\s*(.*)/);
  if (match && match[1]) {
    apiKey = match[1].trim().replace(/['"]/g, '');
  }
}

// ─── Shared Core HTTP Client helper for Brevo SMTP API ────────────────────────
function sendBrevoEmail(toEmail, displayName, subject, htmlContent) {
  if (!apiKey) {
    console.error('❌ Error: Brevo API Key is missing. Check your functions/.env file.');
    return Promise.resolve(false);
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
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`✅ Sent successfully to: ${toEmail}`);
          resolve(true);
        } else {
          console.error(`❌ Failed for ${toEmail} (Status ${res.statusCode}):`, data);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.error(`❌ Network error sending to ${toEmail}:`, error.message);
      resolve(false);
    });

    req.write(payload);
    req.end();
  });
}

// ─── Engagement HTML Template Generator ──────────────────────────────────────
function getEngagementEmailHtml(name) {
  const displayName = name || 'Discuss Member';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connect, Build, and Interact on Discuss</title>
  <style>
    body { margin: 0; padding: 0; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #374151; }
    table { border-collapse: collapse; }
    a { text-decoration: none; }
  </style>
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
                <tr><td align="center" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.25em; color: #9CA3AF; font-weight: 700; padding-top: 6px;">Ecosystem Engagement</td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px 30px 40px;">
              <h1 style="font-size: 22px; font-weight: 800; color: #111827; margin: 0 0 16px 0; text-align: center; tracking: -0.02em;">Share Your Insights on Discuss!</h1>
              <p style="font-size: 15px; line-height: 1.6; color: #4B5563; margin: 0 0 24px 0; text-align: left; font-weight: 500;">Hey ${displayName},</p>
              <p style="font-size: 15px; line-height: 1.6; color: #4B5563; margin: 0 0 24px 0; text-align: left; font-weight: 500;">Discuss is growing! We built this high-signal space to give developers like you the absolute best environment to share code, ask technical questions, and collaborate with zero noise.</p>
              <p style="font-size: 15px; line-height: 1.6; color: #4B5563; margin: 0 0 28px 0; text-align: left; font-weight: 500;">The platform is alive with active technical exchanges—here's how you can make the most of your membership today:</p>
              
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 28px;">
                <tr>
                  <td style="padding: 16px; background-color: #F9FAFB; border-radius: 12px; border: 1px solid #E5E7EB; margin-bottom: 12px; display: block;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="48" valign="top" style="font-family: monospace; font-size: 15px; font-weight: 800; color: #DC2626; line-height: 1.2;">01 //</td>
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
                        <td width="48" valign="top" style="font-family: monospace; font-size: 15px; font-weight: 800; color: #2563EB; line-height: 1.2;">02 //</td>
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
                        <td width="48" valign="top" style="font-family: monospace; font-size: 15px; font-weight: 800; color: #4B5563; line-height: 1.2;">03 //</td>
                        <td valign="top">
                          <h4 style="font-size: 14px; font-weight: 700; color: #111827; margin: 0 0 4px 0; text-transform: uppercase; tracking: 0.05em;">Modular Group Chats</h4>
                          <p style="font-size: 13px; line-height: 1.4; color: #6B7280; margin: 0;">Connect directly with other engineers in public groups or start your own workspace hubs.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="font-size: 14px; line-height: 1.6; color: #6B7280; margin: 0 0 8px 0; text-align: left; font-weight: 500; border-left: 2px solid #E5E7EB; padding-left: 12px; font-style: italic;">
                "Your engagement is what shapes this builder community. I'm excited to see the next thing you publish on the feed!"
              </p>
              <p style="font-size: 13px; font-weight: 700; color: #111827; margin: 0 0 28px 0; padding-left: 14px;">— Mohammed Maaz, Founder & Developer of Discuss</p>
            </td>
          </tr>
          <tr><td style="padding: 0 40px;"><div style="border-top: 1px solid #E5E7EB; height: 1px;"></div></td></tr>
          <tr>
            <td align="center" style="padding: 30px 40px 40px 40px;">
              <p style="font-size: 11px; line-height: 1.6; color: #6B7280; margin: 0 0 16px 0; max-width: 440px;">You received this email because you are a registered member of Discuss. If you wish to disable notifications, configure your profile preferences.</p>
              <p style="font-size: 11px; line-height: 1.6; color: #DC2626; font-weight: 700; margin: 0 0 20px 0; max-width: 440px;">
                ⚠️ WARNING: If this account was not registered by you, please immediately email us at <a href="mailto:support@discussit.in" style="color: #DC2626; text-decoration: underline; font-weight: 800;">support@discussit.in</a> to immediately block the account.
              </p>
              <p style="font-size: 12px; font-weight: 700; color: #4B5563; margin: 0;">Developed by <a href="https://www.maazportfolio.site/" target="_blank" style="color: #4B5563; text-decoration: none; font-weight: 800; background: linear-gradient(120deg, #DC2626 0%, #2563EB 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">&lt;mma/&gt;</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Main Script Logic ────────────────────────────────────────────────────────
async function main() {
  const usersJsonPath = path.join(__dirname, 'users.json');

  if (!fs.existsSync(usersJsonPath)) {
    console.error('❌ Error: users.json not found in the project root directory!');
    console.log('\n💡 To get your users list:');
    console.log('1. Go to your Firebase Console -> Realtime Database.');
    console.log('2. Click on the 3 dots next to "users" node and click "Export JSON".');
    console.log('3. Rename the downloaded file to "users.json" and place it in this folder.');
    process.exit(1);
  }

  let usersData;
  try {
    const raw = fs.readFileSync(usersJsonPath, 'utf8');
    usersData = JSON.parse(raw);
  } catch (err) {
    console.error('❌ Error parsing users.json:', err.message);
    process.exit(1);
  }

  const recipients = [];
  for (const uid in usersData) {
    const u = usersData[uid];
    if (u && u.email) {
      recipients.push({
        email: u.email.toLowerCase().trim(),
        displayName: u.username || 'Discuss Member'
      });
    }
  }

  console.log(`🚀 Starting Local Broadcaster...`);
  console.log(`📊 Total registered users found: ${recipients.length}`);
  
  if (recipients.length === 0) {
    console.log('⚠️ No users with valid emails found.');
    process.exit(0);
  }

  const subject = 'Share Your Insights on Discuss!';
  const BATCH_SIZE = 20;
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    console.log(`\n📦 Sending Batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(recipients.length / BATCH_SIZE)} (${batch.length} recipients)...`);

    const promises = batch.map(async (recipient) => {
      const htmlContent = getEngagementEmailHtml(recipient.displayName);
      const success = await sendBrevoEmail(recipient.email, recipient.displayName, subject, htmlContent);
      if (success) successCount++;
      else failureCount++;
    });

    await Promise.all(promises);

    // Brief delay to prevent SMTP server overload
    if (i + BATCH_SIZE < recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
  }

  console.log(`\n🎉 BROADCAST COMPLETE!`);
  console.log(`======================`);
  console.log(`✅ Successes: ${successCount}`);
  console.log(`❌ Failures:  ${failureCount}`);
  console.log(`📁 Total:     ${recipients.length}`);
}

main();
