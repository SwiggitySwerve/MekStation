import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
/**
 * Generate app icons from the main logo at various sizes.
 * Usage: node scripts/generate-icons.mjs
 */
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const SOURCE = join(ROOT, 'public', 'mekstation-logo.png');
const OUTPUT_DIR = join(ROOT, 'public', 'icons');

// Common icon sizes for web/PWA/desktop
const SIZES = [
  16, // favicon
  32, // favicon
  48, // Windows small
  64, // Windows medium
  72, // Android
  96, // Android
  128, // Chrome Web Store
  144, // Windows tile
  152, // iOS
  180, // Apple touch icon
  192, // PWA
  256, // Windows large
  384, // PWA
  512, // PWA / high-res
];

async function generateIcons() {
  // Ensure output directory exists
  await mkdir(OUTPUT_DIR, { recursive: true });

  console.log(`Generating icons from: ${SOURCE}`);
  console.log(`Output directory: ${OUTPUT_DIR}\n`);

  for (const size of SIZES) {
    const outputPath = join(OUTPUT_DIR, `icon-${size}x${size}.png`);

    await sharp(SOURCE)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(outputPath);

    console.log(`✓ Generated: icon-${size}x${size}.png`);
  }

  // Also generate apple-touch-icon.png (180x180)
  const appleTouchPath = join(OUTPUT_DIR, 'apple-touch-icon.png');
  await sharp(SOURCE)
    .resize(180, 180, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(appleTouchPath);
  console.log(`✓ Generated: apple-touch-icon.png`);

  // Generate favicon.ico (multi-size) - just use 32x32 as base
  const faviconPath = join(ROOT, 'public', 'favicon.ico');
  await sharp(SOURCE)
    .resize(32, 32, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(faviconPath.replace('.ico', '.png'));
  console.log(`✓ Generated: favicon.png (rename to .ico or use as-is)`);

  console.log(`\nDone! Generated ${SIZES.length + 2} icon files.`);
}

generateIcons().catch(console.error);
