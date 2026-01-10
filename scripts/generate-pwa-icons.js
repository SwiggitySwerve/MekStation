/**
 * PWA Icon Generator Script
 *
 * Generates placeholder PWA icons for MekStation.
 * In production, replace these with properly designed icons.
 *
 * Usage: node scripts/generate-pwa-icons.js
 */

const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '../public/icons');

// Create icons directory if it doesn't exist
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate SVG icon content
function generateSvgIcon(size) {
  const padding = Math.round(size * 0.1);
  const textSize = Math.round(size * 0.25);
  const subTextSize = Math.round(size * 0.08);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="#0f172a"/>

  <!-- Border accent -->
  <rect x="2" y="2" width="${size - 4}" height="${size - 4}" fill="none" stroke="#f59e0b" stroke-width="3" rx="8"/>

  <!-- Inner glow -->
  <rect x="${padding}" y="${padding}" width="${size - padding * 2}" height="${size - padding * 2}" fill="#1e293b" rx="4"/>

  <!-- Mech silhouette (simplified) -->
  <g transform="translate(${size / 2}, ${size / 2 - textSize / 4})">
    <!-- Body -->
    <rect x="-${size * 0.12}" y="-${size * 0.08}" width="${size * 0.24}" height="${size * 0.2}" fill="#f59e0b" rx="2"/>
    <!-- Head -->
    <rect x="-${size * 0.06}" y="-${size * 0.16}" width="${size * 0.12}" height="${size * 0.08}" fill="#f59e0b" rx="1"/>
    <!-- Arms -->
    <rect x="-${size * 0.2}" y="-${size * 0.06}" width="${size * 0.06}" height="${size * 0.16}" fill="#f59e0b" rx="1"/>
    <rect x="${size * 0.14}" y="-${size * 0.06}" width="${size * 0.06}" height="${size * 0.16}" fill="#f59e0b" rx="1"/>
    <!-- Legs -->
    <rect x="-${size * 0.1}" y="${size * 0.12}" width="${size * 0.07}" height="${size * 0.14}" fill="#f59e0b" rx="1"/>
    <rect x="${size * 0.03}" y="${size * 0.12}" width="${size * 0.07}" height="${size * 0.14}" fill="#f59e0b" rx="1"/>
  </g>

  <!-- Text -->
  <text x="${size / 2}" y="${size - padding - subTextSize}"
        font-family="Arial, sans-serif"
        font-size="${subTextSize}px"
        font-weight="bold"
        fill="#94a3b8"
        text-anchor="middle">MEK</text>
</svg>`;
}

// Generate icons for each size
sizes.forEach(size => {
  const svgContent = generateSvgIcon(size);
  const svgPath = path.join(iconsDir, `icon-${size}x${size}.svg`);

  fs.writeFileSync(svgPath, svgContent);
  console.log(`Generated: ${svgPath}`);
});

// Create a simple favicon.ico placeholder (16x16 SVG)
const faviconSvg = generateSvgIcon(32);
fs.writeFileSync(path.join(iconsDir, 'favicon.svg'), faviconSvg);
console.log('Generated: favicon.svg');

console.log('\nNote: For production, convert SVG icons to PNG using a tool like sharp, imagemagick, or an online converter.');
console.log('Required PNG sizes: 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512');
