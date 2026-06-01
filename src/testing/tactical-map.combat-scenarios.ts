import type { IApplyAttackInput } from '@/engine/InteractiveSession.actions';
import type { IWeapon } from '@/simulation/ai/types';
import type {
  ICombatRangeHex,
  IGameState,
  IGameSession,
  IGameUnit,
  IHexGrid,
  IHexTerrain,
  IUnitGameState,
  IUnitToken,
  IWeaponStatus,
} from '@/types/gameplay';

import { unitStateToToken } from '@/lib/gameplay/unitStateToToken';
import {
  Facing,
  FiringArc,
  GameSide,
  LockState,
  MovementType,
  TerrainType,
  TokenUnitType,
} from '@/types/gameplay';
import { createAerospaceCombatState } from '@/utils/gameplay/aerospace/state';
import { deriveCombatRangeHexes } from '@/utils/gameplay/combatProjection';
import {
  advancePhase,
  createGameSession,
  rollInitiative,
  startGame,
} from '@/utils/gameplay/gameSession';
import { createHexGrid } from '@/utils/gameplay/hexGrid';
import { coordToKey } from '@/utils/gameplay/hexMath';
import { terrainStringFromFeatures } from '@/utils/gameplay/terrainEncoding';

import {
  tacticalMapCombatState,
  tacticalMapHexTerrain,
  tacticalMapOutOfRangeSelectedWeaponIds,
  tacticalMapSelectedWeaponIds,
  tacticalMapTokens,
  tacticalMapUnitWeapons,
} from './tactical-map.fixtures';

const tacticalMapMediumRangeTargetId = 'medium-target';
const tacticalMapMediumRangeTargetHex = { q: 1, r: 2 } as const;
const tacticalMapMinimumRangeTargetId = 'occluded';
const tacticalMapMinimumRangeTargetHex = { q: 0, r: 0 } as const;
const tacticalMapOutOfRangeTargetId = 'medium-target';
const tacticalMapOutOfRangeTargetHex = { q: 1, r: 2 } as const;
export const tacticalMapOutOfAmmoTargetId = tacticalMapOutOfRangeTargetId;
export const tacticalMapOutOfAmmoSelectedWeaponIds = ['dry-ac-5'];
export const tacticalMapOutOfAmmoUnitWeapons: Record<
  string,
  readonly IWeaponStatus[]
> = {
  attacker: [
    {
      id: 'dry-ac-5',
      name: 'AC/5',
      location: 'right_torso',
      mountingArc: FiringArc.Front,
      mountingArcs: [
        FiringArc.Front,
        FiringArc.Left,
        FiringArc.Right,
        FiringArc.Rear,
      ],
      destroyed: false,
      firedThisTurn: false,
      heat: 1,
      damage: 5,
      ranges: { short: 3, medium: 6, long: 9 },
      ammoRemaining: 0,
    },
  ],
};
const tacticalMapBlockedLosTargetId = 'blocked-target';
const tacticalMapBlockedLosTargetHex = { q: 2, r: 0 } as const;
export const tacticalMapAirborneAerospaceMinimumRangeTargetId =
  'airborne-aero-target';
export const tacticalMapAirborneAerospaceMinimumRangeTargetHex = {
  q: 0,
  r: 0,
} as const;
export const tacticalMapAirborneAerospaceMinimumRangeSelectedWeaponIds = [
  'minimum-lrm',
];
export const tacticalMapAirborneAerospaceIndirectSelectedWeaponIds = [
  'minimum-lrm',
];
const tacticalMapAirborneAerospaceTargetState: IUnitGameState = {
  id: tacticalMapAirborneAerospaceMinimumRangeTargetId,
  side: GameSide.Opponent,
  position: tacticalMapAirborneAerospaceMinimumRangeTargetHex,
  facing: Facing.Southwest,
  heat: 0,
  movementThisTurn: MovementType.Stationary,
  hexesMovedThisTurn: 0,
  armor: {},
  structure: {},
  destroyedLocations: [],
  destroyedEquipment: [],
  ammo: {},
  pilotWounds: 0,
  pilotConscious: true,
  destroyed: false,
  lockState: LockState.Pending,
  combatState: {
    kind: 'aero',
    state: createAerospaceCombatState({
      maxSI: 8,
      armorByArc: { nose: 20, leftWing: 15, rightWing: 15, aft: 10 },
      heatSinks: 12,
      fuelPoints: 400,
      safeThrust: 5,
      maxThrust: 8,
      altitude: 3,
      currentVelocity: 5,
      nextVelocity: 5,
      airborneState: 'airborne',
    }),
  },
};

const tacticalMapAirborneAerospaceTargetToken = unitStateToToken(
  tacticalMapAirborneAerospaceTargetState.id,
  tacticalMapAirborneAerospaceTargetState,
  {
    name: 'Seydlitz SYD-21',
    side: GameSide.Opponent,
  },
  {
    isValidTarget: true,
    isActiveTarget: true,
  },
);

export const tacticalMapAirborneAerospaceMinimumRangeTokens: readonly IUnitToken[] =
  [
    ...tacticalMapTokens.filter((token) => token.unitId !== 'occluded'),
    tacticalMapAirborneAerospaceTargetToken,
  ];

export const tacticalMapAirborneAerospaceMinimumRangeCombatState: IGameState = {
  ...tacticalMapCombatState,
  units: {
    ...Object.fromEntries(
      Object.entries(tacticalMapCombatState.units).filter(
        ([unitId]) => unitId !== 'occluded',
      ),
    ),
    [tacticalMapAirborneAerospaceMinimumRangeTargetId]:
      tacticalMapAirborneAerospaceTargetState,
  },
};

export function tacticalMapCombatGrid(): IHexGrid {
  const grid = createHexGrid({ radius: 3 });
  const hexes = new Map(grid.hexes);

  for (const terrain of tacticalMapHexTerrain) {
    const key = coordToKey(terrain.coordinate);
    const hex = hexes.get(key);
    if (!hex) throw new Error(`Missing tactical-map fixture hex ${key}`);
    hexes.set(key, {
      ...hex,
      terrain: terrainStringFromFeatures(terrain.features),
      elevation: terrain.elevation,
    });
  }

  return { ...grid, hexes };
}

function tacticalMapGameUnits(
  tokens: readonly IUnitToken[] = tacticalMapTokens,
): readonly IGameUnit[] {
  return tokens.map((token) => ({
    id: token.unitId,
    name: token.name,
    side: token.side,
    unitRef: token.unitId,
    pilotRef: `${token.unitId}-pilot`,
    gunnery: 4,
    piloting: 5,
  }));
}

export function tacticalMapCombatSession({
  tokens = tacticalMapTokens,
  combatState = tacticalMapCombatState,
}: {
  readonly tokens?: readonly IUnitToken[];
  readonly combatState?: IGameState;
} = {}): IGameSession {
  let session = createGameSession(
    {
      mapRadius: 3,
      turnLimit: 0,
      victoryConditions: ['elimination'],
      optionalRules: [],
    },
    tacticalMapGameUnits(tokens),
  );
  session = startGame(session, tacticalMapTokens[0].side);
  session = rollInitiative(session);
  session = advancePhase(session);
  session = advancePhase(session);

  for (const [unitId, unitState] of Object.entries(combatState.units)) {
    session.currentState.units[unitId] = {
      ...session.currentState.units[unitId],
      ...unitState,
    };
  }
  session = {
    ...session,
    currentState: {
      ...session.currentState,
      ...(combatState.c3State ? { c3State: combatState.c3State } : {}),
    },
  };

  return session;
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
    isTorpedo: status.isTorpedo,
  };
}

export function tacticalMapWeaponsByUnit(): Map<string, readonly IWeapon[]> {
  return new Map(
    Object.entries(tacticalMapUnitWeapons).map(([unitId, weapons]) => [
      unitId,
      weapons.map(weaponStatusToCommitWeapon),
    ]),
  );
}

const tacticalMapOutOfRangeGrid = tacticalMapCombatGrid();
const tacticalMapOutOfRangeAttacker = tacticalMapTokens.find(
  (token) => token.unitId === 'attacker',
);

if (!tacticalMapOutOfRangeAttacker) {
  throw new Error('Missing tactical-map attacker token');
}

export function requireCombatProjection(
  projection: ICombatRangeHex | undefined,
): ICombatRangeHex {
  if (!projection) {
    throw new Error('Expected tactical-map out-of-range combat projection');
  }
  return projection;
}

export function tacticalMapSelectedWeapons(
  weaponIds: readonly string[],
): readonly IWeaponStatus[] {
  return weaponIds.map((weaponId) => {
    const weapon = tacticalMapUnitWeapons.attacker.find(
      (candidate) => candidate.id === weaponId,
    );
    if (!weapon) throw new Error(`Missing tactical-map weapon ${weaponId}`);
    return weapon;
  });
}

export const tacticalMapUnderwaterEnvironmentTargetId = 'underwater-target';
export const tacticalMapUnderwaterEnvironmentSelectedWeaponIds = [
  'medium-laser',
  'lrt-15',
];

export const tacticalMapUnderwaterEnvironmentTokens: readonly IUnitToken[] = [
  {
    unitId: 'attacker',
    name: 'Shadow Hawk SHD-2H',
    designation: 'SHD',
    position: { q: 0, r: 0 },
    facing: Facing.Northeast,
    side: GameSide.Player,
    isSelected: true,
    isValidTarget: false,
    isDestroyed: false,
    unitType: TokenUnitType.Mech,
  },
  {
    unitId: tacticalMapUnderwaterEnvironmentTargetId,
    name: 'Underwater Target',
    designation: 'UWT',
    position: { q: 2, r: 0 },
    facing: Facing.Southwest,
    side: GameSide.Opponent,
    isSelected: false,
    isValidTarget: true,
    isActiveTarget: true,
    isDestroyed: false,
    unitType: TokenUnitType.Mech,
  },
];

export const tacticalMapUnderwaterEnvironmentHexTerrain: readonly IHexTerrain[] =
  [
    {
      coordinate: { q: 0, r: 0 },
      elevation: 0,
      features: [{ type: TerrainType.Water, level: 1 }],
    },
    {
      coordinate: { q: 1, r: 0 },
      elevation: 0,
      features: [{ type: TerrainType.Water, level: 1 }],
    },
    {
      coordinate: { q: 2, r: 0 },
      elevation: 0,
      features: [{ type: TerrainType.Water, level: 2 }],
    },
  ];

export const tacticalMapUnderwaterEnvironmentCombatState: IGameState = {
  ...tacticalMapCombatState,
  units: Object.fromEntries(
    tacticalMapUnderwaterEnvironmentTokens.map((token) => [
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

export const tacticalMapUnderwaterEnvironmentUnitWeapons: typeof tacticalMapUnitWeapons =
  {
    attacker: [
      ...tacticalMapSelectedWeapons(['medium-laser']),
      {
        id: 'lrt-15',
        name: 'LR Torpedo 15',
        location: 'left_torso',
        mountingArc: FiringArc.Front,
        mountingArcs: [
          FiringArc.Front,
          FiringArc.Left,
          FiringArc.Right,
          FiringArc.Rear,
        ],
        destroyed: false,
        firedThisTurn: false,
        heat: 5,
        damage: 9,
        ranges: { short: 7, medium: 14, long: 21 },
        isTorpedo: true,
      },
    ],
  };

export const tacticalMapMediumRangeCombatProjection = requireCombatProjection(
  deriveCombatRangeHexes({
    attacker: tacticalMapOutOfRangeAttacker,
    targetUnitId: tacticalMapMediumRangeTargetId,
    hexes: Array.from(
      tacticalMapOutOfRangeGrid.hexes.values(),
      (hex) => hex.coord,
    ),
    grid: tacticalMapOutOfRangeGrid,
    tokens: tacticalMapTokens,
    weapons: tacticalMapSelectedWeapons(tacticalMapSelectedWeaponIds),
    combatState: tacticalMapCombatState,
  }).find(
    (projection) =>
      projection.hex.q === tacticalMapMediumRangeTargetHex.q &&
      projection.hex.r === tacticalMapMediumRangeTargetHex.r,
  ),
);

export const tacticalMapMinimumRangeCombatProjection = requireCombatProjection(
  deriveCombatRangeHexes({
    attacker: tacticalMapOutOfRangeAttacker,
    targetUnitId: tacticalMapMinimumRangeTargetId,
    hexes: Array.from(
      tacticalMapOutOfRangeGrid.hexes.values(),
      (hex) => hex.coord,
    ),
    grid: tacticalMapOutOfRangeGrid,
    tokens: tacticalMapTokens,
    weapons: tacticalMapSelectedWeapons(tacticalMapSelectedWeaponIds),
    combatState: tacticalMapCombatState,
  }).find(
    (projection) =>
      projection.hex.q === tacticalMapMinimumRangeTargetHex.q &&
      projection.hex.r === tacticalMapMinimumRangeTargetHex.r,
  ),
);

export const tacticalMapOutOfRangeCombatProjection = requireCombatProjection(
  deriveCombatRangeHexes({
    attacker: tacticalMapOutOfRangeAttacker,
    targetUnitId: tacticalMapOutOfRangeTargetId,
    hexes: Array.from(
      tacticalMapOutOfRangeGrid.hexes.values(),
      (hex) => hex.coord,
    ),
    grid: tacticalMapOutOfRangeGrid,
    tokens: tacticalMapTokens,
    weapons: tacticalMapSelectedWeapons(tacticalMapOutOfRangeSelectedWeaponIds),
    combatState: tacticalMapCombatState,
  }).find(
    (projection) =>
      projection.hex.q === tacticalMapOutOfRangeTargetHex.q &&
      projection.hex.r === tacticalMapOutOfRangeTargetHex.r,
  ),
);

export const tacticalMapAirborneAerospaceMinimumRangeCombatProjection =
  requireCombatProjection(
    deriveCombatRangeHexes({
      attacker: tacticalMapOutOfRangeAttacker,
      targetUnitId: tacticalMapAirborneAerospaceMinimumRangeTargetId,
      hexes: Array.from(
        tacticalMapOutOfRangeGrid.hexes.values(),
        (hex) => hex.coord,
      ),
      grid: tacticalMapOutOfRangeGrid,
      tokens: tacticalMapAirborneAerospaceMinimumRangeTokens,
      weapons: tacticalMapSelectedWeapons(
        tacticalMapAirborneAerospaceMinimumRangeSelectedWeaponIds,
      ),
      combatState: tacticalMapAirborneAerospaceMinimumRangeCombatState,
    }).find(
      (projection) =>
        projection.hex.q ===
          tacticalMapAirborneAerospaceMinimumRangeTargetHex.q &&
        projection.hex.r ===
          tacticalMapAirborneAerospaceMinimumRangeTargetHex.r,
    ),
  );

const tacticalMapAirborneAerospaceIndirectWeapons = tacticalMapSelectedWeapons(
  tacticalMapAirborneAerospaceIndirectSelectedWeaponIds,
).map((weapon) => ({ ...weapon, mode: 'Indirect' as const }));

export const tacticalMapAirborneAerospaceIndirectUnitWeapons: typeof tacticalMapUnitWeapons =
  {
    ...tacticalMapUnitWeapons,
    attacker: tacticalMapUnitWeapons.attacker.map((weapon) =>
      tacticalMapAirborneAerospaceIndirectSelectedWeaponIds.includes(weapon.id)
        ? { ...weapon, mode: 'Indirect' as const }
        : weapon,
    ),
  };

export const tacticalMapAirborneAerospaceIndirectCombatProjection =
  requireCombatProjection(
    deriveCombatRangeHexes({
      attacker: tacticalMapOutOfRangeAttacker,
      targetUnitId: tacticalMapAirborneAerospaceMinimumRangeTargetId,
      hexes: Array.from(
        tacticalMapOutOfRangeGrid.hexes.values(),
        (hex) => hex.coord,
      ),
      grid: tacticalMapOutOfRangeGrid,
      tokens: tacticalMapAirborneAerospaceMinimumRangeTokens,
      weapons: tacticalMapAirborneAerospaceIndirectWeapons,
      combatState: tacticalMapAirborneAerospaceMinimumRangeCombatState,
    }).find(
      (projection) =>
        projection.hex.q ===
          tacticalMapAirborneAerospaceMinimumRangeTargetHex.q &&
        projection.hex.r ===
          tacticalMapAirborneAerospaceMinimumRangeTargetHex.r,
    ),
  );

export const tacticalMapBlockedLosCombatProjection = requireCombatProjection(
  deriveCombatRangeHexes({
    attacker: tacticalMapOutOfRangeAttacker,
    targetUnitId: tacticalMapBlockedLosTargetId,
    hexes: Array.from(
      tacticalMapOutOfRangeGrid.hexes.values(),
      (hex) => hex.coord,
    ),
    grid: tacticalMapOutOfRangeGrid,
    tokens: tacticalMapTokens,
    weapons: tacticalMapSelectedWeapons(tacticalMapSelectedWeaponIds),
    combatState: tacticalMapCombatState,
  }).find(
    (projection) =>
      projection.hex.q === tacticalMapBlockedLosTargetHex.q &&
      projection.hex.r === tacticalMapBlockedLosTargetHex.r,
  ),
);

export function tacticalMapMediumRangeCommitInput(): IApplyAttackInput {
  return {
    session: tacticalMapCombatSession(),
    weaponsByUnit: tacticalMapWeaponsByUnit(),
    attackerId: 'attacker',
    targetId: tacticalMapMediumRangeTargetId,
    weaponIds: tacticalMapSelectedWeaponIds,
    grid: tacticalMapOutOfRangeGrid,
  };
}

export function tacticalMapBlockedLosCommitInput(): IApplyAttackInput {
  return {
    session: tacticalMapCombatSession(),
    weaponsByUnit: tacticalMapWeaponsByUnit(),
    attackerId: 'attacker',
    targetId: tacticalMapBlockedLosTargetId,
    weaponIds: tacticalMapSelectedWeaponIds,
    grid: tacticalMapOutOfRangeGrid,
  };
}

export function tacticalMapAirborneAerospaceMinimumRangeCommitInput(): IApplyAttackInput {
  return {
    session: tacticalMapCombatSession({
      tokens: tacticalMapAirborneAerospaceMinimumRangeTokens,
      combatState: tacticalMapAirborneAerospaceMinimumRangeCombatState,
    }),
    weaponsByUnit: tacticalMapWeaponsByUnit(),
    attackerId: 'attacker',
    targetId: tacticalMapAirborneAerospaceMinimumRangeTargetId,
    weaponIds: tacticalMapAirborneAerospaceMinimumRangeSelectedWeaponIds,
    grid: tacticalMapOutOfRangeGrid,
  };
}

export function tacticalMapAirborneAerospaceIndirectCommitInput(): IApplyAttackInput {
  return {
    session: tacticalMapCombatSession({
      tokens: tacticalMapAirborneAerospaceMinimumRangeTokens,
      combatState: tacticalMapAirborneAerospaceMinimumRangeCombatState,
    }),
    weaponsByUnit: tacticalMapWeaponsByUnit(),
    attackerId: 'attacker',
    targetId: tacticalMapAirborneAerospaceMinimumRangeTargetId,
    weaponIds: tacticalMapAirborneAerospaceIndirectSelectedWeaponIds,
    weaponModesByWeaponId: { 'minimum-lrm': 'Indirect' },
    grid: tacticalMapOutOfRangeGrid,
  };
}

export function tacticalMapMinimumRangeCommitInput(): IApplyAttackInput {
  return {
    session: tacticalMapCombatSession(),
    weaponsByUnit: tacticalMapWeaponsByUnit(),
    attackerId: 'attacker',
    targetId: tacticalMapMinimumRangeTargetId,
    weaponIds: tacticalMapSelectedWeaponIds,
    grid: tacticalMapOutOfRangeGrid,
  };
}

export function tacticalMapOutOfRangeCommitInput(): IApplyAttackInput {
  return {
    session: tacticalMapCombatSession(),
    weaponsByUnit: tacticalMapWeaponsByUnit(),
    attackerId: 'attacker',
    targetId: tacticalMapOutOfRangeTargetId,
    weaponIds: tacticalMapOutOfRangeSelectedWeaponIds,
    grid: tacticalMapOutOfRangeGrid,
  };
}
