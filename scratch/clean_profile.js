const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'frontend/src/pages/ProfilePage.js');
let content = fs.readFileSync(filePath, 'utf8');

// Find the last occurrence of "initials =" and remove everything security related before it that might have been duplicated
content = content.replace(/const handleToggleSecurity = [\s\S]*?const initials =/g, 'const initials =');

fs.writeFileSync(filePath, content);
console.log('ProfilePage.js cleaned up successfully');
