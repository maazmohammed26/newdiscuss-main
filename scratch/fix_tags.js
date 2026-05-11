const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'frontend/src/pages/ProfilePage.js');
let content = fs.readFileSync(filePath, 'utf8');

// Match the end of the first dialog and add closing tag
const fullNameMatch = /<AlertDialogAction onClick=\{handleDeleteFullName\} disabled=\{savingFullName\} className="bg-\[#EF4444\] text-white hover:bg-\[#DC2626\]">[\s\S]*?<\/AlertDialogFooter>\s*<\/AlertDialogContent>/;
if (fullNameMatch.test(content)) {
    content = content.replace(fullNameMatch, (match) => match + '\n      </AlertDialog>');
    console.log('Added closing tag for FullName dialog');
}

// Match the end of the bio dialog and add closing tag
const bioMatch = /<AlertDialogAction onClick=\{handleDeleteBio\} disabled=\{savingBio\} className="bg-\[#EF4444\] text-white hover:bg-\[#DC2626\]">[\s\S]*?<\/AlertDialogFooter>\s*<\/AlertDialogContent>/;
if (bioMatch.test(content)) {
    content = content.replace(bioMatch, (match) => match + '\n      </AlertDialog>');
    console.log('Added closing tag for Bio dialog');
}

// Match the end of the link dialog and add closing tag
const linkMatch = /<AlertDialogAction onClick=\{\(\) => handleDeleteLink\(deleteLinkConfirm\)\} disabled=\{savingLink\} className="bg-\[#EF4444\] text-white hover:bg-\[#DC2626\]">[\s\S]*?<\/AlertDialogFooter>\s*<\/AlertDialogContent>/;
if (linkMatch.test(content)) {
    content = content.replace(linkMatch, (match) => match + '\n      </AlertDialog>');
    console.log('Added closing tag for Link dialog');
}

fs.writeFileSync(filePath, content);
console.log('Finished fixing AlertDialog tags');
