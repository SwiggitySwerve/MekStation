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

/**
 * Where a unit stands relative to the battle. `exited` keeps `destroyed`
 * because nothing gates a damage event on an exited unit, so eject then
 * destroyed leaves both flags set; the stored facts are not collapsed.
 */
export type UnitStanding =
  | { readonly kind: 'onField' }
  | {
      readonly kind: 'exited';
      readonly reason: UnitExitReason;
      readonly destroyed: boolean;
    }
  | { readonly kind: 'destroyed' };

/**
 * The lifecycle flags as one read. Only the exit state is a union. Shutdown,
 * consciousness and the declared retreat or withdrawal are independent of it
 * and of each other, so they stay separate booleans and no precedence is
 * imposed between them. Computed from the stored flags, never stored.
 * `empShutdownTurns` is deliberately not part of it; the heat-startup gate
 * (`shutdownStartup.ts`) is its reader.
 */
export interface IUnitLifecycle {
  readonly standing: UnitStanding;
  /** `pilotConscious !== false`: a missing flag reads as conscious. */
  readonly crewConscious: boolean;
  readonly shutdown: boolean;
  readonly retreating: boolean;
  readonly withdrawing: boolean;
}

export function getUnitLifecycle(unit: IUnitGameState): IUnitLifecycle {
  // The exit reason comes from getUnitExitReason, which already ranks
  // ejected above retreated.
  const reason = getUnitExitReason(unit);
  const standing: UnitStanding =
    reason !== null
      ? { kind: 'exited', reason, destroyed: Boolean(unit.destroyed) }
      : unit.destroyed
        ? { kind: 'destroyed' }
        : { kind: 'onField' };
  return {
    standing,
    crewConscious: unit.pilotConscious !== false,
    shutdown: Boolean(unit.shutdown),
    retreating: Boolean(unit.isRetreating),
    withdrawing: Boolean(unit.isWithdrawing),
  };
}

export function getUnitOperability(unit: IUnitGameState): IUnitOperability {
  const { standing, crewConscious, shutdown } = getUnitLifecycle(unit);
  const onField = standing.kind === 'onField';
  const crewActive = onField && crewConscious;
  return {
    exitReason: standing.kind === 'exited' ? standing.reason : null,
    onField,
    crewActive,
    canAct: crewActive && !shutdown,
  };
}
