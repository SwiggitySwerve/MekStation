#!/usr/bin/env tsx
/**
 * Validate that all required mm-data assets exist.
 *
 * This script checks if all assets defined in config/mm-data-assets.json
 * are present in public/record-sheets/. Used for build validation.
 *
 * Usage:
 *   npx tsx scripts/mm-data/validate-assets.ts [--strict] [--quiet]
 *
 * Options:
 *   --strict   Exit with code 1 if any assets are missing
 *   --quiet    Only show summary and errors
 *
 * Exit codes:
 *   0 - All assets present (or --strict not specified)
 *   1 - Assets missing and --strict specified
 */

import * as fs from 'fs';
import * as path from 'path';

interface AssetConfig {
  version: string;
  repository: string;
  basePath: string;
  cdnBase: string;
  rawBase: string;
  directories: string[];
  patterns: Record<string, string[]>;
}

interface ValidationResult {
  total: number;
  present: number;
  missing: string[];
  manifestVersion: string | null;
  configVersion: string;
}

const args = process.argv.slice(2);
const STRICT = args.includes('--strict');
const QUIET = args.includes('--quiet');

const CONFIG_PATH = path.join(process.cwd(), 'config/mm-data-assets.json');
const OUTPUT_DIR = path.join(process.cwd(), 'public/record-sheets');
const MANIFEST_PATH = path.join(OUTPUT_DIR, 'mm-data-version.json');

function log(msg: string): void {
  if (!QUIET) {
    console.log(msg);
  }
}

// Expand pattern like "Armor_CT_{1-51}_Humanoid.svg" to actual file names
function expandPattern(pattern: string): string[] {
  // Handle range patterns: {1-51}
  const rangeMatch = pattern.match(/\{(\d+)-(\d+)\}/);
  if (rangeMatch) {
    const [full, startStr, endStr] = rangeMatch;
    const start = parseInt(startStr, 10);
    const end = parseInt(endStr, 10);
    const results: string[] = [];
    for (let i = start; i <= end; i++) {
      results.push(pattern.replace(full, String(i)));
    }
    return results.flatMap(expandPattern);
  }

  // Handle list patterns: {CT,HD,LA}
  const listMatch = pattern.match(/\{([^}]+)\}/);
  if (listMatch) {
    const [full, items] = listMatch;
    return items
      .split(',')
      .flatMap((item) => expandPattern(pattern.replace(full, item.trim())));
  }

  return [pattern];
}

// Get all expected asset paths from config
function getExpectedAssets(config: AssetConfig): string[] {
  const paths: string[] = [];

  for (const [dir, patterns] of Object.entries(config.patterns)) {
    for (const pattern of patterns) {
      const expanded = expandPattern(pattern);
      for (const file of expanded) {
        paths.push(`${dir}/${file}`);
      }
    }
  }

  return paths;
}

function validateAssets(): ValidationResult {
  // Load config
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('Error: Config file not found:', CONFIG_PATH);
    process.exit(1);
  }

  const config: AssetConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  const expectedAssets = getExpectedAssets(config);

  // Check manifest
  let manifestVersion: string | null = null;
  if (fs.existsSync(MANIFEST_PATH)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
      manifestVersion = manifest.version || null;
    } catch {
      // Invalid manifest
    }
  }

  // Check each asset
  const missing: string[] = [];
  let present = 0;

  for (const assetPath of expectedAssets) {
    const fullPath = path.join(OUTPUT_DIR, assetPath);
    if (fs.existsSync(fullPath)) {
      present++;
    } else {
      missing.push(assetPath);
    }
  }

  return {
    total: expectedAssets.length,
    present,
    missing,
    manifestVersion,
    configVersion: config.version,
  };
}

function main(): void {
  console.log('='.repeat(60));
  console.log('mm-data Asset Validation');
  console.log('='.repeat(60));

  const result = validateAssets();

  console.log(`Config version:   ${result.configVersion}`);
  console.log(`Manifest version: ${result.manifestVersion || '(not found)'}`);
  console.log(`Assets expected:  ${result.total}`);
  console.log(`Assets present:   ${result.present}`);
  console.log(`Assets missing:   ${result.missing.length}`);

  if (
    result.manifestVersion &&
    result.manifestVersion !== result.configVersion
  ) {
    console.log('');
    console.warn('⚠ Warning: Version mismatch between config and manifest');
    console.warn(
      `  Config expects ${result.configVersion}, manifest has ${result.manifestVersion}`,
    );
    console.warn('  Run "npm run fetch:assets --force" to update assets');
  }

  if (result.missing.length > 0) {
    console.log('');
    console.log('Missing assets:');
    const displayCount = Math.min(result.missing.length, 20);
    for (let i = 0; i < displayCount; i++) {
      console.log(`  - ${result.missing[i]}`);
    }
    if (result.missing.length > displayCount) {
      console.log(`  ... and ${result.missing.length - displayCount} more`);
    }

    if (STRICT) {
      console.log('');
      console.error('✗ Validation FAILED: Assets are missing');
      console.error('  Run "npm run fetch:assets" to download required assets');
      process.exit(1);
    } else {
      console.log('');
      console.warn('⚠ Warning: Some assets are missing');
      console.warn('  Run "npm run fetch:assets" to download required assets');
      console.warn(
        '  Use --strict flag to fail the build when assets are missing',
      );
    }
  } else {
    console.log('');
    console.log('✓ All assets present');
  }

  // Summary for CI
  console.log('');
  console.log('='.repeat(60));
  const status =
    result.missing.length === 0 ? 'PASSED' : STRICT ? 'FAILED' : 'WARNING';
  console.log(`Validation: ${status}`);
  console.log('='.repeat(60));
}

main();
