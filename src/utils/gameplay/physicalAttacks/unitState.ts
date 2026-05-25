import type { IUnitGameState } from '@/types/gameplay';

export function isVehicleCrewStunned(
  unit: Pick<IUnitGameState, 'combatState'> | undefined,
): boolean {
  return (
    unit?.combatState?.kind === 'vehicle' &&
    unit.combatState.state.motive.crewStunnedPhases > 0
  );
}
