/**
 * Replay/upcast dependency boundary (replay-safety PR 12).
 *
 * Static proof that NO runtime module in `src/lib/events/replay/`
 * (packs, registry kernel, composition, provenance, adapters,
 * fingerprint) can draw randomness, read a clock, reach the network, or
 * dispatch side effects:
 *
 * - forbidden-token scan over every non-test source file (Math.random,
 *   Date.now, new Date(), performance.now, fetch, XMLHttpRequest,
 *   WebSocket, timers, getRandomValues);
 * - runtime-import allowlist: `zod`, `js-sha256` (pure hashing), pure
 *   `@/types/` modules, replay-local `./` modules, and the pure journal
 *   canonicalizer. `import type` is erased and exempt.
 *
 * Why source-level: the replay surface must stay statically auditable -
 * a dependency smuggled behind an indirection would still surface here
 * as a new import specifier, which fails the allowlist.
 *
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/event-store/spec.md
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const REPLAY_DIR = 'src/lib/events/replay';

const FORBIDDEN_TOKENS: readonly RegExp[] = [
  /Math\.random/,
  /Date\.now/,
  /new Date\(/,
  /performance\.now/,
  /\bfetch\s*\(/,
  /XMLHttpRequest/,
  /WebSocket/,
  /setTimeout\s*\(/,
  /setInterval\s*\(/,
  /getRandomValues/,
  /\bimport\s*\(/,
  /\brequire\s*\(/,
];

const ALLOWED_RUNTIME_SPECIFIERS: readonly (string | RegExp)[] = [
  'zod',
  'js-sha256',
  '../journal/EventJournalCanonicalizer',
  /^@\/types\//,
  /^\.\//,
];

const isAllowed = (specifier: string): boolean =>
  ALLOWED_RUNTIME_SPECIFIERS.some((rule) =>
    typeof rule === 'string' ? rule === specifier : rule.test(specifier),
  );

const runtimeSourceFiles = (): readonly string[] => {
  const files: string[] = [];
  // Recursive so a runtime module added in a future subdirectory cannot
  // silently escape the boundary; test/fixture trees stay excluded.
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== '__tests__' && entry.name !== '__fixtures__')
          walk(full);
      } else if (entry.name.endsWith('.ts')) {
        files.push(full);
      }
    }
  };
  walk(path.join(process.cwd(), REPLAY_DIR));
  return files;
};

describe('replay dependency boundary', () => {
  it('scans a non-empty runtime surface', () => {
    expect(runtimeSourceFiles().length).toBeGreaterThanOrEqual(12);
  });

  it('contains no clock, RNG, network, or timer tokens', () => {
    const offenders: string[] = [];
    for (const file of runtimeSourceFiles()) {
      const text = fs.readFileSync(file, 'utf8');
      for (const token of FORBIDDEN_TOKENS) {
        if (token.test(text))
          offenders.push(`${path.basename(file)}: ${String(token)}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('imports only allowlisted pure modules at runtime', () => {
    const offenders: string[] = [];
    for (const file of runtimeSourceFiles()) {
      const text = fs.readFileSync(file, 'utf8');
      const imports = Array.from(
        text.matchAll(/^import\s+(type\s+)?[\s\S]*?from\s+['"]([^'"]+)['"]/gm),
      );
      for (const match of imports) {
        const isTypeOnly = Boolean(match[1]);
        const specifier = match[2] ?? '';
        if (isTypeOnly) continue;
        if (!isAllowed(specifier))
          offenders.push(`${path.basename(file)}: ${specifier}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
