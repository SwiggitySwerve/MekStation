#!/usr/bin/env node
/**
 * BattleTech Editor - Icon Generator Script
 * 
 * Generates placeholder icons for development/testing.
 * For production, replace these with actual designed icons.
 * 
 * Required icon sizes:
 * - macOS: icon.icns (multiple sizes bundled)
 * - Windows: icon.ico (256x256, 128x128, 64x64, 48x48, 32x32, 16x16)
 * - Linux: PNG files (512, 256, 128, 64, 48, 32, 16)
 * - Tray: 16x16, 32x32 PNG
 * 
 * Usage:
 *   node scripts/generate-icons.js
 *   npm run icons:generate
 * 
 * Note: This creates simple SVG placeholder icons.
 * Use tools like png2icons, electron-icon-builder, or icon-gen
 * to convert a source PNG to all required formats.
 */

const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '..', 'assets', 'icons');

// Ensure icons directory exists
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

/**
 * Generate a simple SVG icon
 */
function generateSvgIcon(size) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#16213e;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="mechGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4ade80;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#22c55e;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="url(#bgGradient)"/>
  
  <!-- Border -->
  <rect x="${size * 0.02}" y="${size * 0.02}" 
        width="${size * 0.96}" height="${size * 0.96}" 
        rx="${size * 0.13}" 
        fill="none" stroke="#4ade80" stroke-width="${size * 0.02}"/>
  
  <!-- Simplified Mech silhouette -->
  <g transform="translate(${size * 0.15}, ${size * 0.1})">
    <!-- Head -->
    <rect x="${size * 0.25}" y="0" 
          width="${size * 0.2}" height="${size * 0.12}" 
          rx="${size * 0.02}" fill="url(#mechGradient)"/>
    
    <!-- Torso -->
    <rect x="${size * 0.15}" y="${size * 0.13}" 
          width="${size * 0.4}" height="${size * 0.35}" 
          rx="${size * 0.03}" fill="url(#mechGradient)"/>
    
    <!-- Left Arm -->
    <rect x="0" y="${size * 0.15}" 
          width="${size * 0.12}" height="${size * 0.35}" 
          rx="${size * 0.02}" fill="url(#mechGradient)"/>
    
    <!-- Right Arm -->
    <rect x="${size * 0.58}" y="${size * 0.15}" 
          width="${size * 0.12}" height="${size * 0.35}" 
          rx="${size * 0.02}" fill="url(#mechGradient)"/>
    
    <!-- Left Leg -->
    <rect x="${size * 0.18}" y="${size * 0.5}" 
          width="${size * 0.14}" height="${size * 0.3}" 
          rx="${size * 0.02}" fill="url(#mechGradient)"/>
    
    <!-- Right Leg -->
    <rect x="${size * 0.38}" y="${size * 0.5}" 
          width="${size * 0.14}" height="${size * 0.3}" 
          rx="${size * 0.02}" fill="url(#mechGradient)"/>
  </g>
  
  <!-- "BT" Text -->
  <text x="${size * 0.5}" y="${size * 0.95}" 
        font-family="Arial, sans-serif" font-weight="bold" 
        font-size="${size * 0.12}" fill="#4ade80" 
        text-anchor="middle">BT</text>
</svg>`;
}

/**
 * Generate tray icon (simpler, smaller)
 */
function generateTrayIcon(size) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size * 0.1}" fill="#1a1a2e"/>
  <text x="${size * 0.5}" y="${size * 0.7}" 
        font-family="Arial, sans-serif" font-weight="bold" 
        font-size="${size * 0.6}" fill="#4ade80" 
        text-anchor="middle">BT</text>
</svg>`;
}

// Generate main icon at various sizes
const sizes = [16, 32, 48, 64, 128, 256, 512, 1024];
sizes.forEach(size => {
  const svg = generateSvgIcon(size);
  fs.writeFileSync(path.join(ICONS_DIR, `icon-${size}.svg`), svg);
  console.log(`Generated: icon-${size}.svg`);
});

// Generate a single icon.svg (512px)
fs.writeFileSync(path.join(ICONS_DIR, 'icon.svg'), generateSvgIcon(512));
console.log('Generated: icon.svg');

// Generate tray icons
fs.writeFileSync(path.join(ICONS_DIR, 'tray.svg'), generateTrayIcon(32));
console.log('Generated: tray.svg');

fs.writeFileSync(path.join(ICONS_DIR, 'tray@2x.svg'), generateTrayIcon(64));
console.log('Generated: tray@2x.svg');

console.log(`
========================================
  Icon Generation Complete!
========================================

Generated placeholder SVG icons in: ${ICONS_DIR}

IMPORTANT: For production builds, you need to:

1. Create a source PNG icon (1024x1024 or larger)
2. Convert to platform-specific formats:

   macOS (.icns):
     - Use iconutil (macOS) or png2icns
     - Sizes: 16, 32, 64, 128, 256, 512, 1024 (with @2x variants)

   Windows (.ico):
     - Use png2ico or ImageMagick
     - Sizes: 16, 32, 48, 64, 128, 256

   Linux (PNG):
     - Multiple PNG files in icon directory
     - Sizes: 16, 32, 48, 64, 128, 256, 512

Tools for icon conversion:
  - electron-icon-builder: npm install -g electron-icon-builder
  - icon-gen: npm install -g icon-gen
  - png2icns (macOS): Available via Homebrew

Example with electron-icon-builder:
  electron-icon-builder --input=./icon-source.png --output=./desktop/assets/icons

========================================
`);
