const fs = require('fs');
const path = require('path');

const files = [
    'frontend/src/components/SecurityLockScreen.js',
    'frontend/src/App.js'
];

files.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        content = content.replace(/localSettings\.enabled/g, 'localSettings?.enabled');
        content = content.replace(/localSettings\.type/g, 'localSettings?.type');
        fs.writeFileSync(filePath, content);
        console.log(`${file} updated with safety guards`);
    }
});
