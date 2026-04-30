/**
 * Firebase Cloud Functions — Telegram Bot Webhook for Discuss
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
 *       (paste your BotFather token when prompted)
 *
 *  4. Deploy this function:
 *       cd functions && npm install
 *       firebase deploy --only functions
 *
 *  5. Register the webhook with Telegram (run once after deploy):
 *       curl "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook?url=https://<REGION>-discuss-13fbc.cloudfunctions.net/telegramWebhook"
 *
 *  6. In BotFather, set commands:
 *       /setcommands  →  start - Start using Discuss Notifications
 *
 * ─── Security note ────────────────────────────────────────────────────────────
 * The bot token is stored as a Firebase secret (not in source code).
 * No user message content is stored in Firebase — only Chat IDs.
 */

const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');

const TELEGRAM_TOKEN = defineSecret('TELEGRAM_BOT_TOKEN');

// App URL shown in all bot messages so users can open Discuss
const APP_URL = 'https://dsscus.netlify.app/';

// ─── Telegram API helper ──────────────────────────────────────────────────────

async function sendReply(token, chatId, text, extra = {}) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const body = JSON.stringify({
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: false,
    ...extra,
  });

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

function appButton(label = '🔗 Open Discuss App') {
  return { inline_keyboard: [[{ text: label, url: APP_URL }]] };
}

// ─── Message templates ────────────────────────────────────────────────────────

const WELCOME_MESSAGE = `👋 <b>Welcome to the Discuss Notification Bot!</b>

This is the <b>official Discuss notification bot</b>. It delivers real-time alerts directly to your Telegram when something happens in your Discuss account — even when the app is closed.

<b>📲 How to connect your account:</b>
1. Open the Discuss app and go to <b>Profile</b>
2. Scroll to <b>Notifications → Telegram Notifications</b>
3. Tap <b>Connect Telegram</b>
4. Your Telegram Chat ID is: <code>YOUR_ID_HERE</code>
   (copy the number that looks like <code>123456789</code>)
5. Paste it in the Discuss app and tap <b>Save</b>

Once connected, you'll receive alerts for:
• 💬 New direct messages
• 👥 Friend requests &amp; acceptances
• 💬 Group chat messages
• ✅ Group join approvals

<i>Need help? Contact us at support@discussit.in</i>`;

const HELP_MESSAGE = `ℹ️ <b>Discuss Notification Bot — Help</b>

This is the <b>official notification bot</b> for the Discuss app. It only sends you notifications — it does not read or process any messages you send here.

<b>Available command:</b>
• /start — Show setup instructions

<b>To get your Chat ID:</b>
Your unique Telegram Chat ID is displayed when you run /start. It's the number shown in the setup instructions. Copy it and paste it in Profile → Telegram Notifications inside the Discuss app.

<b>To disconnect notifications:</b>
Go to Profile → Telegram Notifications in the Discuss app and tap <b>Disconnect</b>.

<i>Questions? Email support@discussit.in</i>`;

const UNKNOWN_COMMAND_MESSAGE = `ℹ️ This is the <b>official Discuss notification bot</b>.

It only delivers notifications from your Discuss account. It does not support other commands.

Use /start to see setup instructions, or open the Discuss app to manage your notification settings.`;

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
    const update = req.body;

    // Only handle regular messages (not edited, channel posts, etc.)
    if (!update || !update.message) {
      res.status(200).send('ok');
      return;
    }

    const msg    = update.message;
    const chatId = msg.chat?.id;
    const text   = (msg.text || '').trim();
    const userId = msg.from?.id;

    if (!chatId) {
      res.status(200).send('ok');
      return;
    }

    // Inject the user's actual chat ID into the welcome message
    const welcomeWithId = WELCOME_MESSAGE.replace(
      'YOUR_ID_HERE',
      String(chatId)
    );

    // ── Command routing ──
    if (text === '/start' || text.startsWith('/start ')) {
      await sendReply(
        token,
        chatId,
        welcomeWithId,
        { reply_markup: appButton('📲 Open Discuss App') }
      );
    } else if (text === '/help' || text.startsWith('/help ')) {
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
