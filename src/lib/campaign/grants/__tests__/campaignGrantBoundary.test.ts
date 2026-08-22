/**
 * Import-boundary contract for the campaign-grant seam (task 2.1).
 *
 * Production sources must not read the system clock and must not import
 * share UI, replica, or socket transport modules those later tasks own.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const GRANTS_DIR = 'src/lib/campaign/grants';

/**
 * Walks non-test TypeScript sources under the grants folder.
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
  walk(path.join(process.cwd(), GRANTS_DIR));
  return files;
}

describe('campaign grant import boundary', () => {
  it('scans a non-empty runtime surface', () => {
    expect(runtimeSourceFiles().length).toBeGreaterThanOrEqual(4);
  });

  it('contains no Date.now or new Date in production grant sources', () => {
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

  it('does not import share UI, replica, or socket transport', () => {
    const offenders: string[] = [];
    const forbidden =
      /pages[/\\]|components[/\\]|multiplayer[/\\]server[/\\]bind|campaign[/\\]coop/;
    for (const file of runtimeSourceFiles()) {
      const text = fs.readFileSync(file, 'utf8');
      if (forbidden.test(text)) {
        offenders.push(`${path.basename(file)}: transport or UI import`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
