import type { IUnitGameState, MovementConversionMode } from '@/types/gameplay';

const LAM_CONVERSION_MODE_BY_NUMBER = {
  0: 'mek',
  1: 'airmek',
  2: 'fighter',
} as const;

const LAM_CONVERSION_MODE_BY_STRING = {
  mek: 'mek',
  mech: 'mek',
  airmek: 'airmek',
  airmech: 'airmek',
  fighter: 'fighter',
  vehicle: 'vehicle',
  tracked: 'vehicle',
  wheeled: 'vehicle',
} as const;

export function isVehicleCrewStunned(
  unit: Pick<IUnitGameState, 'combatState'> | undefined,
): boolean {
  return (
    unit?.combatState?.kind === 'vehicle' &&
    unit.combatState.state.motive.crewStunnedPhases > 0
  );
}

export function normalizedLamConversionMode(
  value: MovementConversionMode | string | number | undefined,
): 'mek' | 'airmek' | 'fighter' | 'vehicle' | undefined {
  if (typeof value === 'number') {
    return LAM_CONVERSION_MODE_BY_NUMBER[
      value as keyof typeof LAM_CONVERSION_MODE_BY_NUMBER
    ];
  }

  return LAM_CONVERSION_MODE_BY_STRING[
    value as keyof typeof LAM_CONVERSION_MODE_BY_STRING
  ];
}

export function isAirborneVTOLOrWiGEForPhysicalAttack(
  unit: Pick<IUnitGameState, 'combatState'> | undefined,
  movementMode: string | undefined,
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
