/**
 * Teeth test for `createDefaultInvariantRunner` — audit 2026-06-09 E-7.
 *
 * The 2026-06-09 audit found the simulation CLI defined an invariant
 * factory and NEVER called it: both CLI modes constructed
 * `SimulationRunner` without an invariant runner, so the runner fell
 * back to an EMPTY `InvariantRunner` whose `runAll` always returned
 * `[]` — the CLI's "Total Violations" summary and exit gate were
 * hollow. This suite proves both halves:
 *
 *   1. The HOLE — an empty `InvariantRunner` (the pre-fix default)
 *      reports ZERO violations on a state that is corrupt in all three
 *      checked dimensions.
 *   2. The FIX — `createDefaultInvariantRunner()` flags every one of
 *      those corruptions by invariant name.
 *
 * @see docs/audits/2026-06-09-full-codebase-review.md (E-7)
 */

import {
  IGameState,
  IUnitGameState,
  GamePhase,
  GameStatus,
  GameSide,
  LockState,
  Facing,
  MovementType,
} from '@/types/gameplay';

import { createDefaultInvariantRunner } from '../invariants/createDefaultInvariantRunner';
import { InvariantRunner } from '../invariants/InvariantRunner';

function createMinimalGameState(overrides?: Partial<IGameState>): IGameState {
  return {
    gameId: 'test-game',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.Movement,
    activationIndex: 0,
    units: {},
    turnEvents: [],
    ...overrides,
  };
}

function createMinimalUnit(
  id: string,
  overrides?: Partial<IUnitGameState>,
): IUnitGameState {
  return {
    id,
    side: GameSide.Player,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: { head: 9, centerTorso: 20 },
    structure: { head: 3, centerTorso: 10 },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    ...overrides,
  };
}

/**
 * A state corrupt in all three checked dimensions:
 *   - unit1 + unit2 stacked on the same hex (position uniqueness)
 *   - unit1 with negative heat (heat non-negative)
 *   - unit2 with negative armor (armor bounds)
 */
function createCorruptState(): IGameState {
  return createMinimalGameState({
    units: {
      unit1: createMinimalUnit('unit1', {
        position: { q: 2, r: 3 },
        heat: -5,
      }),
      unit2: createMinimalUnit('unit2', {
        position: { q: 2, r: 3 },
        armor: { head: -1, centerTorso: 20 },
      }),
    },
  });
}

describe('createDefaultInvariantRunner (audit E-7)', () => {
  it('HOLE PROOF: an empty InvariantRunner (pre-fix CLI default) reports zero violations on a corrupt state', () => {
    // This is exactly what `new SimulationRunner(seed)` used before the
    // fix: a fresh InvariantRunner with NO registered checks. The corrupt
    // state sails through — which is why the CLI exit gate never fired.
    const emptyRunner = new InvariantRunner();
    expect(emptyRunner.runAll(createCorruptState())).toHaveLength(0);
  });

  it('flags all three corruptions by invariant name', () => {
    const runner = createDefaultInvariantRunner();
    const violations = runner.runAll(createCorruptState());

    const names = violations.map((v) => v.invariant);
    expect(names).toContain('unit_position_uniqueness');
    expect(names).toContain('heat_non_negative');
    expect(names).toContain('armor_bounds');
    expect(violations).toHaveLength(3);
  });

  it('flags negative structure via armor_bounds', () => {
    const runner = createDefaultInvariantRunner();
    const state = createMinimalGameState({
      units: {
        unit1: createMinimalUnit('unit1', {
          structure: { head: -2, centerTorso: 10 },
        }),
      },
    });

    const violations = runner.runAll(state);
    expect(violations).toHaveLength(1);
    expect(violations[0].invariant).toBe('armor_bounds');
    expect(violations[0].severity).toBe('critical');
  });

  it('reports zero violations on a healthy state (no false positives)', () => {
    const runner = createDefaultInvariantRunner();
    const state = createMinimalGameState({
      units: {
        unit1: createMinimalUnit('unit1', { position: { q: 0, r: 0 } }),
        unit2: createMinimalUnit('unit2', { position: { q: 1, r: 0 } }),
      },
    });

    expect(runner.runAll(state)).toHaveLength(0);
  });

  it('every registered invariant is critical-severity when violated', () => {
    const runner = createDefaultInvariantRunner();
    const violations = runner.runAll(createCorruptState());

    expect(violations.length).toBeGreaterThan(0);
    for (const violation of violations) {
      expect(violation.severity).toBe('critical');
    }
  });

  it('returns a fresh instance per call (no shared registration list)', () => {
    expect(createDefaultInvariantRunner()).not.toBe(
      createDefaultInvariantRunner(),
    );
  });
});
