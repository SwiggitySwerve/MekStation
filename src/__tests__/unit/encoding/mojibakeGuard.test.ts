/**
 * Mojibake guard (v2.1.0 L0-07).
 *
 * UTF-8 text that was decoded as Windows-1252/Latin-1 and re-encoded shows up
 * as sequences like an a-circumflex followed by a euro sign (an em dash gone
 * wrong), or a capital A-tilde followed by a Latin-1 continuation character.
 * The needles below are built from code points so this file never contains the
 * sequences itself.
 */

import fs from 'node:fs';
import path from 'node:path';

const SRC_ROOT = path.resolve(__dirname, '../../..');
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);

// a-circumflex + euro / a-circumflex + dagger-ish arrow remnants, A-tilde and
// A-circumflex followed by a Latin-1 continuation character.
const MOJIBAKE_PATTERN = new RegExp(
  [
    '\\u00e2\\u20ac', // em/en dash, bullet, quotes, ellipsis
    '\\u00e2\\u2020', // arrows
    '\\u00c3[\\u0080-\\u00bf\\u0152-\\u0178\\u02c6\\u02dc\\u2013-\\u203a\\u20ac\\u2122]', // accented letters
    '\\u00c2[\\u00a0-\\u00bf]', // section sign, middle dot, nbsp ...
  ].join('|'),
);

function listSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listSourceFiles(full, out);
    } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

function read(relativePath: string): string {
  return fs.readFileSync(path.join(SRC_ROOT, relativePath), 'utf8');
}

describe('source text encoding', () => {
  it('has no double-encoded UTF-8 (mojibake) sequences under src/', () => {
    const offenders: string[] = [];
    for (const file of listSourceFiles(SRC_ROOT)) {
      const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
      lines.forEach((line, index) => {
        if (MOJIBAKE_PATTERN.test(line)) {
          offenders.push(
            `${path.relative(SRC_ROOT, file)}:${index + 1}: ${line.trim().slice(0, 80)}`,
          );
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  it('keeps the L0-07 player-facing strings as real UTF-8', () => {
    const quickGame = read(
      'components/quickgame/QuickGameSetupScenarioConfig.tsx',
    );
    expect(quickGame).toContain('Annihilation \u2014 destroy all enemies');
    expect(quickGame).toContain('Elite \u2014 gunnery 2 / piloting 3');

    const helpers = read('components/gameplay/EventLogDisplay.helpers.ts');
    expect(helpers).toContain("'\u2192 structure breach'");
  });
});
