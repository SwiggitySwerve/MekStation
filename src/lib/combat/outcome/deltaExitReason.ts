import type {
  ICombatOutcome,
  IUnitCombatDelta,
} from '@/types/combat/CombatOutcome';
import type { UnitExitReason } from '@/utils/gameplay/unitOperability';

import { GameEventType } from '@/types/gameplay/GameSessionInterfaces';

/**
 * How a unit left the battle, for any stored outcome.
 *
 * 1. `delta.exitReason`, when the outcome carries it.
 * 2. Otherwise the first exit event for the unit in `report.log` (the full
 *    session log every outcome persists). A `UnitDestroyed` that comes
 *    first wins and means no exit, matching the reducer's once-only latch.
 * 3. Otherwise null: the unit stayed, or the log is empty.
 */
export function readDeltaExitReason(
  outcome: Pick<ICombatOutcome, 'report'>,
  delta: IUnitCombatDelta,
): UnitExitReason | null {
  if (delta.exitReason !== undefined) return delta.exitReason;
  for (const event of outcome.report.log) {
    const unitId = (event.payload as { readonly unitId?: unknown } | null)
      ?.unitId;
    if (unitId !== delta.unitId) continue;
    switch (event.type) {
      case GameEventType.UnitDestroyed:
        return null;
      case GameEventType.UnitEjected:
        return 'ejected';
      case GameEventType.UnitRetreated:
        return 'retreated';
      default:
        break;
    }
  }
  return null;
}

/**
 * Salvage eligibility of an enemy unit once its exit is known. MekHQ salvages
 * enemy graveyard wrecks, which include units abandoned by ejection
 * (ResolveScenarioTracker.java:658-680; MegaMek Game.java:1334-1344), and
 * never salvages an enemy that retreated (ResolveScenarioTracker.java:568-608
 * handles only the player's side). A unit that stayed keeps the caller's own
 * rule, `stayedEligible`.
 */
export function isSalvageEligibleAfterExit(
  exitReason: UnitExitReason | null,
  stayedEligible: boolean,
): boolean {
  switch (exitReason) {
    case 'ejected':
      return true;
    case 'retreated':
      return false;
    case null:
      return stayedEligible;
    default: {
      const _exhaustive: never = exitReason;
      return _exhaustive;
    }
  }
}
