/**
 * CLI wiring guard — audit 2026-06-09 E-7 / E-8 regression lock.
 *
 * `scripts/run-simulation.ts` executes `main()` at module load, so it
 * cannot be imported by Jest without side effects. Following the
 * source-scan precedent of `no-worker-threads.test.ts`, this suite
 * asserts the WIRING contracts directly against the script source:
 *
 *   E-7: both CLI modes must thread `createDefaultInvariantRunner()`
 *        into the simulation — swarm mode via the SimulationRunner
 *        constructor, preset mode via the BatchRunner.runBatch
 *        `invariantRunner` argument. The audit found the pre-fix script
 *        defined a local factory and NEVER called it, leaving the
 *        "Total Violations" exit gate permanently at 0.
 *
 *   E-8: the swarm per-run unit counts must derive from the ACTUAL
 *        generated forces (`deriveSwarmUnitCounts`), not the configured
 *        per-side counts, so participants[] / hydration / bvTotal stay
 *        1:1 with fielded units on the count+1 retry path.
 *
 * Behavioral teeth live in `defaultInvariantRunner.test.ts` (the
 * registered checkers fire on corrupt state), `simulationRunner.test.ts`
 * (BatchRunner threads an injected runner into results), and
 * `runner/__tests__/swarmUnitCounts.test.ts` (derivation follows the
 * PT-010 retry). This scan pins the script-side call sites those suites
 * cannot reach.
 *
 * @see docs/audits/2026-06-09-full-codebase-review.md (E-7, E-8)
 */

import * as fs from 'fs';
import * as path from 'path';

const SCRIPT_PATH = path.resolve(process.cwd(), 'scripts/run-simulation.ts');

function readScriptSource(): string {
  // The script is a first-class part of the simulation surface; if it
  // moves, this guard must move with it — fail loudly instead of
  // skipping so the enforcement hole cannot silently reopen.
  expect(fs.existsSync(SCRIPT_PATH)).toBe(true);
  return fs.readFileSync(SCRIPT_PATH, 'utf-8');
}

describe('run-simulation CLI wiring guard (audit E-7 / E-8)', () => {
  const source = fs.existsSync(SCRIPT_PATH)
    ? fs.readFileSync(SCRIPT_PATH, 'utf-8')
    : '';

  it('imports createDefaultInvariantRunner from the shared invariants module', () => {
    expect(readScriptSource()).toMatch(
      /import\s*\{\s*createDefaultInvariantRunner\s*\}\s*from\s*['"][^'"]*invariants\/createDefaultInvariantRunner['"]/,
    );
  });

  it('calls createDefaultInvariantRunner() at least twice (swarm + preset modes)', () => {
    const calls = source.match(/createDefaultInvariantRunner\(\)/g) ?? [];
    expect(calls.length).toBeGreaterThanOrEqual(2);
  });

  it('does not define a local createInvariantRunner (the dead E-7 factory shape)', () => {
    // The pre-fix bug: a locally-defined factory with zero call sites.
    // The factory now lives in src/simulation/invariants/ — a local
    // redefinition would shadow the shared one and risk dead wiring again.
    expect(source).not.toMatch(/function\s+createInvariantRunner\s*\(/);
  });

  it('swarm mode passes the invariant runner into the SimulationRunner constructor', () => {
    // The swarm-mode construction must carry createDefaultInvariantRunner()
    // as the second positional argument (seed first).
    expect(source).toMatch(
      /new\s+SimulationRunner\s*\(\s*runSeed\s*,\s*createDefaultInvariantRunner\(\)/,
    );
  });

  it('preset mode passes the invariant runner into runBatch', () => {
    // runBatch(count, config, onProgress, participants, invariantRunner) —
    // the 5th argument must be the default invariant runner.
    expect(source).toMatch(
      /runBatch\s*\([\s\S]{0,400}?createDefaultInvariantRunner\(\)\s*,?\s*\)/,
    );
  });

  it('swarm mode derives per-run unit counts via deriveSwarmUnitCounts (E-8)', () => {
    expect(source).toMatch(
      /deriveSwarmUnitCounts\s*\(\s*forceA\s*,\s*forceB\s*\)/,
    );
  });

  it('swarm simConfig.unitCount no longer reads the configured per-side counts (E-8)', () => {
    // The phantom-participant bug shape: `player: config.sideA.unitCount`
    // inside the ISimulationConfig literal. The configured counts remain
    // legitimate inputs to force generation (`count:`) and console
    // logging — only the unitCount-literal usage is the bug.
    expect(source).not.toMatch(
      /player:\s*config\.sideA\.unitCount|opponent:\s*config\.sideB\.unitCount/,
    );
  });
});
