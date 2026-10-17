#!/usr/bin/env node
/* oxlint-disable no-console */
/**
 * Convert the committed SVG artwork to runtime PNGs and Windows ICOs.
 * Run `npm ci` at the repo root first (sharp is a root dev dependency), then
 * `npm run electron:icons`. Generated assets are committed alongside the SVGs.
 */
const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');

const ICONS_DIR = path.join(__dirname, '..', 'assets', 'icons');

async function rasterize(source, size) {
  return sharp(path.join(ICONS_DIR, source))
    .resize(size, size)
    .png()
    .toBuffer();
}

// ICO permits PNG frames. Keep every standard Windows size, including 256px
// for Explorer, instead of scaling a single low-resolution frame at runtime.
async function writeIco(source, name, sizes) {
  const frames = await Promise.all(
    sizes.map((size) => rasterize(source, size)),
  );
  const directory = Buffer.alloc(6 + sizes.length * 16);
  directory.writeUInt16LE(1, 2); // ICO image type
  directory.writeUInt16LE(sizes.length, 4);
  let offset = directory.length;
  frames.forEach((frame, index) => {
    const entry = 6 + index * 16;
    directory[entry] = sizes[index] === 256 ? 0 : sizes[index];
    directory[entry + 1] = directory[entry];
    directory.writeUInt16LE(1, entry + 4); // Color planes
    directory.writeUInt16LE(32, entry + 6); // RGBA
    directory.writeUInt32LE(frame.length, entry + 8);
    directory.writeUInt32LE(offset, entry + 12);
    offset += frame.length;
  });
  await fs.writeFile(
    path.join(ICONS_DIR, name),
    Buffer.concat([directory, ...frames]),
  );
  console.log(`Generated: ${name}`);
}

async function main() {
  await writeIco('icon.svg', 'icon.ico', [16, 32, 48, 64, 128, 256]);
  await writeIco('tray.svg', 'tray.ico', [16, 32, 48]);
  for (const [source, name, size] of [
    ['icon.svg', 'icon.png', 512],
    ['tray.svg', 'tray.png', 32],
    ['tray@2x.svg', 'tray@2x.png', 64],
  ]) {
    await fs.writeFile(
      path.join(ICONS_DIR, name),
      await rasterize(source, size),
    );
    console.log(`Generated: ${name}`);
  }
}

main().catch((error) => {
  console.error('Icon generation failed:', error);
  process.exitCode = 1;
});
