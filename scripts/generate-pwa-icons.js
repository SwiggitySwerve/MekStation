/**
 * Generates PWA icons from the source SVG
 *
 * To run: node scripts/generate-pwa-icons.js
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '..', 'public', 'icons');

const createSvg = (size) => {
  const fontSize = Math.round(size * 0.5);
  const textY = Math.round(size * 0.6);
  const barY = Math.round(size * 0.78);
  const barWidth = Math.round(size * 0.78);
  const barHeight = Math.max(Math.round(size * 0.016), 2);
  const barX = Math.round((size - barWidth) / 2);
  const cornerRadius = Math.round(size * 0.125);
  const barRadius = Math.round(barHeight / 2);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${cornerRadius}" fill="#1e293b"/>
  <text x="${size/2}" y="${textY}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" text-anchor="middle" fill="#f8fafc">M</text>
  <rect x="${barX}" y="${barY}" width="${barWidth}" height="${barHeight}" rx="${barRadius}" fill="#3b82f6"/>
</svg>`;
};

async function generateIcons() {
  // Ensure directory exists
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  for (const size of sizes) {
    const svg = Buffer.from(createSvg(size));
    const pngPath = path.join(iconsDir, `icon-${size}x${size}.png`);

    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(pngPath);

    console.log(`Created: icon-${size}x${size}.png`);
  }

  // Also create apple-touch-icon (180x180)
  const appleSvg = Buffer.from(createSvg(180));
  await sharp(appleSvg)
    .resize(180, 180)
    .png()
    .toFile(path.join(iconsDir, 'apple-touch-icon.png'));
  console.log('Created: apple-touch-icon.png');

  // Create favicon.ico (32x32)
  const faviconSvg = Buffer.from(createSvg(32));
  await sharp(faviconSvg)
    .resize(32, 32)
    .png()
    .toFile(path.join(iconsDir, 'favicon-32x32.png'));
  console.log('Created: favicon-32x32.png');

  // Create 16x16 favicon
  const favicon16Svg = Buffer.from(createSvg(16));
  await sharp(favicon16Svg)
    .resize(16, 16)
    .png()
    .toFile(path.join(iconsDir, 'favicon-16x16.png'));
  console.log('Created: favicon-16x16.png');

  console.log('\nAll PWA icons generated successfully!');
}

generateIcons().catch(console.error);
