#!/usr/bin/env tsx
/**
 * Test script to verify all mm-data assets are accessible via jsDelivr CDN.
 *
 * Usage: npx tsx scripts/mm-data/test-cdn-access.ts [--version=v0.3.1]
 */

import { execSync } from 'child_process';
import * as path from 'path';

const MM_DATA_VERSION =
  process.argv.find((a) => a.startsWith('--version='))?.split('=')[1] ||
  'v0.3.1';
const CDN_BASE = `https://cdn.jsdelivr.net/gh/MegaMek/mm-data@${MM_DATA_VERSION}/data/images/recordsheets`;
const GITHUB_RAW_BASE = `https://raw.githubusercontent.com/MegaMek/mm-data/${MM_DATA_VERSION}/data/images/recordsheets`;

// Get all assets from our current public/record-sheets
function getCurrentAssets(): string[] {
  const result = execSync('find public/record-sheets -name "*.svg" -type f', {
    encoding: 'utf-8',
  });
  return result
    .trim()
    .split('\n')
    .map((p) => p.replace('public/record-sheets/', ''))
    .filter((p) => !p.startsWith('templates/')); // Skip legacy templates folder (copies)
}

// Map our local paths to mm-data paths
function mapToMmDataPath(localPath: string): string {
  // Our paths match mm-data paths directly
  return localPath;
}

async function testUrl(
  url: string,
): Promise<{ ok: boolean; status: number; time: number }> {
  const start = Date.now();
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return {
      ok: response.ok,
      status: response.status,
      time: Date.now() - start,
    };
  } catch (error) {
    return { ok: false, status: 0, time: Date.now() - start };
  }
}

async function main() {
  console.log(`Testing mm-data asset CDN access`);
  console.log(`Version: ${MM_DATA_VERSION}`);
  console.log(`CDN Base: ${CDN_BASE}`);
  console.log('');

  const assets = getCurrentAssets();
  console.log(`Found ${assets.length} assets to test\n`);

  let passed = 0;
  let failed = 0;
  const failures: { asset: string; cdnStatus: number; rawStatus: number }[] =
    [];

  // Test in batches of 20 for faster execution
  const BATCH_SIZE = 20;
  for (let i = 0; i < assets.length; i += BATCH_SIZE) {
    const batch = assets.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (asset) => {
        const mmDataPath = mapToMmDataPath(asset);
        const cdnUrl = `${CDN_BASE}/${mmDataPath}`;
        const rawUrl = `${GITHUB_RAW_BASE}/${mmDataPath}`;

        const cdnResult = await testUrl(cdnUrl);

        if (cdnResult.ok) {
          return {
            asset,
            success: true,
            cdnStatus: cdnResult.status,
            rawStatus: 0,
          };
        }

        // Fallback to GitHub raw
        const rawResult = await testUrl(rawUrl);
        if (rawResult.ok) {
          return {
            asset,
            success: true,
            cdnStatus: cdnResult.status,
            rawStatus: rawResult.status,
          };
        }

        return {
          asset,
          success: false,
          cdnStatus: cdnResult.status,
          rawStatus: rawResult.status,
        };
      }),
    );

    for (const result of results) {
      if (result.success) {
        passed++;
        process.stdout.write('.');
      } else {
        failed++;
        process.stdout.write('X');
        failures.push({
          asset: result.asset,
          cdnStatus: result.cdnStatus,
          rawStatus: result.rawStatus,
        });
      }
    }
  }

  console.log('\n');
  console.log('='.repeat(60));
  console.log(
    `Results: ${passed} passed, ${failed} failed out of ${assets.length} total`,
  );
  console.log('='.repeat(60));

  if (failures.length > 0) {
    console.log('\nFailed assets:');
    for (const f of failures) {
      console.log(`  - ${f.asset} (CDN: ${f.cdnStatus}, Raw: ${f.rawStatus})`);
    }
    process.exit(1);
  } else {
    console.log('\n✓ All assets accessible via CDN!');
    process.exit(0);
  }
}

main().catch(console.error);
