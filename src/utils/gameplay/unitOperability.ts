import type { IUnitGameState } from '@/types/gameplay';

/**
 * How a unit left the battle without being destroyed. MegaMek removes an
 * ejected unit as a salvageable wreck (`REMOVE_EJECTED`) and a retreated
 * unit with `REMOVE_IN_RETREAT`; destruction is tracked by `destroyed`.
 */
export type UnitExitReason = 'ejected' | 'retreated';

/**
 * One read of a unit's operability flags. The call sites differ on purpose,
 * so each picks the level it means:
 * - `onField`: still in the fight (not destroyed, retreated or ejected).
 *   Targeting and side-survival checks use this.
 * - `crewActive`: on the field with a pilot who is not unconscious.
 * - `canAct`: crew active and the unit is not shut down. Action queues use this.
 */
export interface IUnitOperability {
  readonly exitReason: UnitExitReason | null;
  readonly onField: boolean;
  readonly crewActive: boolean;
  readonly canAct: boolean;
}

export function getUnitExitReason(
  unit: Pick<IUnitGameState, 'hasEjected' | 'hasRetreated'>,
): UnitExitReason | null {
  if (unit.hasEjected === true) return 'ejected';
  if (unit.hasRetreated === true) return 'retreated';
  return null;
}

export function getUnitOperability(unit: IUnitGameState): IUnitOperability {
  const exitReason = getUnitExitReason(unit);
  const onField = !unit.destroyed && exitReason === null;
  const crewActive = onField && unit.pilotConscious !== false;
  return {
    exitReason,
    onField,
    crewActive,
    canAct: crewActive && !unit.shutdown,
  };
}
