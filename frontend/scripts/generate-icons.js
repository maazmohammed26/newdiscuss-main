const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const NEW_LOGO_PATH = path.resolve('C:/Users/maazm/.gemini/antigravity-ide/brain/255935c8-e27c-4fe8-ae63-f3b5cad417e6/.user_uploaded/media_1787831413089.png');
const OLD_LOGO_PATH = path.resolve('C:/Users/maazm/.gemini/antigravity-ide/brain/255935c8-e27c-4fe8-ae63-f3b5cad417e6/.user_uploaded/media_1787830317095.png');
const PUBLIC_DIR = path.resolve(__dirname, '../public');

async function main() {
  console.log('Generating Discuss 2.0 icons from source images...');

  if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  }

  // 1. Copy / save high quality original 512x512 logo-new.png and logo-old.png
  await sharp(NEW_LOGO_PATH)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(PUBLIC_DIR, 'logo-new.png'));
  console.log('Created logo-new.png');

  await sharp(OLD_LOGO_PATH)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(PUBLIC_DIR, 'logo-old.png'));
  console.log('Created logo-old.png');

  // 2. Main favicon-new.png (512x512)
  await sharp(NEW_LOGO_PATH)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ quality: 100 })
    .toFile(path.join(PUBLIC_DIR, 'favicon-new.png'));
  console.log('Created favicon-new.png');

  // 3. PWA Icons: logo512.png, logo192.png
  await sharp(NEW_LOGO_PATH)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ quality: 100 })
    .toFile(path.join(PUBLIC_DIR, 'logo512.png'));
  console.log('Created logo512.png');

  await sharp(NEW_LOGO_PATH)
    .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ quality: 100 })
    .toFile(path.join(PUBLIC_DIR, 'logo192.png'));
  console.log('Created logo192.png');

  // 4. Apple Touch Icon (180x180)
  await sharp(NEW_LOGO_PATH)
    .resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ quality: 100 })
    .toFile(path.join(PUBLIC_DIR, 'apple-touch-icon.png'));
  console.log('Created apple-touch-icon.png');

  // 5. Crisp standard favicon: 32x32, 64x64, 48x48
  await sharp(NEW_LOGO_PATH)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ quality: 100 })
    .toFile(path.join(PUBLIC_DIR, 'favicon.png'));
  console.log('Created favicon.png (32x32)');

  await sharp(NEW_LOGO_PATH)
    .resize(48, 48, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ quality: 100 })
    .toFile(path.join(PUBLIC_DIR, 'favicon-48x48.png'));
  console.log('Created favicon-48x48.png');

  // Generate multi-size favicon.ico from 16, 32, 48
  const b16 = await sharp(NEW_LOGO_PATH).resize(16, 16).png().toBuffer();
  const b32 = await sharp(NEW_LOGO_PATH).resize(32, 32).png().toBuffer();
  const b48 = await sharp(NEW_LOGO_PATH).resize(48, 48).png().toBuffer();

  // Create standard Windows ICO binary
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // Reserved
  icoHeader.writeUInt16LE(1, 2); // ICO type
  icoHeader.writeUInt16LE(3, 4); // Number of images

  const images = [
    { width: 16, height: 16, buf: b16 },
    { width: 32, height: 32, buf: b32 },
    { width: 48, height: 48, buf: b48 },
  ];

  let offset = 6 + (16 * images.length);
  const dirEntries = [];
  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.width >= 256 ? 0 : img.width, 0);
    entry.writeUInt8(img.height >= 256 ? 0 : img.height, 1);
    entry.writeUInt8(0, 2); // Color palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(img.buf.length, 8); // Image size in bytes
    entry.writeUInt32LE(offset, 12); // Image data offset
    dirEntries.push(entry);
    offset += img.buf.length;
  }

  const icoBuffer = Buffer.concat([icoHeader, ...dirEntries, ...images.map(i => i.buf)]);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.ico'), icoBuffer);
  console.log('Created multi-size favicon.ico');

  console.log('All icons generated successfully!');
}

main().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
