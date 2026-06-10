/**
 * Default invariant runner factory.
 *
 * Builds the canonical `InvariantRunner` used by the simulation CLI
 * (`scripts/run-simulation.ts`) in BOTH operating modes (preset and
 * swarm). Registers the three core per-turn state invariants:
 *
 *   - `unit_position_uniqueness` — no two live units share a hex
 *   - `heat_non_negative`        — heat never drops below zero
 *   - `armor_bounds`             — armor/structure never go negative
 *
 * Why this lives in `src/` and not the script: audit 2026-06-09 finding
 * E-7 found the factory defined inline in `scripts/run-simulation.ts`
 * and NEVER called — both CLI modes constructed `SimulationRunner`
 * without it, so the runner defaulted to an EMPTY `InvariantRunner`,
 * `runAll` always returned `[]`, and the CLI's "Total Violations"
 * summary + violation exit gate were hollow. Moving the factory here
 * makes the registration set unit-testable and gives the CLI a single
 * import to wire into both modes.
 *
 * @see docs/audits/2026-06-09-full-codebase-review.md (E-7)
 */

import {
  checkArmorBounds,
  checkHeatNonNegative,
  checkUnitPositionUniqueness,
} from './checkers';
import { InvariantRunner } from './InvariantRunner';

/**
 * Create an `InvariantRunner` with the three core state invariants
 * registered. Each call returns a fresh instance (the runner holds a
 * mutable registration list, so sharing across unrelated callers is
 * avoided by construction).
 */
export function createDefaultInvariantRunner(): InvariantRunner {
  const runner = new InvariantRunner();
  runner.register({
    name: 'unit_position_uniqueness',
    description: 'Each hex can only have one unit',
    severity: 'critical',
    check: checkUnitPositionUniqueness,
  });
  runner.register({
    name: 'heat_non_negative',
    description: 'Heat cannot be negative',
    severity: 'critical',
    check: checkHeatNonNegative,
  });
  runner.register({
    name: 'armor_bounds',
    description: 'Armor/structure cannot be negative',
    severity: 'critical',
    check: checkArmorBounds,
  });
  return runner;
}
