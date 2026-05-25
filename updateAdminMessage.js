'use strict';

const https = require('https');

// Database Config for Secondary Firebase
const DATABASE_URL = 'https://discussit-5879b-default-rtdb.firebaseio.com';
const DB_PATH = '/adminMessage.json';

// Polished announcement message matching all user requests
const ANNOUNCEMENT_MESSAGE = `</> Updates: Tech News (https://discussit.in/news) and Tech Jobs (https://discussit.in/jobs) sections are now live! We have added dedicated details/apply interfaces, fast local caching with background synchronization, and full social sharing capabilities.

⚠️ Warning / Note: The application might experience minor loading lag due to early-stage development and active enhancements. Thank you for your patience!

If you encounter any issues or have feedback, please contact us directly at support@discussit.in`;

const payload = JSON.stringify({
  isActive: true,
  createdAt: Date.now(),
  message: ANNOUNCEMENT_MESSAGE
});

const url = new URL(DATABASE_URL + DB_PATH);

const options = {
  hostname: url.hostname,
  port: 443,
  path: url.pathname + url.search,
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

console.log('🔄 Connecting to Secondary Firebase Realtime Database (discussit-5879b)...');

const req = https.request(options, (res) => {
  let responseData = '';
  res.on('data', (chunk) => { responseData += chunk; });
  res.on('end', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('--------------------------------------------------');
      console.log('✅ SUCCESS! Admin global message updated successfully!');
      console.log('--------------------------------------------------');
      console.log('Updated Message:\n');
      console.log(ANNOUNCEMENT_MESSAGE);
      console.log('--------------------------------------------------');
      process.exit(0);
    } else {
      console.error(`❌ FAILED (Status ${res.statusCode}):`, responseData);
      process.exit(1);
    }
  });
});

req.on('error', (err) => {
  console.error('❌ Network error during update:', err.message);
  process.exit(1);
});

req.write(payload);
req.end();
