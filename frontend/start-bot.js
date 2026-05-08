require('dotenv').config({ path: '.env' });
const fs = require('fs');

const BOT_TOKEN = process.env.REACT_APP_TELEGRAM_BOT_TOKEN;
const APP_URL = 'https://discussit.in/';

if (!BOT_TOKEN) {
  console.error('❌ Error: REACT_APP_TELEGRAM_BOT_TOKEN is missing in .env');
  process.exit(1);
}

console.log('🤖 Starting Local Telegram Bot...');

let lastUpdateId = 0;

async function sendReply(chatId, text, extra = {}) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...extra,
      }),
    });
    if (!response.ok) {
      console.error(`Failed to send message to ${chatId}`);
    }
  } catch (err) {
    console.error('Network error:', err.message);
  }
}

function appButton(label = '🔗 Open Discuss App') {
  return { inline_keyboard: [[{ text: label, url: APP_URL }]] };
}

const WELCOME_MESSAGE = `👋 <b>Welcome to the Discuss Notifications Bot!</b>

This bot will send you real-time alerts directly from your Discuss account.

<b>📲 Your Telegram Chat ID is:</b>
<code>YOUR_ID_HERE</code>

<b>How to connect your account:</b>
1. Open the Discuss app and go to your <b>Profile</b>.
2. Scroll down to <b>Telegram Notifications</b>.
3. Paste your Chat ID (<code>YOUR_ID_HERE</code>) and tap <b>Save</b>.

Once connected, you will receive alerts for New Messages, Friend Requests, and Group Invites!`;

const HELP_MESSAGE = `ℹ️ <b>Discuss Notifications Bot — Help</b>

This bot only delivers alerts from your Discuss account. 

<b>Commands:</b>
• /start — Show your Chat ID
• /help — Show this help message

To disconnect, open the Discuss app, go to Profile → Telegram Notifications, and tap Disconnect.

<i>Need help? Email support@discussit.in</i>`;

async function poll() {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.ok && data.result.length > 0) {
      for (const update of data.result) {
        lastUpdateId = update.update_id;
        
        if (!update.message) continue;
        const msg = update.message;
        const chatId = msg.chat?.id;
        const text = (msg.text || '').trim();

        if (!chatId) continue;

        if (text.startsWith('/start')) {
          console.log(`[Command] /start from ${chatId}`);
          const welcome = WELCOME_MESSAGE.replace('YOUR_ID_HERE', String(chatId));
          await sendReply(chatId, welcome, { reply_markup: appButton('📲 Open Discuss App') });
        } 
        else if (text.startsWith('/help')) {
          console.log(`[Command] /help from ${chatId}`);
          await sendReply(chatId, HELP_MESSAGE, { reply_markup: appButton('📲 Open Discuss App') });
        }
        else {
          await sendReply(chatId, `ℹ️ This is a notifications-only bot.\n\nSend /start to get your Chat ID or /help for more info.`);
        }
      }
    }
  } catch (err) {
    // Ignore fetch timeouts
  }
  
  // Continue polling
  setTimeout(poll, 1000);
}

console.log('✅ Bot is running! Go to Telegram and send /start to your bot.');
poll();
