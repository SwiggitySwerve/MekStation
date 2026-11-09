import type { IUnitGameState } from '@/types/gameplay';

import { resetPerTurnMovementState } from './movement/perTurnMovementState';
import { advanceEmpShutdownTurns } from './shutdownStartup';

/**
 * How a turn-boundary reset writes the fields it clears.
 *
 * - `explicit` is the reducer's shape (`applyTurnStarted`): every cleared field
 *   is written, so a unit that never carried it gains `false`/`0`/`undefined`.
 * - `sparse` is the simulation runner's shape (`resetTurnState`): a field the
 *   unit never carried stays absent.
 *
 * Both shapes exist because normalizing them would change serialized unit
 * state, and so replay digests. `resetPerTurnMovementState` already makes the
 * same trade (`sprintedThisTurn` stays absent for dormant units); this keeps
 * that precedent rather than choosing a winner.
 *
 * `sparse` also leaves `isSpotting`, `spotTargetId` and
 * `isLoadingOrUnloadingCargo` alone, because the runner does not reset them
 * today (MegaMek `Entity.newRound` does; C7 D3-D4). Nothing in the runner sets
 * those fields, so this is dormant; it is pending an owner ruling, not a design
 * choice. When the runner is moved onto the reducer's behaviour, delete that
 * branch.
 */
export type PerTurnResetPresence = 'explicit' | 'sparse';

/**
 * The per-turn unit fields both turn-boundary paths clear, in one place.
 *
 * Callers: the reducer's `applyTurnStarted` (interactive session,
 * `GameEngine.runToCompletion`, multiplayer, P2P and replay) and the runner's
 * `resetTurnState` (swarm, batch, validate-combat).
 *
 * Deliberately not owned here:
 * - `damageThisPhase` for the `sparse` shape: both paths now zero it per phase
 *   (MegaMek `TWGameManager.resetEntityPhase`); the runner does it as each phase
 *   begins (`resetPhaseDamage`) and at its own turn reset. The `explicit` shape
 *   zeroes it too (C7 D8);
 * - `lockState` / `pendingAction`: the interactive lock protocol, reducer only;
 * - persistent state (stuck, posture, shutdown, wounds, retreat, ...).
 *
 * Movement-entry cleanup keeps calling `resetPerTurnMovementState` with
 * `advanceBoosterCounters: false`.
 */
export function resetPerTurnUnitFields(
  unit: IUnitGameState,
  options: { readonly presence: PerTurnResetPresence },
): IUnitGameState {
  const explicit = options.presence === 'explicit';
  return {
    ...resetPerTurnMovementState(unit),
    weaponsFiredThisTurn: [],
    pendingPSRs: [],
    ...(explicit ? { isLoadingOrUnloadingCargo: false } : {}),
    tagDesignated: false,
    externalHeatThisTurn: 0,
    pendingExternalHeat: 0,
    ...(explicit
      ? {
          empInterferenceTurns: decrementEmpInterference(
            unit.empInterferenceTurns ?? 0,
          ),
          empShutdownTurns: advanceEmpShutdownTurns(unit.empShutdownTurns),
          isSpotting: false,
          spotTargetId: undefined,
          // C7 PR3 / D8: a bare TurnStarted (the runner's log has no
          // PhaseChanged) must not leave damage from the last phase of the
          // previous turn behind.
          damageThisPhase: 0,
        }
      : {
          ...(unit.empInterferenceTurns !== undefined
            ? {
                empInterferenceTurns: decrementEmpInterference(
                  unit.empInterferenceTurns,
                ),
              }
            : {}),
          ...(unit.empShutdownTurns !== undefined
            ? {
                empShutdownTurns: advanceEmpShutdownTurns(
                  unit.empShutdownTurns,
                ),
              }
            : {}),
        }),
  };
}

/** MegaMek 48fcb2f64 Entity.newRound: `empInterferenceRounds--`, floored at 0. */
function decrementEmpInterference(remaining: number): number {
  return Math.max(0, Math.trunc(remaining) - 1);
}
