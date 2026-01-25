#!/usr/bin/env tsx
/**
 * Fetch mm-data assets from jsDelivr CDN (with GitHub raw fallback).
 * 
 * Usage:
 *   npx tsx scripts/mm-data/fetch-assets.ts [--version=v0.3.1] [--force] [--dry-run]
 * 
 * Options:
 *   --version=TAG    Override version from config (e.g., v0.3.1, main)
 *   --force          Re-download even if files exist
 *   --dry-run        Show what would be downloaded without downloading
 *   --prefer-local   Use local ../mm-data repo if available
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

// Parse CLI arguments
const args = process.argv.slice(2);
const getArg = (prefix: string): string | undefined => 
  args.find(a => a.startsWith(prefix))?.split('=')[1];

const VERSION_OVERRIDE = getArg('--version=');
const FORCE = args.includes('--force');
const DRY_RUN = args.includes('--dry-run');
const PREFER_LOCAL = args.includes('--prefer-local');

const CONFIG_PATH = path.join(process.cwd(), 'config/mm-data-assets.json');
const OUTPUT_DIR = path.join(process.cwd(), 'public/record-sheets');
const LOCAL_MM_DATA = path.join(process.cwd(), '../mm-data/data/images/recordsheets');

// Load config
function loadConfig(): AssetConfig {
  const content = fs.readFileSync(CONFIG_PATH, 'utf-8');
  return JSON.parse(content);
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
    return items.split(',').flatMap(item => 
      expandPattern(pattern.replace(full, item.trim()))
    );
  }

  return [pattern];
}

// Get all asset paths from config
function getAssetPaths(config: AssetConfig): string[] {
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

// Download a single file with fallback
async function downloadFile(
  assetPath: string, 
  config: AssetConfig, 
  version: string
): Promise<{ success: boolean; source: string; error?: string }> {
  const cdnUrl = `${config.cdnBase}/${config.repository}@${version}/${config.basePath}/${assetPath}`;
  const rawUrl = `${config.rawBase}/${config.repository}/${version}/${config.basePath}/${assetPath}`;
  const outputPath = path.join(OUTPUT_DIR, assetPath);

  // Check if file exists and not forcing
  if (!FORCE && fs.existsSync(outputPath)) {
    return { success: true, source: 'cached' };
  }

  // Ensure directory exists
  const dir = path.dirname(outputPath);
  if (!DRY_RUN && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Try CDN first
  try {
    const response = await fetch(cdnUrl);
    if (response.ok) {
      if (!DRY_RUN) {
        const content = await response.text();
        fs.writeFileSync(outputPath, content);
      }
      return { success: true, source: 'cdn' };
    }
  } catch (e) {
    // CDN failed, try raw
  }

  // Fallback to GitHub raw
  try {
    const response = await fetch(rawUrl);
    if (response.ok) {
      if (!DRY_RUN) {
        const content = await response.text();
        fs.writeFileSync(outputPath, content);
      }
      return { success: true, source: 'raw' };
    }
    return { success: false, source: 'none', error: `HTTP ${response.status}` };
  } catch (e) {
    return { success: false, source: 'none', error: String(e) };
  }
}

// Copy from local mm-data repo
async function copyFromLocal(assetPath: string): Promise<{ success: boolean; source: string; error?: string }> {
  const sourcePath = path.join(LOCAL_MM_DATA, assetPath);
  const outputPath = path.join(OUTPUT_DIR, assetPath);

  if (!fs.existsSync(sourcePath)) {
    return { success: false, source: 'local', error: 'File not found' };
  }

  if (!FORCE && fs.existsSync(outputPath)) {
    return { success: true, source: 'cached' };
  }

  const dir = path.dirname(outputPath);
  if (!DRY_RUN && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!DRY_RUN) {
    fs.copyFileSync(sourcePath, outputPath);
  }
  return { success: true, source: 'local' };
}

async function main() {
  console.log('='.repeat(60));
  console.log('mm-data Asset Fetcher');
  console.log('='.repeat(60));

  const config = loadConfig();
  const version = VERSION_OVERRIDE || config.version;
  const useLocal = PREFER_LOCAL && fs.existsSync(LOCAL_MM_DATA);

  console.log(`Version: ${version}`);
  console.log(`Source: ${useLocal ? 'Local mm-data repo' : 'jsDelivr CDN'}`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log(`Force: ${FORCE}`);
  console.log(`Dry run: ${DRY_RUN}`);
  console.log('');

  const assetPaths = getAssetPaths(config);
  console.log(`Found ${assetPaths.length} assets to fetch\n`);

  let downloaded = 0;
  let cached = 0;
  let failed = 0;
  const failures: { path: string; error: string }[] = [];
  const sources: Record<string, number> = { cdn: 0, raw: 0, local: 0, cached: 0 };

  // Process in batches
  const BATCH_SIZE = 20;
  for (let i = 0; i < assetPaths.length; i += BATCH_SIZE) {
    const batch = assetPaths.slice(i, i + BATCH_SIZE);
    
    const results = await Promise.all(
      batch.map(async (assetPath) => {
        if (useLocal) {
          return { path: assetPath, result: await copyFromLocal(assetPath) };
        }
        return { path: assetPath, result: await downloadFile(assetPath, config, version) };
      })
    );

    for (const { path: assetPath, result } of results) {
      if (result.success) {
        sources[result.source]++;
        if (result.source === 'cached') {
          cached++;
          process.stdout.write('.');
        } else {
          downloaded++;
          process.stdout.write('+');
        }
      } else {
        failed++;
        failures.push({ path: assetPath, error: result.error || 'Unknown error' });
        process.stdout.write('X');
      }
    }
  }

  console.log('\n');
  console.log('='.repeat(60));
  console.log('Results');
  console.log('='.repeat(60));
  console.log(`Downloaded: ${downloaded}`);
  console.log(`Cached:     ${cached}`);
  console.log(`Failed:     ${failed}`);
  console.log(`Total:      ${assetPaths.length}`);
  console.log('');
  console.log('Sources:');
  for (const [source, count] of Object.entries(sources)) {
    if (count > 0) {
      console.log(`  ${source}: ${count}`);
    }
  }

  if (failures.length > 0) {
    console.log('\nFailed assets:');
    for (const f of failures.slice(0, 10)) {
      console.log(`  - ${f.path}: ${f.error}`);
    }
    if (failures.length > 10) {
      console.log(`  ... and ${failures.length - 10} more`);
    }
  }

  // Write version manifest
  if (!DRY_RUN && failed === 0) {
    const manifest = {
      version,
      fetchedAt: new Date().toISOString(),
      assetCount: assetPaths.length,
      source: useLocal ? 'local' : 'cdn',
    };
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'mm-data-version.json'),
      JSON.stringify(manifest, null, 2)
    );
    console.log('\n✓ Wrote mm-data-version.json');
  }

  if (failed > 0) {
    console.error('\n✗ Some assets failed to download');
    process.exit(1);
  } else {
    console.log('\n✓ All assets fetched successfully!');
  }
}

main().catch(console.error);
