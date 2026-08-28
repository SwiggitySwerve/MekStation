/**
 * Vocabulary guard for the closed six-tag subsystem set (W6 task 2.3).
 *
 * The tag vocabulary lives in TWO runtime homes that must never drift:
 *   - the TS side: `FLOW_SUBSYSTEMS` in `e2e/flows/manifest.ts` (source of
 *     the `FlowSubsystem` literal union the flow registry types against)
 *   - the .mjs side: `allowedSubsystems` in
 *     `scripts/qc/journey-qc-catalog-validator.mjs` (what the journey
 *     catalog validator and the `--subsystem` graph query accept)
 *
 * This guard asserts set equality in both directions, and pins the
 * `@subsystem:<tag>` Playwright tag literals (groups 4/6) as a pure
 * derivation from the same set — so a tag added to one home without the
 * other, or a hand-typed tag literal, fails a PR-lane unit test.
 */
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

import { FLOW_SUBSYSTEMS } from '../../e2e/flows/manifest';
import { SCENARIO_PACK_MANIFEST } from '../../e2e/scenario-packs/manifest';

const repoRoot = process.cwd();
const validatorUrl = pathToFileURL(
  path.join(repoRoot, 'scripts/qc/journey-qc-catalog-validator.mjs'),
).href;

/**
 * Read the .mjs `allowedSubsystems` set through a real Node ESM import —
 * the established scripts/__tests__ pattern for .mjs internals (jest's CJS
 * transform cannot import the module directly).
 */
function readMjsAllowedSubsystems(): string[] {
  const harness = `
import { allowedSubsystems } from ${JSON.stringify(validatorUrl)};
process.stdout.write(JSON.stringify([...allowedSubsystems]));`;
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', harness],
    { encoding: 'utf8' },
  );
  expect(result.status).toBe(0);
  return JSON.parse(result.stdout) as string[];
}

describe('subsystem tag vocabulary', () => {
  it('keeps the .mjs allowedSubsystems set equal to the TS FlowSubsystem union', () => {
    const mjsTags = readMjsAllowedSubsystems();
    // Both directions: sorted-array equality catches additions, removals,
    // and renames on either side.
    expect([...mjsTags].sort()).toEqual([...FLOW_SUBSYSTEMS].sort());
    // The vocabulary is closed at exactly six tags (spec: six-tag enum).
    expect(FLOW_SUBSYSTEMS).toHaveLength(6);
    expect(new Set(mjsTags).size).toBe(mjsTags.length);
  });

  it('pack parity spec tags mirror the manifest', () => {
    // W6 task 7.1: every W4 pack's parity spec must carry exactly the
    // native `@subsystem:<tag>` literals its manifest entry declares —
    // a tag/manifest mismatch fails naming the pack.
    const mismatches: string[] = [];
    for (const entry of SCENARIO_PACK_MANIFEST) {
      const specPath = path.join(
        repoRoot,
        'e2e/scenario-packs',
        `${entry.id}.parity.spec.ts`,
      );
      const spec = fs.readFileSync(specPath, 'utf8');
      for (const tag of entry.subsystems) {
        if (!spec.includes(`'@subsystem:${tag}'`)) {
          mismatches.push(`pack ${entry.id}: missing @subsystem:${tag}`);
        }
      }
      for (const tag of FLOW_SUBSYSTEMS) {
        if (
          !entry.subsystems.includes(tag) &&
          spec.includes(`'@subsystem:${tag}'`)
        ) {
          mismatches.push(`pack ${entry.id}: undeclared @subsystem:${tag}`);
        }
      }
    }
    expect(mismatches).toEqual([]);
  });

  it('derives the @subsystem: tag literals from the shared set', () => {
    const derived = FLOW_SUBSYSTEMS.map((tag) => `@subsystem:${tag}`);
    expect(derived.sort()).toEqual(
      [
        '@subsystem:navigation',
        '@subsystem:combat',
        '@subsystem:economy',
        '@subsystem:maintenance',
        '@subsystem:personnel',
        '@subsystem:experience',
      ].sort(),
    );
  });
});
