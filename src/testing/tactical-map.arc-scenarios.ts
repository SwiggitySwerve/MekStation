import type { IApplyAttackInput } from '@/engine/InteractiveSession.actions';
import type { IWeapon } from '@/simulation/ai/types';
import type { IGameState, IUnitToken, IWeaponStatus } from '@/types/gameplay';

import { VehicleLocation } from '@/types/construction/UnitLocation';
import {
  Facing,
  FiringArc,
  GamePhase,
  GameSide,
  GameStatus,
  MovementType,
  TokenUnitType,
  VehicleMotionType,
} from '@/types/gameplay';
import { TurretType } from '@/types/unit/VehicleInterfaces';
import { deriveCombatRangeHexes } from '@/utils/gameplay/combatProjection';
import { getVehicleWeaponArcs } from '@/utils/gameplay/vehicleFiringArc';

import {
  requireCombatProjection,
  tacticalMapCombatGrid,
  tacticalMapCombatSession,
} from './tactical-map.combat-scenarios';

export const tacticalMapOutOfArcTargetId = 'rear-arc-target';
export const tacticalMapOutOfArcTargetHex = { q: 0, r: 1 } as const;
export const tacticalMapOutOfArcSelectedWeaponIds = ['front-arc-laser'];
export const tacticalMapSponsonArcTargetId = 'left-arc-target';
export const tacticalMapSponsonArcTargetHex = { q: -2, r: 2 } as const;
export const tacticalMapSponsonArcSelectedWeaponIds = ['left-sponson-laser'];
export const tacticalMapLockedTurretTargetId = 'locked-turret-side-target';
export const tacticalMapLockedTurretTargetHex = { q: -2, r: 2 } as const;
export const tacticalMapLockedTurretSelectedWeaponIds = ['locked-turret-ppc'];

const tacticalMapLockedTurretArcs = getVehicleWeaponArcs({
  mountLocation: VehicleLocation.TURRET,
  isTurretMounted: true,
  isSponsonMounted: false,
  turretType: TurretType.SINGLE,
  turretLocked: true,
});

export const tacticalMapOutOfArcTokens: readonly IUnitToken[] = [
  {
    unitId: 'attacker',
    name: 'Shadow Hawk SHD-2H',
    designation: 'SHD',
    position: { q: 0, r: 0 },
    facing: Facing.North,
    side: GameSide.Player,
    isDestroyed: false,
    isSelected: true,
    isValidTarget: false,
    unitType: TokenUnitType.Mech,
  },
  {
    unitId: tacticalMapOutOfArcTargetId,
    name: 'Rear Arc Target',
    designation: 'RAT',
    position: tacticalMapOutOfArcTargetHex,
    facing: Facing.South,
    side: GameSide.Opponent,
    isDestroyed: false,
    isSelected: false,
    isValidTarget: true,
    isActiveTarget: true,
    unitType: TokenUnitType.Mech,
  },
];

export const tacticalMapOutOfArcCombatState: IGameState = {
  gameId: 'tactical-map-e2e',
  status: GameStatus.Active,
  turn: 1,
  phase: GamePhase.WeaponAttack,
  activationIndex: 0,
  turnEvents: [],
  units: Object.fromEntries(
    tacticalMapOutOfArcTokens.map((token) => [
      token.unitId,
      {
        id: token.unitId,
        side: token.side,
        position: token.position,
        facing: token.facing,
        heat: 0,
        movementThisTurn: MovementType.Stationary,
        hexesMovedThisTurn: 0,
        prone: false,
        destroyed: token.isDestroyed,
        shutdown: false,
        hasRetreated: false,
        gunnery: 4,
      },
    ]),
  ) as IGameState['units'],
};

export const tacticalMapSponsonArcTokens: readonly IUnitToken[] = [
  {
    unitId: 'attacker',
    name: 'Vedette Left Sponson',
    designation: 'VDS',
    position: { q: 0, r: 0 },
    facing: Facing.North,
    side: GameSide.Player,
    isDestroyed: false,
    isSelected: true,
    isValidTarget: false,
    unitType: TokenUnitType.Vehicle,
    vehicleMotionType: VehicleMotionType.Tracked,
  },
  {
    unitId: tacticalMapSponsonArcTargetId,
    name: 'Left Arc Target',
    designation: 'LAT',
    position: tacticalMapSponsonArcTargetHex,
    facing: Facing.South,
    side: GameSide.Opponent,
    isDestroyed: false,
    isSelected: false,
    isValidTarget: true,
    isActiveTarget: true,
    unitType: TokenUnitType.Mech,
  },
];

export const tacticalMapSponsonArcCombatState: IGameState = {
  gameId: 'tactical-map-e2e',
  status: GameStatus.Active,
  turn: 1,
  phase: GamePhase.WeaponAttack,
  activationIndex: 0,
  turnEvents: [],
  units: Object.fromEntries(
    tacticalMapSponsonArcTokens.map((token) => [
      token.unitId,
      {
        id: token.unitId,
        side: token.side,
        position: token.position,
        facing: token.facing,
        heat: 0,
        movementThisTurn: MovementType.Stationary,
        hexesMovedThisTurn: 0,
        prone: false,
        destroyed: token.isDestroyed,
        shutdown: false,
        hasRetreated: false,
        gunnery: 4,
      },
    ]),
  ) as IGameState['units'],
};

export const tacticalMapLockedTurretTokens: readonly IUnitToken[] = [
  {
    unitId: 'attacker',
    name: 'Locked Turret Carrier',
    designation: 'LTC',
    position: { q: 0, r: 0 },
    facing: Facing.North,
    side: GameSide.Player,
    isDestroyed: false,
    isSelected: true,
    isValidTarget: false,
    unitType: TokenUnitType.Vehicle,
    vehicleMotionType: VehicleMotionType.Tracked,
  },
  {
    unitId: tacticalMapLockedTurretTargetId,
    name: 'Locked Turret Side Target',
    designation: 'LST',
    position: tacticalMapLockedTurretTargetHex,
    facing: Facing.South,
    side: GameSide.Opponent,
    isDestroyed: false,
    isSelected: false,
    isValidTarget: true,
    isActiveTarget: true,
    unitType: TokenUnitType.Mech,
  },
];

export const tacticalMapLockedTurretCombatState: IGameState = {
  gameId: 'tactical-map-e2e',
  status: GameStatus.Active,
  turn: 1,
  phase: GamePhase.WeaponAttack,
  activationIndex: 0,
  turnEvents: [],
  units: Object.fromEntries(
    tacticalMapLockedTurretTokens.map((token) => [
      token.unitId,
      {
        id: token.unitId,
        side: token.side,
        position: token.position,
        facing: token.facing,
        heat: 0,
        movementThisTurn: MovementType.Stationary,
        hexesMovedThisTurn: 0,
        prone: false,
        destroyed: token.isDestroyed,
        shutdown: false,
        hasRetreated: false,
        gunnery: 4,
      },
    ]),
  ) as IGameState['units'],
};

export const tacticalMapOutOfArcUnitWeapons: Record<
  string,
  readonly IWeaponStatus[]
> = {
  attacker: [
    {
      id: 'front-arc-laser',
      name: 'Front Arc Laser',
      location: 'right_arm',
      mountingArc: FiringArc.Front,
      mountingArcs: [FiringArc.Front],
      destroyed: false,
      firedThisTurn: false,
      heat: 3,
      damage: 5,
      ranges: { short: 3, medium: 6, long: 9 },
    },
  ],
};

export const tacticalMapSponsonArcUnitWeapons: Record<
  string,
  readonly IWeaponStatus[]
> = {
  attacker: [
    {
      id: 'left-sponson-laser',
      name: 'Left Sponson Laser',
      location: 'left_sponson',
      mountingArcs: [FiringArc.Front, FiringArc.Left],
      destroyed: false,
      firedThisTurn: false,
      heat: 3,
      damage: 5,
      ranges: { short: 3, medium: 6, long: 9 },
    },
  ],
};

export const tacticalMapLockedTurretUnitWeapons: Record<
  string,
  readonly IWeaponStatus[]
> = {
  attacker: [
    {
      id: 'locked-turret-ppc',
      name: 'Locked Turret PPC',
      location: 'turret',
      mountingArcs: tacticalMapLockedTurretArcs,
      destroyed: false,
      firedThisTurn: false,
      heat: 10,
      damage: 10,
      ranges: { short: 6, medium: 12, long: 18 },
    },
  ],
};

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
    ammoPerTon:
      status.ammoRemaining === undefined
        ? -1
        : Math.max(1, status.ammoMax ?? status.ammoRemaining),
    destroyed: status.destroyed,
    mountingArc: status.mountingArc,
    mountingArcs: status.mountingArcs,
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

const tacticalMapOutOfArcGrid = tacticalMapCombatGrid();

export const tacticalMapOutOfArcCombatProjection = requireCombatProjection(
  deriveCombatRangeHexes({
    attacker: tacticalMapOutOfArcTokens[0],
    targetUnitId: tacticalMapOutOfArcTargetId,
    hexes: Array.from(
      tacticalMapOutOfArcGrid.hexes.values(),
      (hex) => hex.coord,
    ),
    grid: tacticalMapOutOfArcGrid,
    tokens: tacticalMapOutOfArcTokens,
    weapons: tacticalMapOutOfArcUnitWeapons.attacker,
    combatState: tacticalMapOutOfArcCombatState,
  }).find(
    (projection) =>
      projection.hex.q === tacticalMapOutOfArcTargetHex.q &&
      projection.hex.r === tacticalMapOutOfArcTargetHex.r,
  ),
);

const tacticalMapSponsonArcGrid = tacticalMapCombatGrid();

export const tacticalMapSponsonArcCombatProjection = requireCombatProjection(
  deriveCombatRangeHexes({
    attacker: tacticalMapSponsonArcTokens[0],
    targetUnitId: tacticalMapSponsonArcTargetId,
    hexes: Array.from(
      tacticalMapSponsonArcGrid.hexes.values(),
      (hex) => hex.coord,
    ),
    grid: tacticalMapSponsonArcGrid,
    tokens: tacticalMapSponsonArcTokens,
    weapons: tacticalMapSponsonArcUnitWeapons.attacker,
    combatState: tacticalMapSponsonArcCombatState,
  }).find(
    (projection) =>
      projection.hex.q === tacticalMapSponsonArcTargetHex.q &&
      projection.hex.r === tacticalMapSponsonArcTargetHex.r,
  ),
);

const tacticalMapLockedTurretGrid = tacticalMapCombatGrid();

export const tacticalMapLockedTurretCombatProjection = requireCombatProjection(
  deriveCombatRangeHexes({
    attacker: tacticalMapLockedTurretTokens[0],
    targetUnitId: tacticalMapLockedTurretTargetId,
    hexes: Array.from(
      tacticalMapLockedTurretGrid.hexes.values(),
      (hex) => hex.coord,
    ),
    grid: tacticalMapLockedTurretGrid,
    tokens: tacticalMapLockedTurretTokens,
    weapons: tacticalMapLockedTurretUnitWeapons.attacker,
    combatState: tacticalMapLockedTurretCombatState,
  }).find(
    (projection) =>
      projection.hex.q === tacticalMapLockedTurretTargetHex.q &&
      projection.hex.r === tacticalMapLockedTurretTargetHex.r,
  ),
);

export function tacticalMapOutOfArcCommitInput(): IApplyAttackInput {
  return {
    session: tacticalMapCombatSession({
      tokens: tacticalMapOutOfArcTokens,
      combatState: tacticalMapOutOfArcCombatState,
    }),
    weaponsByUnit: tacticalMapWeaponsByUnit(tacticalMapOutOfArcUnitWeapons),
    attackerId: 'attacker',
    targetId: tacticalMapOutOfArcTargetId,
    weaponIds: tacticalMapOutOfArcSelectedWeaponIds,
    grid: tacticalMapOutOfArcGrid,
  };
}

export function tacticalMapLockedTurretCommitInput(): IApplyAttackInput {
  return {
    session: tacticalMapCombatSession({
      tokens: tacticalMapLockedTurretTokens,
      combatState: tacticalMapLockedTurretCombatState,
    }),
    weaponsByUnit: tacticalMapWeaponsByUnit(tacticalMapLockedTurretUnitWeapons),
    attackerId: 'attacker',
    targetId: tacticalMapLockedTurretTargetId,
    weaponIds: tacticalMapLockedTurretSelectedWeaponIds,
    grid: tacticalMapLockedTurretGrid,
  };
}

export function tacticalMapSponsonArcCommitInput(): IApplyAttackInput {
  return {
    session: tacticalMapCombatSession({
      tokens: tacticalMapSponsonArcTokens,
      combatState: tacticalMapSponsonArcCombatState,
    }),
    weaponsByUnit: tacticalMapWeaponsByUnit(tacticalMapSponsonArcUnitWeapons),
    attackerId: 'attacker',
    targetId: tacticalMapSponsonArcTargetId,
    weaponIds: tacticalMapSponsonArcSelectedWeaponIds,
    grid: tacticalMapSponsonArcGrid,
  };
}
