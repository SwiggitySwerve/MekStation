/**
 * Import-boundary contract for campaign delivery (task 3.2).
 *
 * Production sources must not read the system clock, must not mint a
 * campaign-specific sequence allocator, and must not put journal
 * positions on the public result types.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const DELIVERY_DIR = 'src/lib/campaign/delivery';

/** Walks non-test TypeScript sources under the campaign delivery folder. */
function runtimeSourceFiles(): readonly string[] {
  const files: string[] = [];
  function walk(dir: string): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== '__tests__' && entry.name !== '__fixtures__') {
          walk(full);
        }
      } else if (entry.name.endsWith('.ts')) {
        files.push(full);
      }
    }
  }
  walk(path.join(process.cwd(), DELIVERY_DIR));
  return files;
}

describe('campaign delivery import boundary', () => {
  it('scans a non-empty runtime surface', () => {
    expect(runtimeSourceFiles().length).toBeGreaterThanOrEqual(3);
  });

  it('contains no Date.now or new Date in production delivery sources', () => {
    const offenders: string[] = [];
    const tokens: readonly RegExp[] = [/Date\.now/, /new Date\(/];
    for (const file of runtimeSourceFiles()) {
      const text = fs.readFileSync(file, 'utf8');
      for (const token of tokens) {
        if (token.test(text)) {
          offenders.push(`${path.basename(file)}: ${token}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('does not declare streamRevision or commitPosition on public types', () => {
    const offenders: string[] = [];
    const positionFields =
      /(?:readonly\s+)?(?:streamRevision|commitPosition|eventDigest)\s*[?:]/;
    const publicFiles = [
      'campaignDeliveryTypes.ts',
      'projectCampaignStreamForGrant.ts',
    ];
    for (const name of publicFiles) {
      const text = fs.readFileSync(
        path.join(process.cwd(), DELIVERY_DIR, name),
        'utf8',
      );
      if (positionFields.test(text)) {
        offenders.push(`${name}: journal position field`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('does not mint a campaign-specific epoch table or sequence allocator', () => {
    const offenders: string[] = [];
    const forbidden =
      /CREATE TABLE[\s\S]*campaign_delivery|allocateCampaignSequence|campaignEpochId/;
    for (const file of runtimeSourceFiles()) {
      const text = fs.readFileSync(file, 'utf8');
      if (forbidden.test(text)) {
        offenders.push(path.basename(file));
      }
    }
    expect(offenders).toEqual([]);
  });
});
