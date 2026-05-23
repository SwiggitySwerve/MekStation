import type { IGameUnit, IHexGrid, IUnitGameState } from '@/types/gameplay';

import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { coordToKey } from '@/utils/gameplay/hexMath';

import type {
  IPhysicalAttackElevationContext,
  PhysicalAttackType,
} from './types';

export function physicalAttackUnitHeight(
  unit?: IGameUnit | null,
  fallback = 1,
): number {
  switch (unit?.unitType) {
    case UnitType.INFANTRY:
    case UnitType.BATTLE_ARMOR:
    case UnitType.VEHICLE:
    case UnitType.VTOL:
    case UnitType.SUPPORT_VEHICLE:
      return 0;
    default:
      return fallback;
  }
}

export function buildPhysicalElevationContext(
  attacker: IUnitGameState,
  target: IUnitGameState,
  grid: IHexGrid,
  options: {
    readonly targetUnit?: IGameUnit | null;
    readonly targetHeight?: number;
    readonly targetIsAirborneVTOLOrWiGE?: boolean;
  } = {},
): IPhysicalAttackElevationContext {
  const attackerHexElevation =
    grid.hexes.get(coordToKey(attacker.position))?.elevation ?? 0;
  const targetHexElevation =
    grid.hexes.get(coordToKey(target.position))?.elevation ?? 0;
  const attackerBaseElevation =
    attackerHexElevation + unitAltitudeLevels(attacker);
  const targetBaseElevation = targetHexElevation + unitAltitudeLevels(target);
  const targetHeight =
    options.targetHeight ?? physicalAttackUnitHeight(options.targetUnit);

  return {
    attackerBaseElevation,
    attackerArmElevation: attackerBaseElevation + 1,
    targetBaseElevation,
    targetTopElevation: targetBaseElevation + targetHeight,
    ...(options.targetIsAirborneVTOLOrWiGE !== undefined
      ? {
          targetIsAirborneVTOLOrWiGE: options.targetIsAirborneVTOLOrWiGE,
        }
      : {}),
  };
}

export function physicalElevationRestriction(
  attackType: PhysicalAttackType,
  context?: IPhysicalAttackElevationContext,
): string | null {
  if (!context) return null;

  if (attackType === 'punch') {
    return context.targetBaseElevation > context.attackerArmElevation ||
      context.targetTopElevation < context.attackerArmElevation
      ? 'Target elevation not in range'
      : null;
  }

  if (attackType === 'kick') {
    if (context.targetIsAirborneVTOLOrWiGE) {
      return context.targetBaseElevation - context.attackerBaseElevation !== 0
        ? 'Target elevation not in range'
        : null;
    }
    return context.attackerBaseElevation < context.targetBaseElevation ||
      context.attackerBaseElevation > context.targetTopElevation
      ? 'Target elevation not in range'
      : null;
  }

  if (attackType === 'push') {
    return context.attackerBaseElevation !== context.targetBaseElevation
      ? 'Target elevation not in range'
      : null;
  }

  return null;
}

function unitAltitudeLevels(unit: IUnitGameState): number {
  switch (unit.combatState?.kind) {
    case 'aero':
    case 'proto':
      return Math.max(0, unit.combatState.state.altitude ?? 0);
    default:
      return 0;
  }
}
