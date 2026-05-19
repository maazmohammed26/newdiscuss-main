/**
 * Firebase Cloud Functions — Telegram Bot Webhook for Discuss
 *
 * Bot: @DiscussNotifications_bot
 *
 * This function receives Telegram webhook updates and handles bot commands.
 * Only /start is a functional command. All other commands (/help, etc.) and
 * any unknown text receive an informational reply.
 *
 * ─── Deployment steps (one-time) ─────────────────────────────────────────────
 *
 *  1. Install Firebase CLI:
 *       npm install -g firebase-tools
 *
 *  2. Log in and select your project:
 *       firebase login
 *       firebase use discuss-13fbc
 *
 *  3. Set the bot token as a Firebase secret:
 *       firebase functions:secrets:set TELEGRAM_BOT_TOKEN
 *       (paste the bot token when prompted)
 *
 *  4. Deploy this function:
 *       cd functions && npm install
 *       firebase deploy --only functions
 *
 *  5. Register the webhook with Telegram (run once after deploy,
 *     replacing <TOKEN> with your bot token):
 *       curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://us-central1-discuss-13fbc.cloudfunctions.net/telegramWebhook"
 *
 *  6. In BotFather, set bot commands:
 *       /setcommands → choose @DiscussNotifications_bot
 *       start - Connect your Discuss account
 *
 * ─── Security note ────────────────────────────────────────────────────────────
 * The bot token is stored as a Firebase secret (not in source code).
 * No user message content is stored in Firebase — only Chat IDs.
 */

'use strict';

const admin = require('firebase-admin');
admin.initializeApp();

const functions = require('firebase-functions');
const { onRequest } = require('firebase-functions/v2/https');
const { sendWelcomeEmail, sendEngagementEmail } = require('./emailService');


const TELEGRAM_TOKEN = defineSecret('TELEGRAM_BOT_TOKEN');

// App URL shown in all bot messages so users can open Discuss
const APP_URL = 'https://discussit.in/';

// ─── Telegram API helper ──────────────────────────────────────────────────────

async function sendReply(token, chatId, text, extra = {}) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const body = JSON.stringify({
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...extra,
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    const data = await response.json();
    if (!data.ok) {
      console.error('[TelegramBot] sendMessage failed:', JSON.stringify(data));
    } else {
      console.log(`[TelegramBot] Message sent to chatId=${chatId}`);
    }
    return data.ok === true;
  } catch (err) {
    console.error('[TelegramBot] Network error in sendReply:', err.message);
    return false;
  }
}

function appButton(label = '🔗 Open Discuss App') {
  return { inline_keyboard: [[{ text: label, url: APP_URL }]] };
}

// ─── Message templates ────────────────────────────────────────────────────────

const WELCOME_MESSAGE = `👋 <b>Welcome to @DiscussNotifications_bot!</b>

This is the <b>official Discuss notifications bot</b>. It sends real-time alerts directly to your Telegram whenever something happens in your Discuss account — even when the app is closed.

<b>📲 Your Telegram Chat ID is:</b>
<code>YOUR_ID_HERE</code>
Copy this number — you will need it in the next step.

<b>How to connect your account:</b>
1. Open the Discuss app (tap the button below or visit discussit.in)
2. Tap your <b>Profile</b>
3. Scroll down to <b>Notifications → Telegram Notifications</b>
4. Paste your Chat ID (<code>YOUR_ID_HERE</code>) in the field
5. Tap <b>Save</b> ✅

Once connected, you will receive alerts for:
• 💬 New direct messages
• 👥 Friend requests &amp; acceptances
• 💬 Group chat messages
• ✅ Group join approvals

Each alert includes a button that opens the Discuss app directly.

<i>Need help? Email support@discussit.in</i>`;

const HELP_MESSAGE = `ℹ️ <b>@DiscussNotifications_bot — Help</b>

This is the <b>official notifications-only bot</b> for the Discuss app. It only delivers alerts from your Discuss account — it does not read, store, or respond to any messages you send here.

<b>Available command:</b>
• /start — Show your Chat ID and setup instructions

<b>How to connect:</b>
Send /start to get your personal Chat ID, then paste it in the Discuss app under Profile → Notifications → Telegram Notifications.

<b>To disconnect notifications:</b>
Open the Discuss app → Profile → Telegram Notifications → tap <b>Disconnect</b>.

<i>Questions? Email support@discussit.in</i>`;

const UNKNOWN_COMMAND_MESSAGE = `ℹ️ This is <b>@DiscussNotifications_bot</b> — the official Discuss notifications bot.

It only delivers notifications from your Discuss account and does not support other commands or conversations.

Send /start to get your Chat ID and connection instructions, or open the Discuss app to manage your settings.`;

// ─── Cloud Function ───────────────────────────────────────────────────────────

exports.telegramWebhook = onRequest(
  { secrets: [TELEGRAM_TOKEN] },
  async (req, res) => {
    // Telegram only sends POST requests
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const token = TELEGRAM_TOKEN.value();
    if (!token) {
      console.error('[TelegramBot] TELEGRAM_BOT_TOKEN secret is not set.');
      res.status(500).send('Internal Server Error');
      return;
    }

    const update = req.body;
    console.log('[TelegramBot] Received update:', JSON.stringify(update));

    // Only handle regular messages (not edited, channel posts, etc.)
    if (!update || !update.message) {
      res.status(200).send('ok');
      return;
    }

    const msg    = update.message;
    const chatId = msg.chat?.id;
    const text   = (msg.text || '').trim();

    console.log(`[TelegramBot] Message from chatId=${chatId}, text="${text}"`);

    if (!chatId) {
      res.status(200).send('ok');
      return;
    }

    // Inject the user's actual chat ID into the welcome message
    const welcomeWithId = WELCOME_MESSAGE.replaceAll('YOUR_ID_HERE', String(chatId));

    // ── Command routing ──
    if (text === '/start' || text.startsWith('/start ')) {
      console.log(`[TelegramBot] Handling /start for chatId=${chatId}`);
      await sendReply(
        token,
        chatId,
        welcomeWithId,
        { reply_markup: appButton('📲 Open Discuss App') }
      );
    } else if (text === '/help' || text.startsWith('/help ')) {
      console.log(`[TelegramBot] Handling /help for chatId=${chatId}`);
      await sendReply(
        token,
        chatId,
        HELP_MESSAGE,
        { reply_markup: appButton('📲 Open Discuss App') }
      );
    } else if (text.startsWith('/')) {
      // Any other slash command
      await sendReply(token, chatId, UNKNOWN_COMMAND_MESSAGE);
    } else if (text) {
      // Plain text — remind the user this is a notifications-only bot
      await sendReply(token, chatId, UNKNOWN_COMMAND_MESSAGE);
    }

    res.status(200).send('ok');
  }
);

// ─── Welcome Email Auth Trigger ────────────────────────────────────────────────
exports.sendWelcomeEmailOnSignUp = functions
  .auth.user()
  .onCreate(async (user) => {
    const email = user.email;
    if (!email) {
      console.log('[AuthTrigger] User has no email. Skipping welcome email.');
      return;
    }

    let displayName = user.displayName;

    // If displayName is not present directly, fetch the username from RTDB /users/{uid}
    if (!displayName && user.uid) {
      try {
        const dbRef = admin.database().ref(`users/${user.uid}`);
        const snapshot = await dbRef.once('value');
        if (snapshot.exists()) {
          const userData = snapshot.val();
          displayName = userData.username;
        }
      } catch (err) {
        console.warn(`[AuthTrigger] Error fetching username from RTDB for ${user.uid}:`, err.message);
      }
    }

    // Fallback: use local part of email address
    if (!displayName) {
      displayName = email.split('@')[0] || 'Discuss Member';
    }

    const apiKey = process.env.BREVO_API_KEY;
    console.log(`[AuthTrigger] Welcome email trigger initiated for ${user.uid} (${email}) with name: "${displayName}"`);
    
    await sendWelcomeEmail(email, displayName, apiKey);
  });

// ─── Broadcast Email Database Trigger ──────────────────────────────────────────
exports.onAdminBroadcastTrigger = functions.database
  .ref('/adminBroadcastTrigger')
  .onWrite(async (change, context) => {
    const data = change.after.val();
    
    // Only run if trigger is set to true
    if (!data || data.trigger !== true) {
      return null;
    }
    
    const subject = data.subject || 'Share Your Insights on Discuss!';
    const apiKey = process.env.BREVO_API_KEY;
    
    if (!apiKey) {
      console.error('[BroadcastTrigger] BREVO_API_KEY environment variable is not defined.');
      return change.after.ref.update({
        trigger: false,
        status: 'error',
        error: 'API key is missing'
      });
    }

    console.log('[BroadcastTrigger] Trigger detected! Resetting state to prevent double execution...');
    
    // 1. Immediately reset trigger to false and set status to processing to lock the function
    await change.after.ref.update({
      trigger: false,
      status: 'processing',
      error: null
    });

    try {
      console.log('[BroadcastTrigger] Fetching user profiles from /users...');
      const usersRef = admin.database().ref('users');
      const usersSnapshot = await usersRef.once('value');
      
      if (!usersSnapshot.exists()) {
        console.log('[BroadcastTrigger] No users found in database. Aborting.');
        return change.after.ref.update({
          status: 'error',
          error: 'No users found in database'
        });
      }

      const usersObj = usersSnapshot.val();
      const recipients = [];

      for (const uid in usersObj) {
        const userProfile = usersObj[uid];
        if (userProfile && userProfile.email) {
          recipients.push({
            email: userProfile.email.toLowerCase().trim(),
            displayName: userProfile.username || 'Discuss Member'
          });
        }
      }

      console.log(`[BroadcastTrigger] Found ${recipients.length} recipients to email. Initiating batch processing...`);

      // 2. Batch processing (20 emails at a time with a delay to prevent overloading)
      const BATCH_SIZE = 20;
      let successCount = 0;
      let failureCount = 0;

      for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
        const batch = recipients.slice(i, i + BATCH_SIZE);
        console.log(`[BroadcastTrigger] Sending batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} emails)...`);

        const promises = batch.map(async (recipient) => {
          try {
            const success = await sendEngagementEmail(recipient.email, recipient.displayName, subject, apiKey);
            if (success) successCount++;
            else failureCount++;
          } catch (err) {
            console.error(`[BroadcastTrigger] Error sending to ${recipient.email}:`, err.message);
            failureCount++;
          }
        });

        await Promise.all(promises);

        // Brief delay between batches (e.g. 500ms) to respect rate limits
        if (i + BATCH_SIZE < recipients.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      console.log(`[BroadcastTrigger] Broadcast complete! Success: ${successCount}, Failures: ${failureCount}`);

      // 3. Update database status to completed with results
      return change.after.ref.update({
        status: 'completed',
        lastRun: new Date().toISOString(),
        results: {
          totalRecipients: recipients.length,
          successCount,
          failureCount
        }
      });

    } catch (err) {
      console.error('[BroadcastTrigger] Critical error during broadcast execution:', err.message);
      return change.after.ref.update({
        status: 'error',
        error: err.message
      });
    }
  });

