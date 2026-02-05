#!/usr/bin/env node
/**
 * Check if mm-data assets exist (for postinstall hook).
 *
 * This script is designed to be fast and non-blocking:
 * - Checks if assets are already present (via version manifest)
 * - If missing, suggests running fetch:assets
 * - Never fails the build (returns 0 even if assets missing)
 *
 * Usage:
 *   node scripts/mm-data/check-assets.js [--quiet]
 *
 * Options:
 *   --quiet    Suppress informational output (only show warnings)
 */

const fs = require('fs');
const path = require('path');

const QUIET = process.argv.includes('--quiet');
const MANIFEST_PATH = path.join(
  process.cwd(),
  'public/record-sheets/mm-data-version.json',
);
const CONFIG_PATH = path.join(process.cwd(), 'config/mm-data-assets.json');

function log(msg) {
  if (!QUIET) {
    console.log(msg);
  }
}

function warn(msg) {
  console.warn(msg);
}

function main() {
  // Check if manifest exists (indicates assets were fetched)
  if (fs.existsSync(MANIFEST_PATH)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
      log(
        `✓ mm-data assets present (${manifest.version}, ${manifest.assetCount} files)`,
      );
      return 0;
    } catch (e) {
      // Manifest exists but is invalid - assets may need refresh
    }
  }

  // Check if config exists
  if (!fs.existsSync(CONFIG_PATH)) {
    warn('⚠ mm-data config not found. Skipping asset check.');
    return 0;
  }

  // Assets not present - provide helpful message
  warn('');
  warn('╭─────────────────────────────────────────────────────────────╮');
  warn('│  mm-data assets not found                                   │');
  warn('│                                                             │');
  warn('│  Record sheet templates and armor pips need to be fetched.  │');
  warn('│  Run the following command:                                 │');
  warn('│                                                             │');
  warn('│    npm run fetch:assets                                     │');
  warn('│                                                             │');
  warn('│  This downloads ~500 SVG files from jsDelivr CDN.           │');
  warn('│  The app will work without them, but PDF export and         │');
  warn('│  record sheet rendering will be unavailable.                │');
  warn('╰─────────────────────────────────────────────────────────────╯');
  warn('');

  // Always return success - don't block npm install
  return 0;
}

process.exit(main());
