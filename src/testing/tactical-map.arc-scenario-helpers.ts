import type { IApplyAttackInput } from '@/engine/InteractiveSession.actions';
import type { IWeapon } from '@/simulation/ai/types';
import type {
  ICombatRangeHex,
  IGameState,
  IUnitToken,
  IWeaponStatus,
} from '@/types/gameplay';

import {
  Facing,
  FiringArc,
  GameSide,
  TokenUnitType,
  VehicleMotionType,
} from '@/types/gameplay';
import { deriveCombatRangeHexes } from '@/utils/gameplay/combatProjection';

import {
  requireCombatProjection,
  tacticalMapCombatGrid,
  tacticalMapCombatSession,
} from './tactical-map.combat-scenarios';
import {
  createTacticalMapGameStateForTokens,
  createTacticalMapMechToken,
} from './tactical-map.fixture-helpers';

export type TacticalMapCombatGrid = ReturnType<typeof tacticalMapCombatGrid>;

export function tacticalMapAttackerToken(params: {
  readonly name: string;
  readonly designation: string;
  readonly unitType: TokenUnitType;
  readonly vehicleMotionType?: VehicleMotionType;
}): IUnitToken {
  return createTacticalMapMechToken({
    unitId: 'attacker',
    name: params.name,
    designation: params.designation,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    side: GameSide.Player,
    isDestroyed: false,
    isSelected: true,
    isValidTarget: false,
    unitType: params.unitType,
    ...(params.vehicleMotionType
      ? { vehicleMotionType: params.vehicleMotionType }
      : {}),
  });
}

export function tacticalMapTargetToken(params: {
  readonly unitId: string;
  readonly name: string;
  readonly designation: string;
  readonly position: IUnitToken['position'];
}): IUnitToken {
  return createTacticalMapMechToken({
    unitId: params.unitId,
    name: params.name,
    designation: params.designation,
    position: params.position,
    facing: Facing.South,
    isActiveTarget: true,
  });
}

export function tacticalMapCombatStateForTokens(
  tokens: readonly IUnitToken[],
): IGameState {
  return createTacticalMapGameStateForTokens(tokens, {
    unitOverrides: () => ({
      prone: false,
      shutdown: false,
      hasRetreated: false,
      gunnery: 4,
    }),
  });
}

export function tacticalMapWeapon(params: {
  readonly id: string;
  readonly name: string;
  readonly location: string;
  readonly mountingArc?: FiringArc;
  readonly mountingArcs: readonly FiringArc[];
  readonly vehicleMountLocation?: IWeaponStatus['vehicleMountLocation'];
  readonly vehicleIsTurretMounted?: boolean;
  readonly heat?: number;
  readonly damage?: number;
  readonly ranges?: IWeaponStatus['ranges'];
}): IWeaponStatus {
  return {
    id: params.id,
    name: params.name,
    location: params.location,
    mountingArc: params.mountingArc,
    mountingArcs: params.mountingArcs,
    vehicleMountLocation: params.vehicleMountLocation,
    vehicleIsTurretMounted: params.vehicleIsTurretMounted,
    destroyed: false,
    firedThisTurn: false,
    heat: params.heat ?? 3,
    damage: params.damage ?? 5,
    ranges: params.ranges ?? { short: 3, medium: 6, long: 9 },
  } as IWeaponStatus;
}

export function tacticalMapUnitWeapons(
  ...weapons: readonly IWeaponStatus[]
): Record<string, readonly IWeaponStatus[]> {
  return { attacker: weapons };
}

function weaponStatusToCommitWeapon(status: IWeaponStatus): IWeapon {
  return {
    id: status.id,
    name: status.name,
    shortRange: status.ranges.short,
    mediumRange: status.ranges.medium,
    longRange: status.ranges.long,
    extremeRange: status.ranges.extreme,
    damage: typeof status.damage === 'number' ? status.damage : 0,
    heat: status.heat,
    minRange: status.ranges.minimum ?? 0,
    location: status.location,
    ammoPerTon:
      status.ammoRemaining === undefined
        ? -1
        : Math.max(1, status.ammoMax ?? status.ammoRemaining),
    destroyed: status.destroyed,
    mountingArc: status.mountingArc,
    mountingArcs: status.mountingArcs,
    vehicleMountLocation: status.vehicleMountLocation,
    vehicleIsTurretMounted: status.vehicleIsTurretMounted,
    isTorpedo: status.isTorpedo,
  };
}

function tacticalMapWeaponsByUnit(
  unitWeapons: Record<string, readonly IWeaponStatus[]>,
): Map<string, readonly IWeapon[]> {
  return new Map(
    Object.entries(unitWeapons).map(([unitId, weapons]) => [
      unitId,
      weapons.map(weaponStatusToCommitWeapon),
    ]),
  );
}

export function tacticalMapCombatProjection(params: {
  readonly attacker: IUnitToken;
  readonly targetUnitId: string;
  readonly targetHex: IUnitToken['position'];
  readonly grid: TacticalMapCombatGrid;
  readonly tokens: readonly IUnitToken[];
  readonly weapons: readonly IWeaponStatus[];
  readonly combatState: IGameState;
}): ICombatRangeHex {
  return requireCombatProjection(
    deriveCombatRangeHexes({
      attacker: params.attacker,
      targetUnitId: params.targetUnitId,
      hexes: Array.from(params.grid.hexes.values(), (hex) => hex.coord),
      grid: params.grid,
      tokens: params.tokens,
      weapons: params.weapons,
      combatState: params.combatState,
    }).find(
      (projection) =>
        projection.hex.q === params.targetHex.q &&
        projection.hex.r === params.targetHex.r,
    ),
  );
}

export function tacticalMapCommitInput(params: {
  readonly tokens: readonly IUnitToken[];
  readonly combatState: IGameState;
  readonly unitWeapons: Record<string, readonly IWeaponStatus[]>;
  readonly targetId: string;
  readonly weaponIds: readonly string[];
  readonly grid: TacticalMapCombatGrid;
}): IApplyAttackInput {
  return {
    session: tacticalMapCombatSession({
      tokens: params.tokens,
      combatState: params.combatState,
    }),
    weaponsByUnit: tacticalMapWeaponsByUnit(params.unitWeapons),
    attackerId: 'attacker',
    targetId: params.targetId,
    weaponIds: params.weaponIds,
    grid: params.grid,
  };
}
