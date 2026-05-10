const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'frontend/src/pages/ProfilePage.js');
let content = fs.readFileSync(filePath, 'utf8');

// The grep results showed some leftover 'settings.type' and 'settings.enabled'
// but we renamed the variable to 'localSettings' in the context hook.
// Let's ensure everything uses localSettings and has safety guards.

content = content.replace(/settings\.enabled/g, 'localSettings?.enabled');
content = content.replace(/settings\.type/g, 'localSettings?.type');

// Also ensure we are destructuring correctly from useSecurity
content = content.replace(
    /const \{ settings, updateSettings \} = useSecurity\(\);/g,
    'const { localSettings, updateSettings } = useSecurity();'
);

fs.writeFileSync(filePath, content);
console.log('ProfilePage.js cleaned up and secured');
