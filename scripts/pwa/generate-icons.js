#!/usr/bin/env node
/**
 * PWA Icon Generator
 *
 * Generates placeholder icons for the PWA manifest.
 * These are simple colored squares that should be replaced with proper branding icons.
 *
 * For production, replace these with proper MekStation branding icons.
 */

const fs = require('fs');
const path = require('path');

// PNG file structure helpers
function createPNG(width, height, rgbColor) {
  const { r, g, b } = rgbColor;

  // Create raw pixel data (RGBA)
  const pixelData = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    pixelData[i * 4] = r;
    pixelData[i * 4 + 1] = g;
    pixelData[i * 4 + 2] = b;
    pixelData[i * 4 + 3] = 255; // Full opacity
  }

  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk (image header)
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // Bit depth
  ihdrData[9] = 2;  // Color type (RGB)
  ihdrData[10] = 0; // Compression method
  ihdrData[11] = 0; // Filter method
  ihdrData[12] = 0; // Interlace method

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Create raw image data (filter byte + RGB pixels per row)
  const rawData = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 3);
    rawData[rowStart] = 0; // No filter
    for (let x = 0; x < width; x++) {
      const pixelStart = rowStart + 1 + x * 3;
      rawData[pixelStart] = r;
      rawData[pixelStart + 1] = g;
      rawData[pixelStart + 2] = b;
    }
  }

  // Compress with zlib (using Node's built-in)
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = crc32(crcData);

  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc >>> 0, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

// CRC32 implementation for PNG
function crc32(buffer) {
  let crc = 0xffffffff;
  const table = getCRC32Table();

  for (let i = 0; i < buffer.length; i++) {
    crc = table[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }

  return crc ^ 0xffffffff;
}

let crcTable = null;
function getCRC32Table() {
  if (crcTable) return crcTable;

  crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    crcTable[n] = c;
  }
  return crcTable;
}

// MekStation brand colors (slate-900 from Tailwind)
const brandColor = { r: 15, g: 23, b: 42 }; // #0f172a
const accentColor = { r: 59, g: 130, b: 246 }; // Blue-500

// Icon sizes needed for PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

const iconsDir = path.join(__dirname, '../../public/icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('Generating PWA icons...');

// Generate regular icons with brand color
sizes.forEach(size => {
  const iconPath = path.join(iconsDir, `icon-${size}x${size}.png`);
  const pngData = createPNG(size, size, brandColor);
  fs.writeFileSync(iconPath, pngData);
  console.log(`  Created: icon-${size}x${size}.png`);
});

// Generate maskable icons (with padding for safe zone)
[192, 512].forEach(size => {
  const iconPath = path.join(iconsDir, `icon-maskable-${size}x${size}.png`);
  const pngData = createPNG(size, size, accentColor);
  fs.writeFileSync(iconPath, pngData);
  console.log(`  Created: icon-maskable-${size}x${size}.png`);
});

// Create a favicon
const faviconPath = path.join(iconsDir, '../favicon.ico');
const favicon16 = createPNG(16, 16, brandColor);
fs.writeFileSync(faviconPath, favicon16);
console.log('  Created: favicon.ico (16x16)');

// Create Apple touch icon
const appleTouchIconPath = path.join(iconsDir, 'apple-touch-icon.png');
const appleTouchIcon = createPNG(180, 180, brandColor);
fs.writeFileSync(appleTouchIconPath, appleTouchIcon);
console.log('  Created: apple-touch-icon.png (180x180)');

console.log('\nPWA icons generated successfully!');
console.log('\nNOTE: These are placeholder icons. Replace them with proper MekStation branding.');
console.log('Icon files are located in: public/icons/');
