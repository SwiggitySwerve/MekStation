/**
 * Import-boundary contract for the delivery-epoch seam (PR 7).
 *
 * Static proof that delivery sources cannot import private-record
 * storage and that public output types never carry raw journal
 * positions (streamRevision / commitPosition).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const DELIVERY_DIR = 'src/lib/multiplayer/server/delivery';

/**
 * Walks non-test TypeScript sources under the delivery folder.
 */
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

/**
 * Public contract files: store types plus the delivery integration
 * result. Raw journal positions must not appear on this surface.
 */
function publicContractFiles(): readonly string[] {
  const root = path.join(process.cwd(), DELIVERY_DIR);
  return [
    path.join(root, 'IDeliveryEpochStore.ts'),
    path.join(root, 'projectWithDelivery.ts'),
  ];
}

describe('delivery epoch import boundary', () => {
  it('scans a non-empty runtime surface', () => {
    expect(runtimeSourceFiles().length).toBeGreaterThanOrEqual(3);
  });

  it('imports nothing from src/lib/events/privacy', () => {
    const offenders: string[] = [];
    const privacy = /events[/\\]privacy/;
    for (const file of runtimeSourceFiles()) {
      const text = fs.readFileSync(file, 'utf8');
      if (privacy.test(text)) {
        offenders.push(`${path.basename(file)}: privacy import`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('does not put streamRevision or commitPosition on public output types', () => {
    const offenders: string[] = [];
    const positionFields =
      /(?:readonly\s+)?(?:streamRevision|commitPosition)\s*[?:]/;
    for (const file of publicContractFiles()) {
      const text = fs.readFileSync(file, 'utf8');
      if (positionFields.test(text)) {
        offenders.push(`${path.basename(file)}: journal position field`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('contains no Date.now or new Date in production delivery sources', () => {
    const offenders: string[] = [];
    const tokens: readonly RegExp[] = [/Date\.now/, /new Date\(/];
    for (const file of runtimeSourceFiles()) {
      const text = fs.readFileSync(file, 'utf8');
      for (const token of tokens) {
        if (token.test(text)) {
          offenders.push(`${path.basename(file)}: ${String(token)}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
