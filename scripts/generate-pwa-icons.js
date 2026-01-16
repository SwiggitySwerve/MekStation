#!/usr/bin/env node
/**
 * Generate PWA icons from the SVG source
 * Uses sharp to convert SVG to PNG at required sizes
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');
const SVG_SOURCE = path.join(ICONS_DIR, 'icon.svg');

const sizes = [192, 512];

async function generateIcons() {
  console.log('Generating PWA icons from SVG...\n');

  // Read the SVG file
  const svgBuffer = fs.readFileSync(SVG_SOURCE);

  for (const size of sizes) {
    const outputPath = path.join(ICONS_DIR, `icon-${size}x${size}.png`);
    
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    
    console.log(`Generated: icon-${size}x${size}.png`);
  }

  console.log('\nPWA icon generation complete!');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
