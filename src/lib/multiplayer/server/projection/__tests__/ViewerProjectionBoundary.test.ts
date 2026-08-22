/**
 * Import-boundary contract for the viewer projection seam (PR 6).
 *
 * Static proof that projection sources cannot import private-record
 * storage (structural impossibility of leaking private payloads) and
 * that the public output types do not export IStoredEvent.
 *
 * Mirrors the scan style of ReplayDependencyBoundary.test.ts.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const PROJECTION_DIR = 'src/lib/multiplayer/server/projection';

/**
 * Walks non-test TypeScript sources under the projection folder.
 */
function runtimeSourceFiles(): readonly string[] {
  const files: string[] = [];
  function walk(dir: string): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== '__tests__' && entry.name !== '__fixtures__')
          walk(full);
      } else if (entry.name.endsWith('.ts')) {
        files.push(full);
      }
    }
  }
  walk(path.join(process.cwd(), PROJECTION_DIR));
  return files;
}

/**
 * Public contract files: output types plus the barrel. IStoredEvent
 * must not be part of this export surface.
 */
function publicContractFiles(): readonly string[] {
  const root = path.join(process.cwd(), PROJECTION_DIR);
  return [
    path.join(root, 'ViewerProjectionTypes.ts'),
    path.join(root, 'index.ts'),
  ];
}

describe('viewer projection import boundary', function () {
  it('scans a non-empty runtime surface', function () {
    expect(runtimeSourceFiles().length).toBeGreaterThanOrEqual(3);
  });

  it('imports nothing from src/lib/events/privacy', function () {
    const offenders: string[] = [];
    const privacy = /events[/\\]privacy/;
    for (const file of runtimeSourceFiles()) {
      const text = fs.readFileSync(file, 'utf8');
      if (privacy.test(text))
        offenders.push(`${path.basename(file)}: privacy import`);
    }
    expect(offenders).toEqual([]);
  });

  it('does not export IStoredEvent from public output types', function () {
    const offenders: string[] = [];
    const exportedStored = /export\s+(type\s+|\{[^}]*\b)?IStoredEvent/;
    const anyStored = /\bIStoredEvent\b/;
    for (const file of publicContractFiles()) {
      const text = fs.readFileSync(file, 'utf8');
      if (exportedStored.test(text) || anyStored.test(text))
        offenders.push(`${path.basename(file)}: IStoredEvent`);
    }
    expect(offenders).toEqual([]);
  });

  it('contains no Date.now or new Date in production projection sources', function () {
    const offenders: string[] = [];
    const tokens: readonly RegExp[] = [/Date\.now/, /new Date\(/];
    for (const file of runtimeSourceFiles()) {
      const text = fs.readFileSync(file, 'utf8');
      for (const token of tokens) {
        if (token.test(text))
          offenders.push(`${path.basename(file)}: ${String(token)}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
