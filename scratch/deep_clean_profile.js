const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'frontend/src/pages/ProfilePage.js');
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

console.log('Total lines before:', lines.length);

// 1. Remove all blob lines containing /*SecurityHandlers*/ 
lines = lines.filter(l => !l.includes('/*SecurityHandlers*/'));

// 2. Remove duplicate AlertDialog blob lines (lines that start with </AlertDialog> <AlertDialog open=)
lines = lines.filter(l => {
  const t = l.trim();
  return !(t.startsWith('</AlertDialog>') && t.includes('<AlertDialog open={showPinModal}'));
});

// 3. Fix old handler name: handleVerifySuccess -> handleVerifyAndEnableBiometric
lines = lines.map(l => l.replace(/handleVerifySuccess/g, 'handleVerifyAndEnableBiometric'));

// 4. Fix old settings.pin reference in any remaining lines
lines = lines.map(l => l.replace(/settings\.pin/g, 'remoteSettings?.pin'));

console.log('Total lines after:', lines.length);

fs.writeFileSync(filePath, lines.join('\n'));
console.log('ProfilePage.js fully cleaned!');
