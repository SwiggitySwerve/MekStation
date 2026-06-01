import type {
  IUnitGameState,
  MovementConversionMode,
  MovementMotiveMode,
} from '@/types/gameplay';

export function isVehicleCrewStunned(
  unit: Pick<IUnitGameState, 'combatState'> | undefined,
): boolean {
  return (
    unit?.combatState?.kind === 'vehicle' &&
    unit.combatState.state.motive.crewStunnedPhases > 0
  );
}

export function normalizedLamConversionMode(
  value: MovementConversionMode | number | undefined,
): 'mek' | 'airmek' | 'fighter' | 'vehicle' | undefined {
  if (typeof value === 'number') {
    if (value === 0) return 'mek';
    if (value === 1) return 'airmek';
    if (value === 2) return 'fighter';
    return undefined;
  }

  switch (value) {
    case 'mek':
    case 'mech':
      return 'mek';
    case 'airmek':
    case 'airmech':
      return 'airmek';
    case 'fighter':
      return 'fighter';
    case 'vehicle':
    case 'tracked':
    case 'wheeled':
      return 'vehicle';
    default:
      return undefined;
  }
}

export function isAirborneVTOLOrWiGEForPhysicalAttack(
  unit: Pick<IUnitGameState, 'combatState'> | undefined,
  movementMode: MovementMotiveMode | undefined,
): boolean {
  if (movementMode !== 'vtol' && movementMode !== 'wige') return false;

  switch (unit?.combatState?.kind) {
    case 'aero':
    case 'proto':
      return (unit.combatState.state.altitude ?? 0) > 0;
    case 'vehicle':
      return (unit.combatState.state.altitude ?? 0) > 0;
    default:
      return false;
  }
}
