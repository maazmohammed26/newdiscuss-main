const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'frontend/src/pages/ProfilePage.js');
let content = fs.readFileSync(filePath, 'utf8');

// Add optional chaining to localSettings access
content = content.replace(/localSettings\.enabled/g, 'localSettings?.enabled');
content = content.replace(/localSettings\.type/g, 'localSettings?.type');

fs.writeFileSync(filePath, content);
console.log('ProfilePage.js updated with safety guards');
