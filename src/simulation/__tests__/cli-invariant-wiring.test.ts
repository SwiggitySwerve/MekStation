/**
 * CLI wiring guard - audit 2026-06-09 E-7 / E-8 regression lock.
 *
 * `scripts/run-simulation.ts` executes `main()` at module load, so these
 * checks source-scan the entrypoint and extracted runner modules instead of
 * importing them into Jest.
 *
 * E-7: both CLI modes must thread `createDefaultInvariantRunner()` into the
 * simulation: swarm mode via the SimulationRunner constructor, preset mode via
 * the BatchRunner.runBatch `invariantRunner` argument.
 *
 * E-8: swarm per-run unit counts must derive from the generated forces
 * (`deriveSwarmUnitCounts`), not configured per-side counts.
 */

import * as fs from 'fs';
import * as path from 'path';

const ENTRYPOINT_PATH = path.resolve(
  process.cwd(),
  'scripts/run-simulation.ts',
);
const PRESET_PATH = path.resolve(
  process.cwd(),
  'scripts/run-simulation-preset.ts',
);
const SWARM_PATH = path.resolve(
  process.cwd(),
  'scripts/run-simulation-swarm.ts',
);

function readSource(filePath: string): string {
  expect(fs.existsSync(filePath)).toBe(true);
  return fs.readFileSync(filePath, 'utf-8');
}

describe('run-simulation CLI wiring guard (audit E-7 / E-8)', () => {
  const entrypointSource = fs.existsSync(ENTRYPOINT_PATH)
    ? fs.readFileSync(ENTRYPOINT_PATH, 'utf-8')
    : '';
  const presetSource = fs.existsSync(PRESET_PATH)
    ? fs.readFileSync(PRESET_PATH, 'utf-8')
    : '';
  const swarmSource = fs.existsSync(SWARM_PATH)
    ? fs.readFileSync(SWARM_PATH, 'utf-8')
    : '';
  const runnerSource = `${presetSource}\n${swarmSource}`;

  it('keeps the entrypoint as a dispatcher to the preset and swarm runners', () => {
    expect(readSource(ENTRYPOINT_PATH)).toMatch(/runPresetMode/);
    expect(entrypointSource).toMatch(/runSwarmMode/);
  });

  it('imports createDefaultInvariantRunner from the shared invariants module', () => {
    expect(runnerSource).toMatch(
      /import\s*\{\s*createDefaultInvariantRunner\s*\}\s*from\s*['"][^'"]*invariants\/createDefaultInvariantRunner['"]/,
    );
  });

  it('calls createDefaultInvariantRunner() at least twice (swarm + preset modes)', () => {
    const calls = runnerSource.match(/createDefaultInvariantRunner\(\)/g) ?? [];
    expect(calls.length).toBeGreaterThanOrEqual(2);
  });

  it('does not define a local createInvariantRunner (the dead E-7 factory shape)', () => {
    expect(runnerSource).not.toMatch(/function\s+createInvariantRunner\s*\(/);
  });

  it('swarm mode passes the invariant runner into the SimulationRunner constructor', () => {
    expect(swarmSource).toMatch(
      /new\s+SimulationRunner\s*\(\s*runSeed\s*,\s*createDefaultInvariantRunner\(\)/,
    );
  });

  it('preset mode passes the invariant runner into runBatch', () => {
    expect(presetSource).toMatch(
      /runBatch\s*\([\s\S]{0,400}?createDefaultInvariantRunner\(\)\s*,?\s*\)/,
    );
  });

  it('swarm mode derives per-run unit counts via deriveSwarmUnitCounts (E-8)', () => {
    expect(swarmSource).toMatch(
      /deriveSwarmUnitCounts\s*\(\s*forceA\s*,\s*forceB\s*\)/,
    );
  });

  it('swarm simConfig.unitCount no longer reads the configured per-side counts (E-8)', () => {
    expect(swarmSource).not.toMatch(
      /player:\s*config\.sideA\.unitCount|opponent:\s*config\.sideB\.unitCount/,
    );
  });
});
