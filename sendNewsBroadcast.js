'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment variables manually from our frontend/.env file
const envPath = path.join(__dirname, 'frontend', '.env');
let apiKey = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/REACT_APP_BREVO_API_KEY\s*=\s*(.*)/);
  if (match && match[1]) {
    apiKey = match[1].trim().replace(/['"]/g, '');
  }
}

// ─── Core HTTP Client Helper for Brevo SMTP API ────────────────────────────────
function sendBrevoEmail(toEmail, displayName, subject, htmlContent) {
  if (!apiKey) {
    console.error('❌ Error: Brevo API Key is missing. Check your frontend/.env file.');
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

// ─── Tech-Style HTML Email Template Generator ──────────────────────────────────
function getLaunchEmailHtml(name) {
  const displayName = name || 'Discuss Member';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Major Launch: Tech News, Jobs, and DevRadar are Live on Discuss!</title>
  <style>
    body { margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155; }
    table { border-collapse: collapse; }
    a { text-decoration: none; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F8FAFC; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 580px; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 40px rgba(15,23,42,0.035);">
          
          <!-- Sleek Tech Gradient Accent Header -->
          <tr><td height="5" style="height: 5px; background: linear-gradient(90deg, #EF4444 0%, #2563EB 100%);"></td></tr>
          
          <!-- Header Logo / Brand -->
          <tr>
            <td align="center" style="padding: 44px 40px 24px 40px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr><td align="center" style="font-family: monospace; font-size: 32px; font-weight: 900; letter-spacing: -0.04em; color: #0F172A;"><span style="color: #EF4444;">&lt;</span>DISCUSS<span style="color: #2563EB;">/&gt;</span></td></tr>
                <tr><td align="center" style="font-family: monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.35em; color: #94A3B8; font-weight: 700; padding-top: 8px;">Developer Community Hub</td></tr>
              </table>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 10px 40px 30px 40px;">
              
              <!-- Warm Greeting -->
              <h1 style="font-family: monospace; font-size: 22px; font-weight: 800; color: #0F172A; margin: 0 0 20px 0; text-align: center; text-transform: uppercase; letter-spacing: -0.01em;">[UPDATES] Major Launch is Live</h1>
              
              <p style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 16px 0; font-weight: 500;">Hey ${displayName},</p>
              <p style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 16px 0; font-weight: 500;">This is <strong>Maaz, Founder & Developer of Discuss</strong>. I have some extremely exciting updates to share with you! We have been actively expanding our high-signal developer ecosystem into something much more robust.</p>
              <p style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 28px 0; font-weight: 500;">I am super thrilled to announce that three major new features are now officially live for all users: the <strong>Tech News Feed</strong>, the <strong>Tech Jobs Board</strong>, and the <strong>Real-Time DevRadar Map</strong>!</p>
              
              <!-- Premium Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 28px;">
                <tr><td height="1" style="height: 1px; background-color: #F1F5F9;"></td></tr>
              </table>

              <!-- Feature Showcase Cards -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 28px;">
                
                <!-- Feature 1: Tech News -->
                <tr>
                  <td style="padding: 20px; background-color: #FAFBFB; border-radius: 16px; border: 1px solid #E2E8F0; border-left: 4px solid #EF4444; display: block;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td valign="top">
                          <div style="font-family: monospace; font-size: 11px; font-weight: 800; color: #EF4444; margin-bottom: 6px; letter-spacing: 0.1em; text-transform: uppercase;">// 01 // News Feed</div>
                          <h4 style="font-size: 15px; font-weight: 700; color: #0F172A; margin: 0 0 6px 0;">Vibrant Tech News Feed</h4>
                          <p style="font-size: 13.5px; line-height: 1.5; color: #475569; margin: 0 0 12px 0;">Stay ahead of the curve with hot developer updates curated by the Discuss Team. Read complete announcements in full screen on our dedicated standalone reading pages!</p>
                          <a href="https://discussit.in/news" style="font-family: monospace; font-size: 12.5px; font-weight: 700; color: #EF4444; text-decoration: underline;">discussit.in/news →</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td height="16" style="height: 16px;"></td></tr>
                
                <!-- Feature 2: Tech Jobs -->
                <tr>
                  <td style="padding: 20px; background-color: #FAFBFB; border-radius: 16px; border: 1px solid #E2E8F0; border-left: 4px solid #2563EB; display: block;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td valign="top">
                          <div style="font-family: monospace; font-size: 11px; font-weight: 800; color: #2563EB; margin-bottom: 6px; letter-spacing: 0.1em; text-transform: uppercase;">// 02 // Jobs Board</div>
                          <h4 style="font-size: 15px; font-weight: 700; color: #0F172A; margin: 0 0 6px 0;">Curated Career Board</h4>
                          <p style="font-size: 13.5px; line-height: 1.5; color: #475569; margin: 0 0 12px 0;">Discover top tech career moves, internships, remote listings, and entry-level options for freshers—all directly managed by the Discuss Team.</p>
                          <a href="https://discussit.in/jobs" style="font-family: monospace; font-size: 12.5px; font-weight: 700; color: #2563EB; text-decoration: underline;">discussit.in/jobs →</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td height="16" style="height: 16px;"></td></tr>

                <!-- Feature 3: DevRadar Map -->
                <tr>
                  <td style="padding: 20px; background-color: #FAFBFB; border-radius: 16px; border: 1px solid #E2E8F0; border-left: 4px solid #D97706; display: block;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td valign="top">
                          <div style="font-family: monospace; font-size: 11px; font-weight: 800; color: #D97706; margin-bottom: 6px; letter-spacing: 0.1em; text-transform: uppercase;">// 03 // DevRadar Map</div>
                          <h4 style="font-size: 15px; font-weight: 700; color: #0F172A; margin: 0 0 6px 0;">Real-Time DevRadar Connection</h4>
                          <p style="font-size: 13.5px; line-height: 1.5; color: #475569; margin: 0 0 12px 0;">Locate and connect with fellow developers near you in real time! Share your rough location securely, customize your interactive map card (synced automatically with your bios and verification badge), and see other developers around you.</p>
                          <a href="https://discussit.in/devradar" style="font-family: monospace; font-size: 12.5px; font-weight: 700; color: #D97706; text-decoration: underline;">discussit.in/devradar →</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td height="16" style="height: 16px;"></td></tr>

                <!-- Feature 4: Sharing & Caching -->
                <tr>
                  <td style="padding: 20px; background-color: #FAFBFB; border-radius: 16px; border: 1px solid #E2E8F0; border-left: 4px solid #64748B; display: block;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td valign="top">
                          <div style="font-family: monospace; font-size: 11px; font-weight: 800; color: #64748B; margin-bottom: 6px; letter-spacing: 0.1em; text-transform: uppercase;">// 04 // UX Features</div>
                          <h4 style="font-size: 15px; font-weight: 700; color: #0F172A; margin: 0 0 6px 0;">Instant Sharing & Speed Optimization</h4>
                          <p style="font-size: 13.5px; line-height: 1.5; color: #475569; margin: 0;">Share listings directly via our glowing social share panel (supporting WhatsApp, Telegram, X, Email) and enjoy 0ms instant cached listing loads with background syncing loaders.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Warning / Early Stage Note -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 28px;">
                <tr>
                  <td style="padding: 16px; background-color: #FFF7ED; border-left: 4px solid #F97316; border-radius: 4px 14px 14px 4px;">
                    <p style="font-size: 12.5px; line-height: 1.6; color: #7C2D12; font-weight: 600; margin: 0;">
                      WARNING / NOTE: The application is currently in an active, early-stage development phase. In addition, the Discuss Team is directly handling all news and job postings for now. You might experience brief performance or loading delays while we roll out optimizations. Thank you for your support as we build this out together!
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Signature -->
              <p style="font-size: 14px; line-height: 1.65; color: #64748B; margin: 0 0 4px 0; text-align: left; border-left: 2px solid #E2E8F0; padding-left: 12px; font-style: italic;">
                "We are building the ultimate high-signal home for developers. I would love to hear your feedback on these new upgrades!"
              </p>
              <p style="font-size: 13px; font-weight: 700; color: #0F172A; margin: 0 0 28px 0; padding-left: 14px;">— Mohammed Maaz, Founder & Developer of Discuss</p>
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="padding: 0 40px;"><div style="border-top: 1px solid #F1F5F9; height: 1px;"></div></td></tr>

          <!-- Footer & Feedback -->
          <tr>
            <td align="center" style="padding: 36px 40px 44px 40px; background-color: #FAFBFB;">
              <p style="font-family: monospace; font-size: 12px; font-weight: 800; color: #0F172A; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.1em;">[FEEDBACK] We Want Your Inputs!</p>
              <p style="font-size: 13px; line-height: 1.65; color: #475569; margin: 0 0 24px 0;">
                If you have suggestions, questions, or just want to tell us what you think:
                <br />
                📧 Email us at <a href="mailto:support@discussit.in" style="color: #2563EB; font-weight: 700; text-decoration: underline;">support@discussit.in</a>
                <br />
                📸 Connect with us on Instagram <a href="https://instagram.com/discussit.in" target="_blank" style="color: #EF4444; font-weight: 700; text-decoration: underline;">@discussit.in</a>
              </p>
              
              <p style="font-size: 11px; line-height: 1.5; color: #94A3B8; max-width: 440px;">You are receiving this email because you are a registered member of Discuss. To configure your email preferences, visit your Profile settings.</p>
              <p style="font-size: 11px; line-height: 1.5; color: #EF4444; font-weight: 700; margin: 12px 0 0 0; max-width: 440px;">
                ⚠️ Account Safety: If you did not register this account, please immediately contact us at support@discussit.in to request suspension.
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

  console.log(`🚀 Starting Discuss Launch Broadcaster...`);
  console.log(`📊 Total registered users found: ${recipients.length}`);
  
  if (recipients.length === 0) {
    console.log('⚠️ No users with valid emails found.');
    process.exit(0);
  }

  // Double check if a single test is wanted first
  const testEmailArg = process.argv[2];
  if (testEmailArg && testEmailArg.includes('@')) {
    console.log(`\n🧪 RUNNING TEST MODE to: ${testEmailArg}`);
    const testHtml = getLaunchEmailHtml('Test Member');
    const success = await sendBrevoEmail(testEmailArg, 'Test Member', 'Major Launch: Tech News, Jobs, and DevRadar are Live on Discuss!', testHtml);
    if (success) {
      console.log('✅ Test email successfully broadcasted! Check your inbox.');
    } else {
      console.log('❌ Test email broadcast failed.');
    }
    process.exit(0);
  }

  console.log(`\n📢 Broadcasting Campaign: Major Launch: Tech News, Jobs, and DevRadar are Live on Discuss!`);
  const subject = 'Major Launch: Tech News, Jobs, and DevRadar are Live on Discuss!';
  const BATCH_SIZE = 20;
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    console.log(`\n📦 Sending Batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(recipients.length / BATCH_SIZE)} (${batch.length} recipients)...`);

    const promises = batch.map(async (recipient) => {
      const htmlContent = getLaunchEmailHtml(recipient.displayName);
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
