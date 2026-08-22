/**
 * Import-boundary contract for the history/timeline/export seam (PR 9).
 *
 * Production sources may import privacy only through IPrivateRecordRepository.
 * Public types must not re-export stored-journal-row types. The folder
 * must not read the system clock.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const HISTORY_DIR = 'src/lib/multiplayer/server/history';
const PRIVACY_CONTRACT = 'IPrivateRecordRepository';

/**
 * Walks non-test TypeScript sources under the history folder.
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
  walk(path.join(process.cwd(), HISTORY_DIR));
  return files;
}

describe('viewer history import boundary', function () {
  it('scans a non-empty runtime surface', function () {
    expect(runtimeSourceFiles().length).toBeGreaterThanOrEqual(2);
  });

  it('imports privacy only via the repository contract', function () {
    const offenders: string[] = [];
    const privacyFrom = /from\s+['"]([^'"]*events[/\\]privacy[^'"]*)['"]/g;
    const tableAccess = /private_record|private_access_audit|private_retention/;
    for (const file of runtimeSourceFiles()) {
      const text = fs.readFileSync(file, 'utf8');
      const basename = path.basename(file);
      if (tableAccess.test(text)) {
        offenders.push(`${basename}: direct private table access`);
      }
      privacyFrom.lastIndex = 0;
      let match = privacyFrom.exec(text);
      while (match !== null) {
        const spec = match[1] ?? '';
        if (!spec.includes(PRIVACY_CONTRACT)) {
          offenders.push(`${basename}: ${spec}`);
        }
        match = privacyFrom.exec(text);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('does not re-export stored journal row types', function () {
    const offenders: string[] = [];
    const exportedStored = /export\s+(type\s+|\{[^}]*\b)?IStoredEvent/;
    const anyStored = /\bIStoredEvent\b/;
    for (const file of runtimeSourceFiles()) {
      const text = fs.readFileSync(file, 'utf8');
      const basename = path.basename(file);
      if (exportedStored.test(text) || anyStored.test(text)) {
        offenders.push(`${basename}: IStoredEvent`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('contains no Date.now or new Date in production history sources', function () {
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
