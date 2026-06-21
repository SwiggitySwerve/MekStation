import type { IFullUnit } from '@/services/units/CanonicalUnitService';
import type { IWeapon } from '@/simulation/ai/types';
import type {
  IGameSession,
  IGameUnit,
  IHex,
  IHexGrid,
  IUnitToken,
  IWeaponStatus,
} from '@/types/gameplay';

import {
  buildWeaponLookupFromCatalogFiles,
  hydrateAIWeaponsFromFullUnit,
} from '@/simulation/runner/UnitHydration';
import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import { VehicleLocation } from '@/types/construction/UnitLocation';
import {
  Facing,
  FiringArc,
  GameEventType,
  GameSide,
  MovementType,
  RangeBracket,
  TerrainType,
  TokenUnitType,
  type IAttackDeclaredPayload,
  type IAttackInvalidPayload,
  type IIndirectFireNarcOverridePayload,
} from '@/types/gameplay';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { WEAPON_CATALOG_FILES } from '@/utils/construction/equipmentBVCatalogData';
import { createAerospaceCombatState } from '@/utils/gameplay/aerospace/state';
import {
  addC3Network,
  createC3MasterSlaveNetwork,
  createC3Unit,
  createEmptyC3State,
} from '@/utils/gameplay/c3Network';
import { deriveCombatRangeHexes } from '@/utils/gameplay/combatProjection';
import {
  advancePhase,
  createGameSession,
  rollInitiative,
  startGame,
} from '@/utils/gameplay/gameSession';
import { resolveAttack } from '@/utils/gameplay/gameSessionAttackResolution';
import { buildDefaultComponentDamageState } from '@/utils/gameplay/gameSessionAttackResolutionHelpers';
import {
  HULL_DOWN_FRONT_WEAPON_BLOCKED_REASON,
  HULL_DOWN_LEG_WEAPON_BLOCKED_REASON,
} from '@/utils/gameplay/hullDownRestrictions';
import { isSemiGuidedLRM } from '@/utils/gameplay/specialWeaponMechanics';
import { terrainStringFromFeatures } from '@/utils/gameplay/terrainEncoding';
import {
  buildWeaponAttackAttackerToHitState,
  buildWeaponAttackTargetToHitState,
  calculateToHit,
} from '@/utils/gameplay/toHit';

import { applyInteractiveSessionAttack } from '../InteractiveSession.actions';

type EcmAwareTestUnitState = IGameSession['currentState']['units'][string] & {
  readonly ecmProtected?: boolean;
};

function makeHex(
  q: number,
  r: number,
  terrain: string = TerrainType.Clear,
  elevation: number = 0,
): IHex {
  return { coord: { q, r }, occupantId: null, terrain, elevation };
}

function makeEncodedBlockerGrid(): IHexGrid {
  const hexes = new Map<string, IHex>();
  for (let q = -2; q <= 3; q += 1) {
    for (let r = -2; r <= 3; r += 1) {
      hexes.set(`${q},${r}`, makeHex(q, r));
    }
  }

  hexes.set(
    '1,0',
    makeHex(
      1,
      0,
      terrainStringFromFeatures([
        { type: TerrainType.LightWoods, level: 1 },
        { type: TerrainType.Building, level: 2 },
      ]),
    ),
  );

  return { config: { radius: 3 }, hexes };
}

function makeLowBuildingGrid(): IHexGrid {
  const hexes = new Map<string, IHex>();
  for (let q = -2; q <= 3; q += 1) {
    for (let r = -2; r <= 3; r += 1) {
      hexes.set(`${q},${r}`, makeHex(q, r));
    }
  }

  hexes.set(
    '1,0',
    makeHex(
      1,
      0,
      terrainStringFromFeatures([{ type: TerrainType.Building, level: 1 }]),
    ),
  );

  return { config: { radius: 3 }, hexes };
}

function makeTargetAdjacentElevationCoverGrid(): IHexGrid {
  const hexes = new Map<string, IHex>();
  for (let q = -2; q <= 3; q += 1) {
    for (let r = -2; r <= 3; r += 1) {
      hexes.set(`${q},${r}`, makeHex(q, r));
    }
  }

  hexes.set('1,0', makeHex(1, 0, TerrainType.Clear, 1));
  return { config: { radius: 3 }, hexes };
}

function makeElevationBlockerGrid(): IHexGrid {
  const hexes = new Map<string, IHex>();
  for (let q = -2; q <= 3; q += 1) {
    for (let r = -2; r <= 3; r += 1) {
      hexes.set(`${q},${r}`, makeHex(q, r));
    }
  }

  hexes.set('1,0', makeHex(1, 0, TerrainType.Clear, 2));
  return { config: { radius: 3 }, hexes };
}

function makeSingleHeavyWoodsGrid(): IHexGrid {
  const hexes = new Map<string, IHex>();
  for (let q = -2; q <= 3; q += 1) {
    for (let r = -2; r <= 3; r += 1) {
      hexes.set(`${q},${r}`, makeHex(q, r));
    }
  }

  hexes.set('1,0', makeHex(1, 0, TerrainType.HeavyWoods));
  return { config: { radius: 3 }, hexes };
}

function makeLightSmokeGrid(): IHexGrid {
  const hexes = new Map<string, IHex>();
  for (let q = -2; q <= 3; q += 1) {
    for (let r = -2; r <= 3; r += 1) {
      hexes.set(`${q},${r}`, makeHex(q, r));
    }
  }

  hexes.set(
    '1,0',
    makeHex(
      1,
      0,
      terrainStringFromFeatures([{ type: TerrainType.Smoke, level: 1 }]),
    ),
  );
  return { config: { radius: 3 }, hexes };
}

function makeSmokeAndLightWoodsGrid(): IHexGrid {
  const hexes = new Map<string, IHex>();
  for (let q = -2; q <= 3; q += 1) {
    for (let r = -2; r <= 3; r += 1) {
      hexes.set(`${q},${r}`, makeHex(q, r));
    }
  }

  hexes.set(
    '1,0',
    makeHex(
      1,
      0,
      terrainStringFromFeatures([
        { type: TerrainType.Smoke, level: 1 },
        { type: TerrainType.LightWoods, level: 1 },
      ]),
    ),
  );
  return { config: { radius: 3 }, hexes };
}

function makeTargetSmokeAndLightWoodsGrid(): IHexGrid {
  const hexes = new Map<string, IHex>();
  for (let q = -2; q <= 3; q += 1) {
    for (let r = -2; r <= 3; r += 1) {
      hexes.set(`${q},${r}`, makeHex(q, r));
    }
  }

  hexes.set(
    '2,0',
    makeHex(
      2,
      0,
      terrainStringFromFeatures([
        { type: TerrainType.Smoke, level: 1 },
        { type: TerrainType.LightWoods, level: 1 },
      ]),
    ),
  );
  return { config: { radius: 3 }, hexes };
}

function makeTargetDepthOneWaterGrid(): IHexGrid {
  const hexes = new Map<string, IHex>();
  for (let q = -2; q <= 3; q += 1) {
    for (let r = -2; r <= 3; r += 1) {
      hexes.set(`${q},${r}`, makeHex(q, r));
    }
  }

  hexes.set(
    '2,0',
    makeHex(
      2,
      0,
      terrainStringFromFeatures([{ type: TerrainType.Water, level: 1 }]),
    ),
  );
  return { config: { radius: 3 }, hexes };
}

function makeTargetDepthTwoWaterGrid(): IHexGrid {
  const hexes = new Map<string, IHex>();
  for (let q = -2; q <= 3; q += 1) {
    for (let r = -2; r <= 3; r += 1) {
      hexes.set(`${q},${r}`, makeHex(q, r));
    }
  }

  hexes.set(
    '2,0',
    makeHex(
      2,
      0,
      terrainStringFromFeatures([{ type: TerrainType.Water, level: 2 }]),
    ),
  );
  return { config: { radius: 3 }, hexes };
}

function makeContinuousWaterAttackGrid(): IHexGrid {
  const grid = makeTargetDepthTwoWaterGrid();
  grid.hexes.set(
    '0,0',
    makeHex(
      0,
      0,
      terrainStringFromFeatures([{ type: TerrainType.Water, level: 1 }]),
    ),
  );
  grid.hexes.set(
    '1,0',
    makeHex(
      1,
      0,
      terrainStringFromFeatures([{ type: TerrainType.Water, level: 1 }]),
    ),
  );
  return grid;
}

function makeTorpedoPathBreakGrid(): IHexGrid {
  const grid = makeContinuousWaterAttackGrid();
  grid.hexes.set('1,0', makeHex(1, 0));
  return grid;
}

function makeIndirectFireGrid(): IHexGrid {
  const hexes = new Map<string, IHex>();
  for (let q = -2; q <= 8; q += 1) {
    for (let r = -2; r <= 3; r += 1) {
      hexes.set(`${q},${r}`, makeHex(q, r));
    }
  }

  hexes.set('2,0', makeHex(2, 0, TerrainType.HeavyWoods));
  hexes.set('3,0', makeHex(3, 0, TerrainType.LightWoods));
  return { config: { radius: 8 }, hexes };
}

function makeIndirectFireWreckGrid(): IHexGrid {
  const hexes = new Map<string, IHex>();
  for (let q = -2; q <= 8; q += 1) {
    for (let r = -2; r <= 3; r += 1) {
      hexes.set(`${q},${r}`, makeHex(q, r));
    }
  }

  return { config: { radius: 8 }, hexes };
}

function makeClearGrid(radius: number): IHexGrid {
  const hexes = new Map<string, IHex>();
  for (let q = -radius; q <= radius; q += 1) {
    for (let r = -radius; r <= radius; r += 1) {
      hexes.set(`${q},${r}`, makeHex(q, r));
    }
  }
  return { config: { radius }, hexes };
}

function buildUnits(): readonly IGameUnit[] {
  return [
    {
      id: 'a1',
      name: 'Attacker',
      side: GameSide.Player,
      unitRef: 'attacker-mech',
      pilotRef: 'p1',
      gunnery: 4,
      piloting: 5,
    } as IGameUnit,
    {
      id: 't1',
      name: 'Target',
      side: GameSide.Opponent,
      unitRef: 'target-mech',
      pilotRef: 'p2',
      gunnery: 4,
      piloting: 5,
    } as IGameUnit,
  ];
}

function vehicleLocationRecord(
  values: Record<string, number>,
): Partial<Record<VehicleLocation, number>> {
  return values as Partial<Record<VehicleLocation, number>>;
}

function makeVehicleInit(): NonNullable<IGameUnit['vehicleInit']> {
  return {
    motionType: GroundMotionType.TRACKED,
    originalCruiseMP: 4,
    armor: vehicleLocationRecord({
      [VehicleLocation.FRONT]: 20,
      [VehicleLocation.LEFT]: 15,
      [VehicleLocation.RIGHT]: 15,
      [VehicleLocation.REAR]: 10,
    }),
    structure: vehicleLocationRecord({
      [VehicleLocation.FRONT]: 10,
      [VehicleLocation.LEFT]: 8,
      [VehicleLocation.RIGHT]: 8,
      [VehicleLocation.REAR]: 6,
    }),
  };
}

function asVehicleUnit(unit: IGameUnit): IGameUnit {
  return {
    ...unit,
    unitType: UnitType.VEHICLE,
    vehicleInit: makeVehicleInit(),
  };
}

function buildUnitsWithVehicleTarget(): readonly IGameUnit[] {
  return buildUnits().map((unit) =>
    unit.id === 't1' ? asVehicleUnit(unit) : unit,
  );
}

function buildUnitsWithVehicleAttacker(): readonly IGameUnit[] {
  return buildUnits().map((unit) =>
    unit.id === 'a1' ? asVehicleUnit(unit) : unit,
  );
}

function buildUnitsWithStackedVehicleTarget(): readonly IGameUnit[] {
  return [
    ...buildUnits(),
    {
      id: 'v1',
      name: 'Vehicle Target',
      side: GameSide.Opponent,
      unitRef: 'target-vehicle',
      pilotRef: 'p-vehicle',
      unitType: UnitType.VEHICLE,
      gunnery: 4,
      piloting: 5,
      vehicleInit: makeVehicleInit(),
    } as IGameUnit,
  ];
}

function buildUnitsWithWreck(): readonly IGameUnit[] {
  return [
    ...buildUnits(),
    {
      id: 'w1',
      name: 'Wreck',
      side: GameSide.Opponent,
      unitRef: 'wreck-mech',
      pilotRef: 'p-wreck',
      gunnery: 4,
      piloting: 5,
    } as IGameUnit,
  ];
}

function buildUnitsWithSpotter(): readonly IGameUnit[] {
  return [
    ...buildUnits(),
    {
      id: 's1',
      name: 'Spotter',
      side: GameSide.Player,
      unitRef: 'spotter-mech',
      pilotRef: 'p3',
      gunnery: 4,
      piloting: 5,
    } as IGameUnit,
  ];
}

function buildUnitsWithSpotterAndWreck(): readonly IGameUnit[] {
  return [
    ...buildUnitsWithSpotter(),
    {
      id: 'w1',
      name: 'Wreck',
      side: GameSide.Opponent,
      unitRef: 'wreck-mech',
      pilotRef: 'p-wreck',
      gunnery: 4,
      piloting: 5,
    } as IGameUnit,
  ];
}

function setupSessionAtWeaponAttack(): IGameSession {
  let session = createGameSession(
    {
      mapRadius: 3,
      turnLimit: 0,
      victoryConditions: ['elimination'],
      optionalRules: [],
    } as never,
    buildUnits(),
  );
  session = startGame(session, GameSide.Player);
  session = rollInitiative(session);
  session = advancePhase(session);
  session = advancePhase(session);
  session.currentState.units.a1 = {
    ...session.currentState.units.a1,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
    movementThisTurn: MovementType.Stationary,
  };
  session.currentState.units.t1 = {
    ...session.currentState.units.t1,
    position: { q: 2, r: 0 },
    facing: Facing.North,
    movementThisTurn: MovementType.Stationary,
  };

  return session;
}

function setupVehicleAttackerSessionAtWeaponAttack(): IGameSession {
  let session = createGameSession(
    {
      mapRadius: 3,
      turnLimit: 0,
      victoryConditions: ['elimination'],
      optionalRules: [],
    } as never,
    buildUnitsWithVehicleAttacker(),
  );
  session = startGame(session, GameSide.Player);
  session = rollInitiative(session);
  session = advancePhase(session);
  session = advancePhase(session);
  session.currentState.units.a1 = {
    ...session.currentState.units.a1,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
    movementThisTurn: MovementType.Stationary,
  };
  session.currentState.units.t1 = {
    ...session.currentState.units.t1,
    position: { q: 2, r: 0 },
    facing: Facing.North,
    movementThisTurn: MovementType.Stationary,
  };
  return session;
}

function setupC3SessionAtWeaponAttack(): IGameSession {
  let session = createGameSession(
    {
      mapRadius: 6,
      turnLimit: 0,
      victoryConditions: ['elimination'],
      optionalRules: [],
    } as never,
    buildUnitsWithSpotter(),
  );
  session = startGame(session, GameSide.Player);
  session = rollInitiative(session);
  session = advancePhase(session);
  session = advancePhase(session);
  session.currentState.units.a1 = {
    ...session.currentState.units.a1,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
    movementThisTurn: MovementType.Stationary,
  };
  session.currentState.units.t1 = {
    ...session.currentState.units.t1,
    position: { q: 6, r: 0 },
    facing: Facing.North,
    movementThisTurn: MovementType.Stationary,
  };
  session.currentState.units.s1 = {
    ...session.currentState.units.s1,
    position: { q: 5, r: -1 },
    facing: Facing.North,
    movementThisTurn: MovementType.Stationary,
  };

  const c3Network = createC3MasterSlaveNetwork('test-c3-network', [
    createC3Unit({
      entityId: 'a1',
      teamId: GameSide.Player,
      role: 'master',
      position: session.currentState.units.a1.position,
    }),
    createC3Unit({
      entityId: 's1',
      teamId: GameSide.Player,
      role: 'slave',
      position: session.currentState.units.s1.position,
    }),
  ]);
  if (!c3Network) {
    throw new Error('Expected C3 test network to be valid');
  }

  return {
    ...session,
    currentState: {
      ...session.currentState,
      c3State: addC3Network(createEmptyC3State(), c3Network),
    },
  };
}

function setupVehicleTargetSessionAtWeaponAttack(): IGameSession {
  let session = createGameSession(
    {
      mapRadius: 3,
      turnLimit: 0,
      victoryConditions: ['elimination'],
      optionalRules: [],
    } as never,
    buildUnitsWithVehicleTarget(),
  );
  session = startGame(session, GameSide.Player);
  session = rollInitiative(session);
  session = advancePhase(session);
  session = advancePhase(session);
  session.currentState.units.a1 = {
    ...session.currentState.units.a1,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
    movementThisTurn: MovementType.Stationary,
  };
  session.currentState.units.t1 = {
    ...session.currentState.units.t1,
    position: { q: 2, r: 0 },
    facing: Facing.North,
    movementThisTurn: MovementType.Stationary,
  };

  return session;
}

function setupStackedVehicleTargetSessionAtWeaponAttack(): IGameSession {
  let session = createGameSession(
    {
      mapRadius: 3,
      turnLimit: 0,
      victoryConditions: ['elimination'],
      optionalRules: [],
    } as never,
    buildUnitsWithStackedVehicleTarget(),
  );
  session = startGame(session, GameSide.Player);
  session = rollInitiative(session);
  session = advancePhase(session);
  session = advancePhase(session);
  session.currentState.units.a1 = {
    ...session.currentState.units.a1,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
    movementThisTurn: MovementType.Stationary,
  };
  session.currentState.units.t1 = {
    ...session.currentState.units.t1,
    position: { q: 2, r: 0 },
    facing: Facing.North,
    movementThisTurn: MovementType.Stationary,
  };
  session.currentState.units.v1 = {
    ...session.currentState.units.v1,
    position: { q: 2, r: 0 },
    facing: Facing.North,
    movementThisTurn: MovementType.Stationary,
  };

  return session;
}

function setupWreckSessionAtWeaponAttack(): IGameSession {
  let session = createGameSession(
    {
      mapRadius: 3,
      turnLimit: 0,
      victoryConditions: ['elimination'],
      optionalRules: [],
    } as never,
    buildUnitsWithWreck(),
  );
  session = startGame(session, GameSide.Player);
  session = rollInitiative(session);
  session = advancePhase(session);
  session = advancePhase(session);
  session.currentState.units.a1 = {
    ...session.currentState.units.a1,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
    movementThisTurn: MovementType.Stationary,
  };
  session.currentState.units.t1 = {
    ...session.currentState.units.t1,
    position: { q: 2, r: 0 },
    facing: Facing.North,
    movementThisTurn: MovementType.Stationary,
  };
  session.currentState.units.w1 = {
    ...session.currentState.units.w1,
    position: { q: 1, r: 0 },
    facing: Facing.North,
    movementThisTurn: MovementType.Stationary,
    destroyed: true,
  };

  return session;
}

function setupIndirectSessionAtWeaponAttack(): IGameSession {
  let session = createGameSession(
    {
      mapRadius: 8,
      turnLimit: 0,
      victoryConditions: ['elimination'],
      optionalRules: [],
    } as never,
    buildUnitsWithSpotter(),
  );
  session = startGame(session, GameSide.Player);
  session = rollInitiative(session);
  session = advancePhase(session);
  session = advancePhase(session);
  session.currentState.units.a1 = {
    ...session.currentState.units.a1,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
    movementThisTurn: MovementType.Stationary,
  };
  session.currentState.units.t1 = {
    ...session.currentState.units.t1,
    position: { q: 5, r: 0 },
    facing: Facing.North,
    movementThisTurn: MovementType.Stationary,
  };
  session.currentState.units.s1 = {
    ...session.currentState.units.s1,
    position: { q: 5, r: 1 },
    facing: Facing.North,
    movementThisTurn: MovementType.Stationary,
  };

  return session;
}

function setupIndirectNoSpotterSessionAtWeaponAttack(): IGameSession {
  let session = createGameSession(
    {
      mapRadius: 8,
      turnLimit: 0,
      victoryConditions: ['elimination'],
      optionalRules: [],
    } as never,
    buildUnits(),
  );
  session = startGame(session, GameSide.Player);
  session = rollInitiative(session);
  session = advancePhase(session);
  session = advancePhase(session);
  session.currentState.units.a1 = {
    ...session.currentState.units.a1,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
    movementThisTurn: MovementType.Stationary,
  };
  session.currentState.units.t1 = {
    ...session.currentState.units.t1,
    position: { q: 5, r: 0 },
    facing: Facing.North,
    movementThisTurn: MovementType.Stationary,
  };

  return session;
}

function setupIndirectWreckSessionAtWeaponAttack(): IGameSession {
  let session = createGameSession(
    {
      mapRadius: 8,
      turnLimit: 0,
      victoryConditions: ['elimination'],
      optionalRules: [],
    } as never,
    buildUnitsWithSpotterAndWreck(),
  );
  session = startGame(session, GameSide.Player);
  session = rollInitiative(session);
  session = advancePhase(session);
  session = advancePhase(session);
  session.currentState.units.a1 = {
    ...session.currentState.units.a1,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
    movementThisTurn: MovementType.Stationary,
  };
  session.currentState.units.t1 = {
    ...session.currentState.units.t1,
    position: { q: 5, r: 0 },
    facing: Facing.North,
    movementThisTurn: MovementType.Stationary,
  };
  session.currentState.units.s1 = {
    ...session.currentState.units.s1,
    position: { q: 5, r: 1 },
    facing: Facing.North,
    movementThisTurn: MovementType.Stationary,
  };
  session.currentState.units.w1 = {
    ...session.currentState.units.w1,
    position: { q: 3, r: 0 },
    facing: Facing.North,
    movementThisTurn: MovementType.Stationary,
    destroyed: true,
  };

  return session;
}

function buildWeaponsByUnit(): Map<string, readonly IWeapon[]> {
  return new Map([
    [
      'a1',
      [
        {
          id: 'medium-laser',
          name: 'Medium Laser',
          shortRange: 2,
          mediumRange: 4,
          longRange: 6,
          damage: 5,
          heat: 3,
          minRange: 0,
          ammoPerTon: -1,
          destroyed: false,
        },
      ],
    ],
  ]);
}

function buildLegMountedWeaponsByUnit(): Map<string, readonly IWeapon[]> {
  return new Map([
    [
      'a1',
      [
        {
          id: 'leg-laser',
          name: 'Leg Laser',
          shortRange: 2,
          mediumRange: 4,
          longRange: 6,
          damage: 5,
          heat: 3,
          minRange: 0,
          location: 'left_leg',
          ammoPerTon: -1,
          destroyed: false,
        },
      ],
    ],
  ]);
}

function buildFrontVehicleWeaponsByUnit(): Map<string, readonly IWeapon[]> {
  return new Map([
    [
      'a1',
      [
        {
          id: 'front-ac',
          name: 'Front AC/5',
          shortRange: 2,
          mediumRange: 4,
          longRange: 6,
          damage: 5,
          heat: 1,
          minRange: 0,
          location: 'Front',
          vehicleMountLocation: VehicleLocation.FRONT,
          ammoPerTon: 20,
          destroyed: false,
        },
        {
          id: 'lrm-5-front',
          name: 'Front LRM-5',
          shortRange: 7,
          mediumRange: 14,
          longRange: 21,
          damage: 5,
          heat: 2,
          minRange: 0,
          location: 'Front',
          vehicleMountLocation: VehicleLocation.FRONT,
          ammoPerTon: 24,
          destroyed: false,
        },
      ],
    ],
  ]);
}

function buildTorpedoWeaponsByUnit(): Map<string, readonly IWeapon[]> {
  return new Map([
    [
      'a1',
      [
        {
          id: 'lrt-15',
          name: 'LR Torpedo 15',
          shortRange: 7,
          mediumRange: 14,
          longRange: 21,
          damage: 9,
          heat: 5,
          minRange: 0,
          ammoPerTon: 8,
          destroyed: false,
          isTorpedo: true,
        },
      ],
    ],
  ]);
}

function buildIndirectWeaponsByUnit(): Map<string, readonly IWeapon[]> {
  return new Map([
    [
      'a1',
      [
        {
          id: 'lrm-15-1',
          name: 'LRM-15',
          shortRange: 7,
          mediumRange: 14,
          longRange: 21,
          damage: 9,
          heat: 5,
          minRange: 0,
          ammoPerTon: 8,
          destroyed: false,
        },
      ],
    ],
  ]);
}

function buildSelectedAMSWeaponsByUnit(): Map<string, readonly IWeapon[]> {
  return new Map([
    [
      'a1',
      [
        {
          id: 'lrm-10-0',
          name: 'LRM-10',
          shortRange: 7,
          mediumRange: 14,
          longRange: 21,
          damage: 10,
          heat: 4,
          minRange: 0,
          ammoPerTon: 12,
          destroyed: false,
        },
      ],
    ],
    [
      't1',
      [
        {
          id: 'laser-ams-0',
          name: 'Laser Anti-Missile System',
          shortRange: 1,
          mediumRange: 1,
          longRange: 1,
          damage: 0,
          heat: 5,
          minRange: 0,
          ammoPerTon: -1,
          destroyed: false,
          mountingArc: FiringArc.Front,
        },
      ],
    ],
  ]);
}

function buildSemiGuidedWeaponsByUnit(): Map<string, readonly IWeapon[]> {
  return new Map([
    [
      'a1',
      [
        {
          id: 'semi-guided-lrm-15',
          name: 'Semi-Guided LRM-15',
          shortRange: 7,
          mediumRange: 14,
          longRange: 21,
          damage: 9,
          heat: 5,
          minRange: 0,
          ammoPerTon: 8,
          destroyed: false,
        },
      ],
    ],
  ]);
}

function expectDeclaredToHitMatchesIndependentEngineToHit({
  payload,
  range,
  rangeBracket,
  session,
  targetPartialCover = false,
  weapon,
}: {
  readonly payload: IAttackDeclaredPayload;
  readonly range: number;
  readonly rangeBracket: RangeBracket;
  readonly session: IGameSession;
  readonly targetPartialCover?: boolean;
  readonly weapon: IWeapon;
}): void {
  const attackerUnit = session.currentState.units.a1;
  const targetUnit = session.currentState.units.t1;
  const attacker = session.units.find((unit) => unit.id === 'a1');
  expect(attackerUnit).toBeDefined();
  expect(targetUnit).toBeDefined();
  expect(attacker).toBeDefined();

  const independent = calculateToHit(
    buildWeaponAttackAttackerToHitState(
      attackerUnit,
      attacker!.gunnery,
      { id: weapon.id, name: weapon.name },
      't1',
    ),
    buildWeaponAttackTargetToHitState(targetUnit, targetPartialCover),
    rangeBracket,
    range,
    weapon.minRange,
    weapon.id,
    {
      isSemiGuided: isSemiGuidedLRM(weapon.id) || isSemiGuidedLRM(weapon.name),
      targetTagDesignated: targetUnit.tagDesignated,
      targetEcmProtected: (targetUnit as EcmAwareTestUnitState).ecmProtected,
    },
  );

  // This is the agreement suite's absolute anchor. The projection-copy check
  // alone is tautological because projection enrichment stamps the projection TN
  // onto the recorded AttackDeclared payload.
  expect(payload.toHitNumber).toBe(independent.finalToHit);
}

function buildMinimumRangeWeaponsByUnit(): Map<string, readonly IWeapon[]> {
  return new Map([
    [
      'a1',
      [
        {
          id: 'lrm-15-1',
          name: 'LRM-15',
          shortRange: 7,
          mediumRange: 14,
          longRange: 21,
          damage: 9,
          heat: 5,
          minRange: 6,
          ammoPerTon: 8,
          destroyed: false,
        },
      ],
    ],
  ]);
}

function buildExtremeRangeWeaponsByUnit(): Map<string, readonly IWeapon[]> {
  return new Map([
    [
      'a1',
      [
        {
          id: 'extreme-ac',
          name: 'Extreme AC',
          shortRange: 2,
          mediumRange: 4,
          longRange: 6,
          extremeRange: 9,
          damage: 5,
          heat: 3,
          minRange: 0,
          ammoPerTon: -1,
          destroyed: false,
        },
      ],
    ],
  ]);
}

function buildMixedArcWeaponsByUnit(): Map<string, readonly IWeapon[]> {
  return new Map([
    [
      'a1',
      [
        {
          id: 'front-close',
          name: 'Front Close Weapon',
          shortRange: 3,
          mediumRange: 5,
          longRange: 7,
          damage: 5,
          heat: 3,
          minRange: 0,
          ammoPerTon: -1,
          destroyed: false,
          mountingArc: FiringArc.Front,
        },
        {
          id: 'rear-lrm',
          name: 'Rear LRM',
          shortRange: 2,
          mediumRange: 4,
          longRange: 8,
          damage: 9,
          heat: 5,
          minRange: 0,
          ammoPerTon: 8,
          destroyed: false,
          mountingArc: FiringArc.Rear,
        },
      ],
    ],
  ]);
}

function buildMultiArcWeaponsByUnit(): Map<string, readonly IWeapon[]> {
  return new Map([
    [
      'a1',
      [
        {
          id: 'left-sponson-laser',
          name: 'Left Sponson Laser',
          shortRange: 3,
          mediumRange: 5,
          longRange: 7,
          damage: 5,
          heat: 3,
          minRange: 0,
          ammoPerTon: -1,
          destroyed: false,
          mountingArcs: [FiringArc.Front, FiringArc.Left],
        },
      ],
    ],
  ]);
}

function makeAerospaceCombatState(altitude: number) {
  return createAerospaceCombatState({
    maxSI: 10,
    armorByArc: { nose: 10, leftWing: 8, rightWing: 8, aft: 6 },
    heatSinks: 10,
    fuelPoints: 20,
    safeThrust: 6,
    maxThrust: 9,
    altitude,
  });
}

function buildDryAmmoWeaponsByUnit(): Map<string, readonly IWeapon[]> {
  return new Map([
    [
      'a1',
      [
        {
          id: 'ac-5-1',
          name: 'AC/5',
          shortRange: 3,
          mediumRange: 6,
          longRange: 9,
          damage: 5,
          heat: 1,
          minRange: 0,
          ammoPerTon: 20,
          destroyed: false,
        },
      ],
    ],
  ]);
}

function makeToken(overrides: Partial<IUnitToken>): IUnitToken {
  return {
    unitId: 'unit',
    name: 'Unit',
    side: GameSide.Player,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
    isSelected: false,
    isValidTarget: false,
    isDestroyed: false,
    designation: 'UNT',
    unitType: TokenUnitType.Mech,
    ...overrides,
  } as IUnitToken;
}

function makeWeaponStatus(
  overrides: Partial<IWeaponStatus> = {},
): IWeaponStatus {
  return {
    id: 'medium-laser',
    name: 'Medium Laser',
    location: 'right_arm',
    destroyed: false,
    firedThisTurn: false,
    heat: 3,
    damage: 5,
    ranges: { short: 2, medium: 4, long: 6 },
    ...overrides,
  };
}

it('uses the same encoded-terrain LOS rejection reason in preview and committed attacks', () => {
  const session = setupSessionAtWeaponAttack();
  const grid = makeEncodedBlockerGrid();
  const attackerToken = makeToken({
    unitId: 'a1',
    isSelected: true,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
  });
  const targetToken = makeToken({
    unitId: 't1',
    side: GameSide.Opponent,
    position: { q: 2, r: 0 },
    facing: Facing.North,
  });

  const projection = deriveCombatRangeHexes({
    attacker: attackerToken,
    hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
    grid,
    tokens: [attackerToken, targetToken],
    weapons: [makeWeaponStatus()],
  }).find((hex) => hex.hex.q === 2 && hex.hex.r === 0);

  expect(projection).toBeDefined();
  expect(projection).toMatchObject({
    losState: 'blocked',
    attackable: false,
    attackInvalidReason: 'NoLineOfSight',
    attackInvalidDetails: 'Blocked by building at (1, 0)',
  });
  expect(projection?.blockedReason).toContain('Blocked by building');

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: buildWeaponsByUnit(),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['medium-laser'],
    grid,
  });

  expect(
    result.events.some((event) => event.type === GameEventType.AttackDeclared),
  ).toBe(false);
  expect(
    result.events.some((event) => event.type === GameEventType.AttackLocked),
  ).toBe(false);

  const invalid = result.events.find(
    (event) => event.type === GameEventType.AttackInvalid,
  );
  expect(invalid).toBeDefined();
  expect(invalid!.payload as IAttackInvalidPayload).toMatchObject({
    attackerId: 'a1',
    targetId: 't1',
    weaponId: 'medium-laser',
    reason: projection!.attackInvalidReason,
    details: projection!.attackInvalidDetails,
  });
});

it('keeps preview and committed attacks clear through destroyed unit markers', () => {
  const session = setupWreckSessionAtWeaponAttack();
  const grid = makeClearGrid(3);
  const attackerToken = makeToken({
    unitId: 'a1',
    isSelected: true,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
  });
  const wreckToken = makeToken({
    unitId: 'w1',
    name: 'w1',
    side: GameSide.Opponent,
    position: { q: 1, r: 0 },
    facing: Facing.North,
    isDestroyed: true,
  });
  const targetToken = makeToken({
    unitId: 't1',
    side: GameSide.Opponent,
    position: { q: 2, r: 0 },
    facing: Facing.North,
  });

  const projection = deriveCombatRangeHexes({
    attacker: attackerToken,
    hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
    grid,
    tokens: [attackerToken, wreckToken, targetToken],
    weapons: [makeWeaponStatus()],
  }).find((hex) => hex.hex.q === 2 && hex.hex.r === 0);

  expect(projection).toBeDefined();
  expect(projection).toMatchObject({
    losState: 'clear',
    attackable: true,
  });
  expect(projection?.attackInvalidReason).toBeUndefined();
  expect(projection?.attackInvalidDetails).toBeUndefined();
  expect(projection?.lineOfSightBlockerReason).toBeUndefined();
  expect(projection?.lineOfSightBlocker).toBeUndefined();

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: buildWeaponsByUnit(),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['medium-laser'],
    grid,
  });

  expect(
    result.events.some((event) => event.type === GameEventType.AttackDeclared),
  ).toBe(true);
  expect(
    result.events.some((event) => event.type === GameEventType.AttackLocked),
  ).toBe(true);

  const invalid = result.events.find(
    (event) => event.type === GameEventType.AttackInvalid,
  );
  expect(invalid).toBeUndefined();
});

it('uses the same elevation LOS rejection reason in preview and committed attacks', () => {
  const session = setupSessionAtWeaponAttack();
  const grid = makeElevationBlockerGrid();
  const attackerToken = makeToken({
    unitId: 'a1',
    isSelected: true,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
  });
  const targetToken = makeToken({
    unitId: 't1',
    side: GameSide.Opponent,
    position: { q: 2, r: 0 },
    facing: Facing.North,
  });

  const projection = deriveCombatRangeHexes({
    attacker: attackerToken,
    hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
    grid,
    tokens: [attackerToken, targetToken],
    weapons: [makeWeaponStatus()],
  }).find((hex) => hex.hex.q === 2 && hex.hex.r === 0);

  expect(projection).toBeDefined();
  expect(projection).toMatchObject({
    losState: 'blocked',
    attackable: false,
    attackInvalidReason: 'NoLineOfSight',
    attackInvalidDetails: 'Blocked by elevation +2 at (1, 0)',
    lineOfSightBlockerReason: 'Blocked by elevation +2 at (1, 0)',
    blockedReason: 'Blocked by elevation +2 at (1, 0)',
  });

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: buildWeaponsByUnit(),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['medium-laser'],
    grid,
  });

  expect(
    result.events.some((event) => event.type === GameEventType.AttackDeclared),
  ).toBe(false);

  const invalid = result.events.find(
    (event) => event.type === GameEventType.AttackInvalid,
  );
  expect(invalid).toBeDefined();
  expect(invalid!.payload as IAttackInvalidPayload).toMatchObject({
    attackerId: 'a1',
    targetId: 't1',
    weaponId: 'medium-laser',
    reason: projection!.attackInvalidReason,
    details: projection!.attackInvalidDetails,
  });
});

it('keeps equal-height building LOS clear between preview and committed attacks', () => {
  const session = setupSessionAtWeaponAttack();
  const grid = makeLowBuildingGrid();
  const attackerToken = makeToken({
    unitId: 'a1',
    isSelected: true,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
  });
  const targetToken = makeToken({
    unitId: 't1',
    side: GameSide.Opponent,
    position: { q: 2, r: 0 },
    facing: Facing.North,
  });

  const projection = deriveCombatRangeHexes({
    attacker: attackerToken,
    hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
    grid,
    tokens: [attackerToken, targetToken],
    weapons: [makeWeaponStatus()],
    combatState: session.currentState,
  }).find((hex) => hex.hex.q === 2 && hex.hex.r === 0);

  expect(projection).toBeDefined();
  expect(projection).toMatchObject({
    losState: 'clear',
    attackable: true,
    targetPartialCover: true,
    targetCoverModifier: 1,
    targetCoverReason: 'Target behind building partial cover at (1, 0) (+1)',
    toHitNumber: 5,
    attackInvalidReason: undefined,
    attackInvalidDetails: undefined,
  });
  expect(projection?.toHitModifiers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'Partial Cover',
        value: 1,
        source: 'terrain',
      }),
    ]),
  );

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: buildWeaponsByUnit(),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['medium-laser'],
    grid,
  });

  expect(
    result.events.some((event) => event.type === GameEventType.AttackInvalid),
  ).toBe(false);
  const declared = result.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  );
  expect(declared).toBeDefined();
  const payload = declared!.payload as IAttackDeclaredPayload;
  expect(payload.targetId).toBe('t1');
  expect(payload.toHitNumber).toBe(projection!.toHitNumber);
  expect(payload.modifiers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'Partial Cover',
        value: 1,
        source: 'terrain',
      }),
    ]),
  );
});

it('keeps hull-down target cover aligned between preview and committed attacks', () => {
  const session = setupSessionAtWeaponAttack();
  session.currentState.units.t1 = {
    ...session.currentState.units.t1,
    hullDown: true,
  };
  const grid = makeLowBuildingGrid();
  const attackerToken = makeToken({
    unitId: 'a1',
    isSelected: true,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
  });
  const targetToken = makeToken({
    unitId: 't1',
    side: GameSide.Opponent,
    position: { q: 2, r: 0 },
    facing: Facing.North,
  });

  const projection = deriveCombatRangeHexes({
    attacker: attackerToken,
    hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
    grid,
    tokens: [attackerToken, targetToken],
    weapons: [makeWeaponStatus()],
    combatState: session.currentState,
  }).find((hex) => hex.hex.q === 2 && hex.hex.r === 0);

  expect(projection).toMatchObject({
    attackable: true,
    targetPartialCover: true,
    targetHullDown: true,
    targetHullDownModifier: 2,
    toHitNumber: 6,
  });
  expect(projection?.toHitModifiers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: 'Hull-Down', value: 2 }),
    ]),
  );

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: buildWeaponsByUnit(),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['medium-laser'],
    grid,
  });

  const declared = result.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  );
  expect(declared).toBeDefined();
  const payload = declared!.payload as IAttackDeclaredPayload;
  expect(payload.toHitNumber).toBe(projection!.toHitNumber);
  expect(payload.modifiers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: 'Hull-Down', value: 2 }),
    ]),
  );
});

it('keeps hull-down attacker leg-weapon blocks aligned between preview and committed attacks', () => {
  const session = setupSessionAtWeaponAttack();
  session.currentState.units.a1 = {
    ...session.currentState.units.a1,
    hullDown: true,
  };
  const grid = makeClearGrid(3);
  const attackerToken = makeToken({
    unitId: 'a1',
    isSelected: true,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
  });
  const targetToken = makeToken({
    unitId: 't1',
    side: GameSide.Opponent,
    position: { q: 2, r: 0 },
    facing: Facing.North,
  });
  const weapons = [
    makeWeaponStatus({
      id: 'leg-laser',
      name: 'Leg Laser',
      location: 'left_leg',
    }),
  ];

  const projection = deriveCombatRangeHexes({
    attacker: attackerToken,
    hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
    grid,
    tokens: [attackerToken, targetToken],
    weapons,
    combatState: session.currentState,
  }).find((hex) => hex.hex.q === 2 && hex.hex.r === 0);

  expect(projection).toMatchObject({
    inRange: true,
    inArc: true,
    attackable: false,
    weaponIdsAvailable: [],
    attackInvalidReason: 'InvalidTarget',
    attackInvalidDetails: HULL_DOWN_LEG_WEAPON_BLOCKED_REASON,
    blockedReason: HULL_DOWN_LEG_WEAPON_BLOCKED_REASON,
  });
  expect(projection?.weaponRangeOptions).toEqual([
    expect.objectContaining({
      weaponId: 'leg-laser',
      available: false,
      blockedReason: HULL_DOWN_LEG_WEAPON_BLOCKED_REASON,
    }),
  ]);

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: buildLegMountedWeaponsByUnit(),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['leg-laser'],
    grid,
  });

  expect(
    result.events.some((event) => event.type === GameEventType.AttackDeclared),
  ).toBe(false);
  const invalid = result.events.find(
    (event) => event.type === GameEventType.AttackInvalid,
  );
  expect(invalid).toBeDefined();
  expect(invalid!.payload as IAttackInvalidPayload).toMatchObject({
    attackerId: 'a1',
    targetId: 't1',
    weaponId: 'leg-laser',
    reason: projection!.attackInvalidReason,
    details: projection!.attackInvalidDetails,
  });
});

it('keeps hull-down vehicle front-weapon blocks aligned between preview and committed attacks', () => {
  const session = setupVehicleAttackerSessionAtWeaponAttack();
  session.currentState.units.a1 = {
    ...session.currentState.units.a1,
    hullDown: true,
  };
  const grid = makeClearGrid(3);
  const attackerToken = makeToken({
    unitId: 'a1',
    isSelected: true,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
    unitType: TokenUnitType.Vehicle,
  });
  const targetToken = makeToken({
    unitId: 't1',
    side: GameSide.Opponent,
    position: { q: 2, r: 0 },
    facing: Facing.North,
  });
  const weapons = [
    makeWeaponStatus({
      id: 'front-ac',
      name: 'Front AC/5',
      location: 'Front',
      vehicleMountLocation: VehicleLocation.FRONT,
    }),
  ];

  const projection = deriveCombatRangeHexes({
    attacker: attackerToken,
    hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
    grid,
    tokens: [attackerToken, targetToken],
    weapons,
    combatState: session.currentState,
  }).find((hex) => hex.hex.q === 2 && hex.hex.r === 0);

  expect(projection).toMatchObject({
    inRange: true,
    inArc: true,
    attackable: false,
    weaponIdsAvailable: [],
    attackInvalidReason: 'InvalidTarget',
    attackInvalidDetails: HULL_DOWN_FRONT_WEAPON_BLOCKED_REASON,
    blockedReason: HULL_DOWN_FRONT_WEAPON_BLOCKED_REASON,
  });
  expect(projection?.weaponRangeOptions).toEqual([
    expect.objectContaining({
      weaponId: 'front-ac',
      available: false,
      blockedReason: HULL_DOWN_FRONT_WEAPON_BLOCKED_REASON,
    }),
  ]);

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: buildFrontVehicleWeaponsByUnit(),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['front-ac'],
    grid,
  });

  expect(
    result.events.some((event) => event.type === GameEventType.AttackDeclared),
  ).toBe(false);
  const invalid = result.events.find(
    (event) => event.type === GameEventType.AttackInvalid,
  );
  expect(invalid).toBeDefined();
  expect(invalid!.payload as IAttackInvalidPayload).toMatchObject({
    attackerId: 'a1',
    targetId: 't1',
    weaponId: 'front-ac',
    reason: projection!.attackInvalidReason,
    details: projection!.attackInvalidDetails,
  });
});

it('keeps hull-down vehicle front-mounted indirect fire available', () => {
  const session = setupVehicleAttackerSessionAtWeaponAttack();
  session.currentState.units.a1 = {
    ...session.currentState.units.a1,
    hullDown: true,
  };
  const grid = makeClearGrid(3);
  const attackerToken = makeToken({
    unitId: 'a1',
    isSelected: true,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
    unitType: TokenUnitType.Vehicle,
  });
  const targetToken = makeToken({
    unitId: 't1',
    side: GameSide.Opponent,
    position: { q: 2, r: 0 },
    facing: Facing.North,
  });
  const weapons = [
    makeWeaponStatus({
      id: 'lrm-5-front',
      name: 'Front LRM-5',
      location: 'Front',
      mode: 'Indirect',
      vehicleMountLocation: VehicleLocation.FRONT,
      ranges: { short: 7, medium: 14, long: 21 },
    }),
  ];

  const projection = deriveCombatRangeHexes({
    attacker: attackerToken,
    hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
    grid,
    tokens: [attackerToken, targetToken],
    weapons,
    combatState: session.currentState,
  }).find((hex) => hex.hex.q === 2 && hex.hex.r === 0);

  expect(projection).toMatchObject({
    attackable: true,
    weaponIdsAvailable: ['lrm-5-front'],
    attackInvalidReason: undefined,
  });
  expect(projection?.weaponRangeOptions).toEqual([
    expect.objectContaining({
      weaponId: 'lrm-5-front',
      available: true,
      blockedReason: undefined,
    }),
  ]);

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: buildFrontVehicleWeaponsByUnit(),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['lrm-5-front'],
    weaponModesByWeaponId: { 'lrm-5-front': 'Indirect' },
    grid,
  });

  expect(
    result.events.some((event) => event.type === GameEventType.AttackInvalid),
  ).toBe(false);
  const declared = result.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  );
  expect(declared).toBeDefined();
  const payload = declared!.payload as IAttackDeclaredPayload;
  expect(payload.weapons).toEqual(['lrm-5-front']);
  expect(payload.weaponAttacks).toEqual([
    expect.objectContaining({
      weaponId: 'lrm-5-front',
      mode: 'Indirect',
    }),
  ]);
});

it('stamps selected defender AMS mount metadata onto AttackDeclared for replay', () => {
  const session = setupSessionAtWeaponAttack();
  const grid = makeClearGrid(3);

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: buildSelectedAMSWeaponsByUnit(),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['lrm-10-0'],
    selectedAMSWeaponIds: { 'lrm-10-0': 'laser-ams-0' },
    grid,
  });

  expect(
    result.events.some((event) => event.type === GameEventType.AttackInvalid),
  ).toBe(false);
  const declared = result.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  );
  expect(declared).toBeDefined();
  const payload = declared!.payload as IAttackDeclaredPayload;
  expect(payload.selectedAMSWeaponIds).toEqual({
    'lrm-10-0': 'laser-ams-0',
  });
  expect(payload.selectedAMSWeaponMounts).toEqual({
    'lrm-10-0': expect.objectContaining({
      weaponId: 'laser-ams-0',
      weaponName: 'Laser Anti-Missile System',
      heat: 5,
      mountingArc: FiringArc.Front,
    }),
  });
});

it('rejects non-AMS defender selections before committing AttackDeclared', () => {
  const session = setupSessionAtWeaponAttack();
  const grid = makeClearGrid(3);
  const weaponsByUnit = buildSelectedAMSWeaponsByUnit();
  weaponsByUnit.set('t1', [
    {
      id: 'medium-laser-0',
      name: 'Medium Laser',
      shortRange: 3,
      mediumRange: 6,
      longRange: 9,
      damage: 5,
      heat: 3,
      minRange: 0,
      ammoPerTon: -1,
      destroyed: false,
      mountingArc: FiringArc.Front,
    },
  ]);

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit,
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['lrm-10-0'],
    selectedAMSWeaponIds: { 'lrm-10-0': 'medium-laser-0' },
    grid,
  });

  expect(
    result.events.some((event) => event.type === GameEventType.AttackDeclared),
  ).toBe(false);
  const invalid = result.events.find(
    (event) => event.type === GameEventType.AttackInvalid,
  );
  expect(invalid).toBeDefined();
  expect(invalid!.payload as IAttackInvalidPayload).toMatchObject({
    attackerId: 'a1',
    targetId: 't1',
    weaponId: 'lrm-10-0',
    reason: 'InvalidTarget',
    details: "Selected AMS 'medium-laser-0' is not an AMS weapon",
  });
});

it('rejects defender AMS selections outside the incoming attack arc before commit', () => {
  const session = setupSessionAtWeaponAttack();
  const grid = makeClearGrid(3);
  const weaponsByUnit = buildSelectedAMSWeaponsByUnit();
  const frontAms = weaponsByUnit.get('t1')![0];
  weaponsByUnit.set('t1', [
    {
      ...frontAms,
      id: 'rear-laser-ams-0',
      mountingArc: FiringArc.Rear,
    } as IWeapon,
  ]);

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit,
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['lrm-10-0'],
    selectedAMSWeaponIds: { 'lrm-10-0': 'rear-laser-ams-0' },
    grid,
  });

  expect(
    result.events.some((event) => event.type === GameEventType.AttackDeclared),
  ).toBe(false);
  const invalid = result.events.find(
    (event) => event.type === GameEventType.AttackInvalid,
  );
  expect(invalid).toBeDefined();
  expect(invalid!.payload as IAttackInvalidPayload).toMatchObject({
    attackerId: 'a1',
    targetId: 't1',
    weaponId: 'lrm-10-0',
    reason: 'InvalidTarget',
    details:
      "Selected AMS 'rear-laser-ams-0' does not cover the incoming front arc",
  });
});

it('rejects already-fired standard AMS defender selections before commit', () => {
  const session = setupSessionAtWeaponAttack();
  session.currentState.units.t1 = {
    ...session.currentState.units.t1,
    weaponsFiredThisTurn: ['laser-ams-0'],
  };
  const grid = makeClearGrid(3);

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: buildSelectedAMSWeaponsByUnit(),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['lrm-10-0'],
    selectedAMSWeaponIds: { 'lrm-10-0': 'laser-ams-0' },
    grid,
  });

  expect(
    result.events.some((event) => event.type === GameEventType.AttackDeclared),
  ).toBe(false);
  const invalid = result.events.find(
    (event) => event.type === GameEventType.AttackInvalid,
  );
  expect(invalid).toBeDefined();
  expect(invalid!.payload as IAttackInvalidPayload).toMatchObject({
    attackerId: 'a1',
    targetId: 't1',
    weaponId: 'lrm-10-0',
    reason: 'InvalidTarget',
    details: "Selected AMS 'laser-ams-0' has already fired this weapon phase",
  });
});

it('keeps target-adjacent elevation partial cover aligned between preview and committed attacks', () => {
  const session = setupSessionAtWeaponAttack();
  const grid = makeTargetAdjacentElevationCoverGrid();
  const attackerToken = makeToken({
    unitId: 'a1',
    isSelected: true,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
  });
  const targetToken = makeToken({
    unitId: 't1',
    side: GameSide.Opponent,
    position: { q: 2, r: 0 },
    facing: Facing.North,
  });

  const projection = deriveCombatRangeHexes({
    attacker: attackerToken,
    hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
    grid,
    tokens: [attackerToken, targetToken],
    weapons: [makeWeaponStatus()],
    combatState: session.currentState,
  }).find((hex) => hex.hex.q === 2 && hex.hex.r === 0);

  expect(projection).toBeDefined();
  expect(projection).toMatchObject({
    losState: 'clear',
    attackable: true,
    targetPartialCover: true,
    targetCoverModifier: 1,
    targetCoverReason:
      'Target behind elevation +1 partial cover at (1, 0) (+1)',
    toHitNumber: 5,
  });
  expect(projection?.toHitModifiers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'Partial Cover',
        value: 1,
        source: 'terrain',
      }),
    ]),
  );

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: buildWeaponsByUnit(),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['medium-laser'],
    grid,
  });

  expect(
    result.events.some((event) => event.type === GameEventType.AttackInvalid),
  ).toBe(false);
  const declared = result.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  );
  expect(declared).toBeDefined();
  const payload = declared!.payload as IAttackDeclaredPayload;
  expect(payload.toHitNumber).toBe(projection!.toHitNumber);
  expect(payload.modifiers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'Partial Cover',
        value: 1,
        source: 'terrain',
      }),
    ]),
  );
});

it('keeps vehicle target horizontal-cover ineligibility aligned between preview and committed attacks', () => {
  const session = setupVehicleTargetSessionAtWeaponAttack();
  const grid = makeLowBuildingGrid();
  const attackerToken = makeToken({
    unitId: 'a1',
    isSelected: true,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
  });
  const targetToken = makeToken({
    unitId: 't1',
    side: GameSide.Opponent,
    position: { q: 2, r: 0 },
    facing: Facing.North,
    unitType: TokenUnitType.Vehicle,
  });

  const projection = deriveCombatRangeHexes({
    attacker: attackerToken,
    hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
    grid,
    tokens: [attackerToken, targetToken],
    weapons: [makeWeaponStatus()],
    combatState: session.currentState,
  }).find((hex) => hex.hex.q === 2 && hex.hex.r === 0);

  expect(projection).toBeDefined();
  expect(projection).toMatchObject({
    losState: 'clear',
    attackable: true,
    targetPartialCover: false,
    targetCoverModifier: 0,
    targetCoverReason: undefined,
    toHitNumber: 4,
  });
  expect(projection?.toHitModifiers).not.toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'Partial Cover',
      }),
    ]),
  );

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: buildWeaponsByUnit(),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['medium-laser'],
    grid,
  });

  expect(
    result.events.some((event) => event.type === GameEventType.AttackInvalid),
  ).toBe(false);
  const declared = result.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  );
  expect(declared).toBeDefined();
  const payload = declared!.payload as IAttackDeclaredPayload;
  expect(payload.toHitNumber).toBe(projection!.toHitNumber);
  expect(payload.modifiers).not.toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'Partial Cover',
      }),
    ]),
  );
});

it('keeps single-heavy-woods LOS modifier aligned between preview and committed attacks', () => {
  const session = setupSessionAtWeaponAttack();
  const grid = makeSingleHeavyWoodsGrid();
  const attackerToken = makeToken({
    unitId: 'a1',
    isSelected: true,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
  });
  const targetToken = makeToken({
    unitId: 't1',
    side: GameSide.Opponent,
    position: { q: 2, r: 0 },
    facing: Facing.North,
  });

  const projection = deriveCombatRangeHexes({
    attacker: attackerToken,
    hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
    grid,
    tokens: [attackerToken, targetToken],
    weapons: [makeWeaponStatus()],
    combatState: session.currentState,
  }).find((hex) => hex.hex.q === 2 && hex.hex.r === 0);

  expect(projection).toBeDefined();
  expect(projection).toMatchObject({
    losState: 'partial',
    attackable: true,
    blockedReason: 'Partial cover through heavy woods at (1, 0)',
    toHitNumber: 6,
  });
  expect(projection?.toHitModifiers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'Intervening Terrain',
        value: 2,
        source: 'terrain',
      }),
    ]),
  );

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: buildWeaponsByUnit(),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['medium-laser'],
    grid,
  });

  expect(
    result.events.some((event) => event.type === GameEventType.AttackInvalid),
  ).toBe(false);
  const declared = result.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  );
  expect(declared).toBeDefined();
  const payload = declared!.payload as IAttackDeclaredPayload;
  expect(payload.toHitNumber).toBe(projection!.toHitNumber);
  expect(payload.modifiers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'Intervening Terrain',
        value: 2,
        source: 'terrain',
      }),
    ]),
  );
});

it('keeps intervening smoke LOS modifiers aligned between preview and committed attacks', () => {
  const session = setupSessionAtWeaponAttack();
  const grid = makeLightSmokeGrid();
  const attackerToken = makeToken({
    unitId: 'a1',
    isSelected: true,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
  });
  const targetToken = makeToken({
    unitId: 't1',
    side: GameSide.Opponent,
    position: { q: 2, r: 0 },
    facing: Facing.North,
  });

  const projection = deriveCombatRangeHexes({
    attacker: attackerToken,
    hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
    grid,
    tokens: [attackerToken, targetToken],
    weapons: [makeWeaponStatus()],
    combatState: session.currentState,
  }).find((hex) => hex.hex.q === 2 && hex.hex.r === 0);

  expect(projection).toBeDefined();
  expect(projection).toMatchObject({
    losState: 'partial',
    attackable: true,
    blockedReason: 'Partial cover through smoke at (1, 0)',
    toHitNumber: 5,
  });
  expect(projection?.toHitModifiers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'Intervening Terrain',
        value: 1,
        source: 'terrain',
      }),
    ]),
  );

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: buildWeaponsByUnit(),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['medium-laser'],
    grid,
  });

  expect(
    result.events.some((event) => event.type === GameEventType.AttackInvalid),
  ).toBe(false);
  const declared = result.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  );
  expect(declared).toBeDefined();
  const payload = declared!.payload as IAttackDeclaredPayload;
  expect(payload.toHitNumber).toBe(projection!.toHitNumber);
  expect(payload.modifiers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'Intervening Terrain',
        value: 1,
        source: 'terrain',
      }),
    ]),
  );
});

it('stacks same-hex smoke and woods between preview and committed attacks', () => {
  const session = setupSessionAtWeaponAttack();
  const grid = makeSmokeAndLightWoodsGrid();
  const attackerToken = makeToken({
    unitId: 'a1',
    isSelected: true,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
  });
  const targetToken = makeToken({
    unitId: 't1',
    side: GameSide.Opponent,
    position: { q: 2, r: 0 },
    facing: Facing.North,
  });

  const projection = deriveCombatRangeHexes({
    attacker: attackerToken,
    hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
    grid,
    tokens: [attackerToken, targetToken],
    weapons: [makeWeaponStatus()],
    combatState: session.currentState,
  }).find((hex) => hex.hex.q === 2 && hex.hex.r === 0);

  expect(projection).toBeDefined();
  expect(projection).toMatchObject({
    losState: 'partial',
    attackable: true,
    blockedReason: 'Partial cover through smoke and light woods at (1, 0)',
    toHitNumber: 6,
  });
  expect(projection?.toHitModifiers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'Intervening Terrain',
        value: 2,
        source: 'terrain',
      }),
    ]),
  );

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: buildWeaponsByUnit(),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['medium-laser'],
    grid,
  });

  expect(
    result.events.some((event) => event.type === GameEventType.AttackInvalid),
  ).toBe(false);
  const declared = result.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  );
  expect(declared).toBeDefined();
  const payload = declared!.payload as IAttackDeclaredPayload;
  expect(payload.toHitNumber).toBe(projection!.toHitNumber);
  expect(payload.modifiers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'Intervening Terrain',
        value: 2,
        source: 'terrain',
      }),
    ]),
  );
});

it('keeps target-hex smoke and woods as target terrain instead of partial cover', () => {
  const session = setupSessionAtWeaponAttack();
  const grid = makeTargetSmokeAndLightWoodsGrid();
  const attackerToken = makeToken({
    unitId: 'a1',
    isSelected: true,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
  });
  const targetToken = makeToken({
    unitId: 't1',
    side: GameSide.Opponent,
    position: { q: 2, r: 0 },
    facing: Facing.North,
  });

  const projection = deriveCombatRangeHexes({
    attacker: attackerToken,
    hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
    grid,
    tokens: [attackerToken, targetToken],
    weapons: [makeWeaponStatus()],
    combatState: session.currentState,
  }).find((hex) => hex.hex.q === 2 && hex.hex.r === 0);

  expect(projection).toBeDefined();
  expect(projection).toMatchObject({
    losState: 'clear',
    attackable: true,
    targetPartialCover: false,
    targetCoverModifier: 0,
    toHitNumber: 6,
  });
  expect(projection?.toHitModifiers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'Target Terrain',
        value: 2,
        source: 'terrain',
      }),
    ]),
  );
  expect(projection?.toHitModifiers).not.toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'Partial Cover',
      }),
    ]),
  );

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: buildWeaponsByUnit(),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['medium-laser'],
    grid,
  });

  expect(
    result.events.some((event) => event.type === GameEventType.AttackInvalid),
  ).toBe(false);
  const declared = result.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  );
  expect(declared).toBeDefined();
  const payload = declared!.payload as IAttackDeclaredPayload;
  expect(payload.toHitNumber).toBe(projection!.toHitNumber);
  expect(payload.modifiers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'Target Terrain',
        value: 2,
        source: 'terrain',
      }),
    ]),
  );
  expect(payload.modifiers).not.toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'Partial Cover',
      }),
    ]),
  );
});

it('keeps vehicle target partial-water ineligibility aligned between preview and committed attacks', () => {
  const session = setupVehicleTargetSessionAtWeaponAttack();
  const grid = makeTargetDepthOneWaterGrid();
  const attackerToken = makeToken({
    unitId: 'a1',
    isSelected: true,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
  });
  const targetToken = makeToken({
    unitId: 't1',
    side: GameSide.Opponent,
    position: { q: 2, r: 0 },
    facing: Facing.North,
    unitType: TokenUnitType.Vehicle,
  });

  const projection = deriveCombatRangeHexes({
    attacker: attackerToken,
    hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
    grid,
    tokens: [attackerToken, targetToken],
    weapons: [makeWeaponStatus()],
    combatState: session.currentState,
  }).find((hex) => hex.hex.q === 2 && hex.hex.r === 0);

  expect(projection).toBeDefined();
  expect(projection).toMatchObject({
    losState: 'clear',
    attackable: true,
    targetPartialCover: false,
    targetCoverModifier: 0,
    targetCoverReason: undefined,
    toHitNumber: 4,
  });
  expect(projection?.toHitModifiers).not.toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'Partial Cover',
      }),
    ]),
  );

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: buildWeaponsByUnit(),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['medium-laser'],
    grid,
  });

  expect(
    result.events.some((event) => event.type === GameEventType.AttackInvalid),
  ).toBe(false);
  const declared = result.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  );
  expect(declared).toBeDefined();
  const payload = declared!.payload as IAttackDeclaredPayload;
  expect(payload.toHitNumber).toBe(projection!.toHitNumber);
  expect(payload.modifiers).not.toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'Partial Cover',
      }),
    ]),
  );
});

it('keeps active vehicle target water-cover eligibility when another target shares the hex', () => {
  const session = setupStackedVehicleTargetSessionAtWeaponAttack();
  const grid = makeTargetDepthOneWaterGrid();
  const attackerToken = makeToken({
    unitId: 'a1',
    isSelected: true,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
  });
  const mechTargetToken = makeToken({
    unitId: 't1',
    side: GameSide.Opponent,
    position: { q: 2, r: 0 },
    facing: Facing.North,
    unitType: TokenUnitType.Mech,
  });
  const vehicleTargetToken = makeToken({
    unitId: 'v1',
    side: GameSide.Opponent,
    position: { q: 2, r: 0 },
    facing: Facing.North,
    unitType: TokenUnitType.Vehicle,
  });

  const projection = deriveCombatRangeHexes({
    attacker: attackerToken,
    targetUnitId: 'v1',
    hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
    grid,
    tokens: [attackerToken, mechTargetToken, vehicleTargetToken],
    weapons: [makeWeaponStatus()],
    combatState: session.currentState,
  }).find((hex) => hex.hex.q === 2 && hex.hex.r === 0);

  expect(projection).toBeDefined();
  expect(projection).toMatchObject({
    losState: 'clear',
    attackable: true,
    targetUnitIds: ['t1', 'v1'],
    validTargetUnitIds: ['v1'],
    targetPartialCover: false,
    targetCoverModifier: 0,
    targetCoverReason: undefined,
    toHitNumber: 4,
  });
  expect(projection?.toHitModifiers).not.toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'Partial Cover',
      }),
    ]),
  );

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: buildWeaponsByUnit(),
    attackerId: 'a1',
    targetId: 'v1',
    weaponIds: ['medium-laser'],
    grid,
  });

  expect(
    result.events.some((event) => event.type === GameEventType.AttackInvalid),
  ).toBe(false);
  const declared = result.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  );
  expect(declared).toBeDefined();
  const payload = declared!.payload as IAttackDeclaredPayload;
  expect(payload.targetId).toBe('v1');
  expect(payload.toHitNumber).toBe(projection!.toHitNumber);
  expect(payload.modifiers).not.toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'Partial Cover',
      }),
    ]),
  );
});

it('rejects non-torpedo attacks against represented underwater targets in preview and commit', () => {
  const session = setupSessionAtWeaponAttack();
  const grid = makeTargetDepthTwoWaterGrid();
  const attackerToken = makeToken({
    unitId: 'a1',
    isSelected: true,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
  });
  const targetToken = makeToken({
    unitId: 't1',
    side: GameSide.Opponent,
    position: { q: 2, r: 0 },
    facing: Facing.North,
  });

  const projection = deriveCombatRangeHexes({
    attacker: attackerToken,
    hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
    grid,
    tokens: [attackerToken, targetToken],
    weapons: [makeWeaponStatus()],
    combatState: session.currentState,
  }).find((hex) => hex.hex.q === 2 && hex.hex.r === 0);

  expect(projection).toBeDefined();
  expect(projection).toMatchObject({
    inRange: true,
    inArc: true,
    attackable: false,
    weaponIdsInRange: ['medium-laser'],
    weaponIdsInArc: ['medium-laser'],
    weaponIdsAvailable: [],
    attackInvalidReason: 'InvalidTarget',
    attackInvalidDetails: 'Target underwater, but not weapon.',
    blockedReason: 'Target underwater, but not weapon.',
  });

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: buildWeaponsByUnit(),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['medium-laser'],
    grid,
  });
  const invalid = result.events.find(
    (event) => event.type === GameEventType.AttackInvalid,
  );
  expect(invalid).toBeDefined();
  expect(invalid!.payload).toMatchObject({
    reason: projection!.attackInvalidReason,
    details: projection!.attackInvalidDetails,
  } satisfies Partial<IAttackInvalidPayload>);
});

it('keeps represented torpedo attacks legal only when the full line stays in water', () => {
  const session = setupSessionAtWeaponAttack();
  const grid = makeContinuousWaterAttackGrid();
  const attackerToken = makeToken({
    unitId: 'a1',
    isSelected: true,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
  });
  const targetToken = makeToken({
    unitId: 't1',
    side: GameSide.Opponent,
    position: { q: 2, r: 0 },
    facing: Facing.North,
  });
  const torpedoStatus = makeWeaponStatus({
    id: 'lrt-15',
    name: 'LR Torpedo 15',
    heat: 5,
    damage: 9,
    ranges: { short: 7, medium: 14, long: 21 },
    isTorpedo: true,
  });

  const projection = deriveCombatRangeHexes({
    attacker: attackerToken,
    hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
    grid,
    tokens: [attackerToken, targetToken],
    weapons: [torpedoStatus],
    combatState: session.currentState,
  }).find((hex) => hex.hex.q === 2 && hex.hex.r === 0);

  expect(projection).toBeDefined();
  expect(projection).toMatchObject({
    attackable: true,
    weaponIdsAvailable: ['lrt-15'],
  });

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: buildTorpedoWeaponsByUnit(),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['lrt-15'],
    grid,
  });

  expect(
    result.events.some((event) => event.type === GameEventType.AttackInvalid),
  ).toBe(false);
  const declared = result.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  );
  expect(declared).toBeDefined();
  expect((declared!.payload as IAttackDeclaredPayload).weapons).toEqual([
    'lrt-15',
  ]);

  const brokenGrid = makeTorpedoPathBreakGrid();
  const brokenProjection = deriveCombatRangeHexes({
    attacker: attackerToken,
    hexes: Array.from(brokenGrid.hexes.values(), (hex) => hex.coord),
    grid: brokenGrid,
    tokens: [attackerToken, targetToken],
    weapons: [torpedoStatus],
    combatState: session.currentState,
  }).find((hex) => hex.hex.q === 2 && hex.hex.r === 0);

  expect(brokenProjection).toBeDefined();
  expect(brokenProjection).toMatchObject({
    attackable: false,
    weaponIdsAvailable: [],
    attackInvalidReason: 'InvalidTarget',
    attackInvalidDetails: 'Torpedo path leaves water.',
    blockedReason: 'Torpedo path leaves water.',
  });

  const brokenResult = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: buildTorpedoWeaponsByUnit(),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['lrt-15'],
    grid: brokenGrid,
  });
  const invalid = brokenResult.events.find(
    (event) => event.type === GameEventType.AttackInvalid,
  );
  expect(invalid).toBeDefined();
  expect(invalid!.payload).toMatchObject({
    reason: brokenProjection!.attackInvalidReason,
    details: brokenProjection!.attackInvalidDetails,
  } satisfies Partial<IAttackInvalidPayload>);
});

it('keeps mixed weapon arc range brackets aligned between preview and committed attacks', () => {
  const session = setupSessionAtWeaponAttack();
  session.currentState.units.a1 = {
    ...session.currentState.units.a1,
    facing: Facing.North,
  };
  session.currentState.units.t1 = {
    ...session.currentState.units.t1,
    position: { q: 0, r: 3 },
  };
  const grid = makeClearGrid(3);
  const attackerToken = makeToken({
    unitId: 'a1',
    isSelected: true,
    position: { q: 0, r: 0 },
    facing: Facing.North,
  });
  const targetToken = makeToken({
    unitId: 't1',
    side: GameSide.Opponent,
    position: { q: 0, r: 3 },
    facing: Facing.North,
  });

  const projection = deriveCombatRangeHexes({
    attacker: attackerToken,
    hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
    grid,
    tokens: [attackerToken, targetToken],
    weapons: [
      makeWeaponStatus({
        id: 'front-close',
        ranges: { short: 3, medium: 5, long: 7 },
        mountingArc: FiringArc.Front,
      }),
      makeWeaponStatus({
        id: 'rear-lrm',
        ranges: { short: 2, medium: 4, long: 8 },
        mountingArc: FiringArc.Rear,
      }),
    ],
    combatState: session.currentState,
  }).find((hex) => hex.hex.q === 0 && hex.hex.r === 3);

  expect(projection).toBeDefined();
  expect(projection).toMatchObject({
    attackable: true,
    firingArc: 'rear',
    rangeBracket: RangeBracket.Medium,
    weaponIdsInRange: ['front-close', 'rear-lrm'],
    weaponIdsInArc: ['rear-lrm'],
    weaponIdsAvailable: ['rear-lrm'],
    toHitNumber: 6,
  });
  expect(projection?.toHitModifiers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'Range (medium)',
        value: 2,
        source: 'range',
      }),
    ]),
  );

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: buildMixedArcWeaponsByUnit(),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['front-close', 'rear-lrm'],
    grid,
  });

  expect(
    result.events.some((event) => event.type === GameEventType.AttackInvalid),
  ).toBe(false);
  const declared = result.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  );
  expect(declared).toBeDefined();
  const payload = declared!.payload as IAttackDeclaredPayload;
  expect(payload.weapons).toEqual(projection!.weaponIdsAvailable);
  expect(payload.range).toBe(projection!.rangeBracket);
  expect(payload.toHitNumber).toBe(projection!.toHitNumber);
  expect(payload.modifiers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'Range (medium)',
        value: 2,
        source: 'range',
      }),
    ]),
  );
});

it('keeps selected-weapon arc rejection aligned between preview and committed attacks', () => {
  const session = setupSessionAtWeaponAttack();
  session.currentState.units.a1 = {
    ...session.currentState.units.a1,
    facing: Facing.North,
  };
  session.currentState.units.t1 = {
    ...session.currentState.units.t1,
    position: { q: 0, r: 3 },
  };
  const grid = makeClearGrid(3);
  const attackerToken = makeToken({
    unitId: 'a1',
    isSelected: true,
    position: { q: 0, r: 0 },
    facing: Facing.North,
  });
  const targetToken = makeToken({
    unitId: 't1',
    side: GameSide.Opponent,
    position: { q: 0, r: 3 },
    facing: Facing.North,
  });

  const projection = deriveCombatRangeHexes({
    attacker: attackerToken,
    hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
    grid,
    tokens: [attackerToken, targetToken],
    weapons: [
      makeWeaponStatus({
        id: 'front-close',
        ranges: { short: 3, medium: 5, long: 7 },
        mountingArc: FiringArc.Front,
      }),
    ],
    combatState: session.currentState,
  }).find((hex) => hex.hex.q === 0 && hex.hex.r === 3);

  expect(projection).toBeDefined();
  expect(projection).toMatchObject({
    attackable: false,
    firingArc: 'rear',
    rangeBracket: RangeBracket.Short,
    weaponIdsInRange: ['front-close'],
    weaponIdsInArc: [],
    weaponIdsAvailable: [],
  });

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: buildMixedArcWeaponsByUnit(),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['front-close'],
    grid,
  });

  expect(
    result.events.some((event) => event.type === GameEventType.AttackDeclared),
  ).toBe(false);
  const invalid = result.events.find(
    (event) => event.type === GameEventType.AttackInvalid,
  );
  expect(invalid).toBeDefined();
  expect(invalid!.payload).toMatchObject({
    reason: projection!.attackInvalidReason,
    details: projection!.attackInvalidDetails,
  } satisfies Partial<IAttackInvalidPayload>);
});

it('keeps represented multi-arc weapon mounts aligned between preview and committed attacks', () => {
  const session = setupSessionAtWeaponAttack();
  session.currentState.units.a1 = {
    ...session.currentState.units.a1,
    facing: Facing.North,
  };
  session.currentState.units.t1 = {
    ...session.currentState.units.t1,
    position: { q: -1, r: 1 },
  };
  const grid = makeClearGrid(3);
  const attackerToken = makeToken({
    unitId: 'a1',
    isSelected: true,
    position: { q: 0, r: 0 },
    facing: Facing.North,
  });
  const targetToken = makeToken({
    unitId: 't1',
    side: GameSide.Opponent,
    position: { q: -1, r: 1 },
    facing: Facing.North,
  });

  const projection = deriveCombatRangeHexes({
    attacker: attackerToken,
    hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
    grid,
    tokens: [attackerToken, targetToken],
    weapons: [
      makeWeaponStatus({
        id: 'left-sponson-laser',
        ranges: { short: 3, medium: 5, long: 7 },
        mountingArcs: [FiringArc.Front, FiringArc.Left],
      }),
    ],
    combatState: session.currentState,
  }).find((hex) => hex.hex.q === -1 && hex.hex.r === 1);

  expect(projection).toBeDefined();
  expect(projection).toMatchObject({
    attackable: true,
    firingArc: 'left-side',
    weaponIdsInArc: ['left-sponson-laser'],
    weaponIdsAvailable: ['left-sponson-laser'],
  });

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: buildMultiArcWeaponsByUnit(),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['left-sponson-laser'],
    grid,
  });

  expect(
    result.events.some((event) => event.type === GameEventType.AttackInvalid),
  ).toBe(false);
  const declared = result.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  );
  expect(declared).toBeDefined();
  const payload = declared!.payload as IAttackDeclaredPayload;
  expect(payload.weapons).toEqual(projection!.weaponIdsAvailable);
  expect(payload.range).toBe(projection!.rangeBracket);
  expect(payload.toHitNumber).toBe(projection!.toHitNumber);
});

// Audit C-8: arm-mounted mech weapons hydrate with MegaMek front+side
// arcs (Mek.getWeaponArc ARC_LEFTARM/ARC_RIGHTARM). This agreement check
// feeds the REAL UnitHydration output (not a hand-written fixture) into
// both the tactical-map projection and the committed attack path so the
// two stay aligned for an arm weapon firing at a side-arc target.
it('keeps hydrated arm-mounted weapon side-arc coverage aligned between preview and committed attacks (audit C-8)', () => {
  const weaponLookup = buildWeaponLookupFromCatalogFiles(
    WEAPON_CATALOG_FILES as readonly { items?: readonly unknown[] }[],
  );
  const fullUnit: IFullUnit = {
    id: 'synthetic-arm-arc-agreement',
    chassis: 'Synthetic',
    variant: 'Arm Arc Agreement',
    tonnage: 50,
    techBase: 'Inner Sphere',
    era: '3025',
    unitType: 'BattleMech',
    equipment: [{ id: 'medium-laser', location: 'LEFT_ARM' }],
  };
  const hydrated = hydrateAIWeaponsFromFullUnit(fullUnit, weaponLookup);
  expect(hydrated).toHaveLength(1);
  const [armLaser] = hydrated;

  const session = setupSessionAtWeaponAttack();
  session.currentState.units.a1 = {
    ...session.currentState.units.a1,
    facing: Facing.North,
  };
  session.currentState.units.t1 = {
    ...session.currentState.units.t1,
    position: { q: -1, r: 1 },
  };
  const grid = makeClearGrid(3);
  const attackerToken = makeToken({
    unitId: 'a1',
    isSelected: true,
    position: { q: 0, r: 0 },
    facing: Facing.North,
  });
  const targetToken = makeToken({
    unitId: 't1',
    side: GameSide.Opponent,
    position: { q: -1, r: 1 },
    facing: Facing.North,
  });

  const projection = deriveCombatRangeHexes({
    attacker: attackerToken,
    hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
    grid,
    tokens: [attackerToken, targetToken],
    weapons: [
      makeWeaponStatus({
        id: armLaser.id,
        ranges: {
          short: armLaser.shortRange,
          medium: armLaser.mediumRange,
          long: armLaser.longRange,
        },
        mountingArc: armLaser.mountingArc,
        mountingArcs: armLaser.mountingArcs,
      }),
    ],
    combatState: session.currentState,
  }).find((hex) => hex.hex.q === -1 && hex.hex.r === 1);

  expect(projection).toBeDefined();
  expect(projection).toMatchObject({
    attackable: true,
    firingArc: 'left-side',
    weaponIdsInArc: [armLaser.id],
    weaponIdsAvailable: [armLaser.id],
  });

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: new Map([['a1', hydrated]]),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: [armLaser.id],
    grid,
  });

  expect(
    result.events.some((event) => event.type === GameEventType.AttackInvalid),
  ).toBe(false);
  const declared = result.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  );
  expect(declared).toBeDefined();
  const payload = declared!.payload as IAttackDeclaredPayload;
  expect(payload.weapons).toEqual(projection!.weaponIdsAvailable);
  expect(payload.range).toBe(projection!.rangeBracket);
  expect(payload.toHitNumber).toBe(projection!.toHitNumber);
});

it('uses C3 spotter range brackets in preview and committed attacks', () => {
  const session = setupC3SessionAtWeaponAttack();
  const grid = makeClearGrid(6);
  const attackerToken = makeToken({
    unitId: 'a1',
    isSelected: true,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
  });
  const targetToken = makeToken({
    unitId: 't1',
    side: GameSide.Opponent,
    position: { q: 6, r: 0 },
    facing: Facing.North,
  });

  const projection = deriveCombatRangeHexes({
    attacker: attackerToken,
    hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
    grid,
    tokens: [attackerToken, targetToken],
    weapons: [makeWeaponStatus()],
    combatState: session.currentState,
  }).find((hex) => hex.hex.q === 6 && hex.hex.r === 0);

  expect(projection).toBeDefined();
  expect(projection).toMatchObject({
    attackable: true,
    rangeBracket: RangeBracket.Short,
    c3BenefitApplied: true,
    c3SpotterId: 's1',
    c3SpotterRange: 2,
    toHitNumber: 4,
  });
  expect(projection?.toHitModifiers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'Range (short)',
        value: 0,
        source: 'range',
      }),
      expect.objectContaining({
        name: 'C3 Network',
        value: 0,
        source: 'equipment',
      }),
    ]),
  );

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: buildWeaponsByUnit(),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['medium-laser'],
    grid,
  });

  expect(
    result.events.some((event) => event.type === GameEventType.AttackInvalid),
  ).toBe(false);
  const declared = result.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  );
  expect(declared).toBeDefined();
  const payload = declared!.payload as IAttackDeclaredPayload;
  expect(payload.range).toBe(projection!.rangeBracket);
  expect(payload.toHitNumber).toBe(projection!.toHitNumber);
  expect(payload.modifiers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'Range (short)',
        value: 0,
        source: 'range',
      }),
      expect.objectContaining({
        name: 'C3 Network',
        value: 0,
        source: 'equipment',
      }),
    ]),
  );
});

it('keeps prone attacker and target to-hit modifiers aligned between preview and committed attacks', () => {
  const session = setupSessionAtWeaponAttack();
  session.currentState.units.a1 = {
    ...session.currentState.units.a1,
    prone: true,
  };
  session.currentState.units.t1 = {
    ...session.currentState.units.t1,
    prone: true,
  };
  const grid = makeIndirectFireWreckGrid();
  const attackerToken = makeToken({
    unitId: 'a1',
    isSelected: true,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
  });
  const targetToken = makeToken({
    unitId: 't1',
    side: GameSide.Opponent,
    position: { q: 2, r: 0 },
    facing: Facing.North,
  });

  const projection = deriveCombatRangeHexes({
    attacker: attackerToken,
    hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
    grid,
    tokens: [attackerToken, targetToken],
    weapons: [makeWeaponStatus()],
    combatState: session.currentState,
  }).find((hex) => hex.hex.q === 2 && hex.hex.r === 0);

  expect(projection).toBeDefined();
  expect(projection).toMatchObject({
    attackable: true,
    toHitNumber: 7,
  });
  expect(projection?.toHitModifiers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'Attacker Prone',
        value: 2,
        source: 'other',
      }),
      expect.objectContaining({
        name: 'Target Prone',
        value: 1,
        source: 'other',
      }),
    ]),
  );

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: buildWeaponsByUnit(),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['medium-laser'],
    grid,
  });

  expect(
    result.events.some((event) => event.type === GameEventType.AttackInvalid),
  ).toBe(false);
  const declared = result.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  );
  expect(declared).toBeDefined();
  const payload = declared!.payload as IAttackDeclaredPayload;
  expect(payload.toHitNumber).toBe(projection!.toHitNumber);
  expect(payload.modifiers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'Attacker Prone',
        value: 2,
        source: 'other',
      }),
      expect.objectContaining({
        name: 'Target Prone',
        value: 1,
        source: 'other',
      }),
    ]),
  );
});

it('keeps shutdown target immobile modifiers aligned between preview and committed attacks', () => {
  const session = setupSessionAtWeaponAttack();
  session.currentState.units.t1 = {
    ...session.currentState.units.t1,
    shutdown: true,
  };
  const grid = makeIndirectFireWreckGrid();
  const attackerToken = makeToken({
    unitId: 'a1',
    isSelected: true,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
  });
  const targetToken = makeToken({
    unitId: 't1',
    side: GameSide.Opponent,
    position: { q: 2, r: 0 },
    facing: Facing.North,
  });

  const projection = deriveCombatRangeHexes({
    attacker: attackerToken,
    hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
    grid,
    tokens: [attackerToken, targetToken],
    weapons: [makeWeaponStatus()],
    combatState: session.currentState,
  }).find((hex) => hex.hex.q === 2 && hex.hex.r === 0);

  expect(projection).toBeDefined();
  expect(projection).toMatchObject({
    attackable: true,
    toHitNumber: 0,
  });
  expect(projection?.toHitModifiers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'Target Immobile',
        value: -4,
        source: 'other',
      }),
    ]),
  );

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: buildWeaponsByUnit(),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['medium-laser'],
    grid,
  });

  expect(
    result.events.some((event) => event.type === GameEventType.AttackInvalid),
  ).toBe(false);
  const declared = result.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  );
  expect(declared).toBeDefined();
  const payload = declared!.payload as IAttackDeclaredPayload;
  expect(payload.toHitNumber).toBe(projection!.toHitNumber);
  expect(payload.modifiers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'Target Immobile',
        value: -4,
        source: 'other',
      }),
    ]),
  );
});

it('keeps minimum-range preview penalties aligned with committed to-hit modifiers', () => {
  const session = setupSessionAtWeaponAttack();
  session.currentState.units.t1 = {
    ...session.currentState.units.t1,
    position: { q: 3, r: 0 },
  };
  const grid = makeIndirectFireWreckGrid();
  const attackerToken = makeToken({
    unitId: 'a1',
    isSelected: true,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
  });
  const targetToken = makeToken({
    unitId: 't1',
    side: GameSide.Opponent,
    position: { q: 3, r: 0 },
    facing: Facing.North,
  });

  const projection = deriveCombatRangeHexes({
    attacker: attackerToken,
    hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
    grid,
    tokens: [attackerToken, targetToken],
    weapons: [
      makeWeaponStatus({
        id: 'lrm-15-1',
        name: 'LRM-15',
        heat: 5,
        damage: 9,
        ranges: { short: 7, medium: 14, long: 21, minimum: 6 },
      }),
    ],
    combatState: session.currentState,
  }).find((hex) => hex.hex.q === 3 && hex.hex.r === 0);

  expect(projection).toBeDefined();
  expect(projection).toMatchObject({
    attackable: true,
    rangeBracket: RangeBracket.Short,
    minimumRangePenalty: 4,
    minimumRangeWeaponIds: ['lrm-15-1'],
    minimumRangeReason: 'Minimum range penalty +4 (lrm-15-1)',
    toHitNumber: 8,
  });
  expect(projection?.toHitModifiers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'Minimum Range',
        value: 4,
        source: 'range',
      }),
    ]),
  );

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: buildMinimumRangeWeaponsByUnit(),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['lrm-15-1'],
    grid,
  });

  const declared = result.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  );
  expect(declared).toBeDefined();
  const payload = declared!.payload as IAttackDeclaredPayload;
  const minimumRangeModifier = payload.modifiers.find(
    (modifier) => modifier.name === 'Minimum Range',
  );
  expect(minimumRangeModifier).toMatchObject({
    value: projection!.minimumRangePenalty,
    source: 'range',
  });
  expect(payload.toHitNumber).toBe(projection!.toHitNumber);
});

it('applies the +1 minimum-range penalty at exactly minimum range in both preview and committed attacks', () => {
  // Audit B-6 (W1.2): MegaMek Compute.java#L1714-L1716 applies the penalty
  // when `distance <= minRange` — +1 AT exactly minimum range. The
  // projection previously used a strict `minimum > distance` comparison,
  // so the previewed (and stamped) to-hit silently dropped the +1 the
  // engine's own calculator produces.
  const session = setupSessionAtWeaponAttack();
  session.currentState.units.t1 = {
    ...session.currentState.units.t1,
    position: { q: 6, r: 0 },
  };
  const grid = makeClearGrid(8);
  const attackerToken = makeToken({
    unitId: 'a1',
    isSelected: true,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
  });
  const targetToken = makeToken({
    unitId: 't1',
    side: GameSide.Opponent,
    position: { q: 6, r: 0 },
    facing: Facing.North,
  });

  const projection = deriveCombatRangeHexes({
    attacker: attackerToken,
    hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
    grid,
    tokens: [attackerToken, targetToken],
    weapons: [
      makeWeaponStatus({
        id: 'lrm-15-1',
        name: 'LRM-15',
        heat: 5,
        damage: 9,
        ranges: { short: 7, medium: 14, long: 21, minimum: 6 },
      }),
    ],
    combatState: session.currentState,
  }).find((hex) => hex.hex.q === 6 && hex.hex.r === 0);

  expect(projection).toBeDefined();
  expect(projection).toMatchObject({
    attackable: true,
    rangeBracket: RangeBracket.Short,
    minimumRangePenalty: 1,
    minimumRangeWeaponIds: ['lrm-15-1'],
    minimumRangeReason: 'Minimum range penalty +1 (lrm-15-1)',
    toHitNumber: 5,
  });
  expect(projection?.toHitModifiers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'Minimum Range',
        value: 1,
        source: 'range',
      }),
    ]),
  );

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: buildMinimumRangeWeaponsByUnit(),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['lrm-15-1'],
    grid,
  });

  const declared = result.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  );
  expect(declared).toBeDefined();
  const payload = declared!.payload as IAttackDeclaredPayload;
  expect(payload.modifiers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'Minimum Range',
        value: 1,
        source: 'range',
      }),
    ]),
  );
  expect(payload.toHitNumber).toBe(projection!.toHitNumber);
});

it('keeps evading attackers blocked in both preview and committed attacks', () => {
  // Audit B-2 (W1.2): the engine commit path rejects evading attackers
  // (declareAttack -> invalidateEvadingAttackerAttack). The projection must
  // refuse the same hexes with the same reason/details instead of
  // previewing an attack the engine will refuse.
  const session = setupSessionAtWeaponAttack();
  session.currentState.units.a1 = {
    ...session.currentState.units.a1,
    isEvading: true,
  };
  const grid = makeClearGrid(3);
  const attackerToken = makeToken({
    unitId: 'a1',
    isSelected: true,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
  });
  const targetToken = makeToken({
    unitId: 't1',
    side: GameSide.Opponent,
    position: { q: 2, r: 0 },
    facing: Facing.North,
  });

  const projection = deriveCombatRangeHexes({
    attacker: attackerToken,
    hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
    grid,
    tokens: [attackerToken, targetToken],
    weapons: [makeWeaponStatus()],
    combatState: session.currentState,
  }).find((hex) => hex.hex.q === 2 && hex.hex.r === 0);

  expect(projection).toBeDefined();
  expect(projection).toMatchObject({
    attackable: false,
    attackInvalidReason: 'AttackerEvading',
    attackInvalidDetails:
      "Attacker 'a1' is evading and cannot fire ranged weapons",
    blockedReason: "Attacker 'a1' is evading and cannot fire ranged weapons",
    validTargetUnitIds: [],
  });

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: buildWeaponsByUnit(),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['medium-laser'],
    grid,
  });

  expect(
    result.events.some((event) => event.type === GameEventType.AttackDeclared),
  ).toBe(false);
  const invalid = result.events.find(
    (event) => event.type === GameEventType.AttackInvalid,
  );
  expect(invalid).toBeDefined();
  expect(invalid!.payload as IAttackInvalidPayload).toMatchObject({
    attackerId: 'a1',
    targetId: 't1',
    weaponId: 'medium-laser',
    reason: projection!.attackInvalidReason,
    details: projection!.attackInvalidDetails,
  });
});

it('keeps sprinting attackers blocked in both preview and committed attacks', () => {
  // Audit B-2 (W1.2): same agreement contract as the evading gate —
  // declareAttack -> invalidateSprintingAttackerAttack on the engine side.
  const session = setupSessionAtWeaponAttack();
  session.currentState.units.a1 = {
    ...session.currentState.units.a1,
    sprintedThisTurn: true,
  };
  const grid = makeClearGrid(3);
  const attackerToken = makeToken({
    unitId: 'a1',
    isSelected: true,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
  });
  const targetToken = makeToken({
    unitId: 't1',
    side: GameSide.Opponent,
    position: { q: 2, r: 0 },
    facing: Facing.North,
  });

  const projection = deriveCombatRangeHexes({
    attacker: attackerToken,
    hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
    grid,
    tokens: [attackerToken, targetToken],
    weapons: [makeWeaponStatus()],
    combatState: session.currentState,
  }).find((hex) => hex.hex.q === 2 && hex.hex.r === 0);

  expect(projection).toBeDefined();
  expect(projection).toMatchObject({
    attackable: false,
    attackInvalidReason: 'AttackerSprinted',
    attackInvalidDetails:
      "Attacker 'a1' sprinted and cannot fire ranged weapons",
    blockedReason: "Attacker 'a1' sprinted and cannot fire ranged weapons",
    validTargetUnitIds: [],
  });

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: buildWeaponsByUnit(),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['medium-laser'],
    grid,
  });

  expect(
    result.events.some((event) => event.type === GameEventType.AttackDeclared),
  ).toBe(false);
  const invalid = result.events.find(
    (event) => event.type === GameEventType.AttackInvalid,
  );
  expect(invalid).toBeDefined();
  expect(invalid!.payload as IAttackInvalidPayload).toMatchObject({
    attackerId: 'a1',
    targetId: 't1',
    weaponId: 'medium-laser',
    reason: projection!.attackInvalidReason,
    details: projection!.attackInvalidDetails,
  });
});

it('keeps extreme-range preview brackets aligned with committed attacks', () => {
  const session = setupSessionAtWeaponAttack();
  session.currentState.units.t1 = {
    ...session.currentState.units.t1,
    position: { q: 8, r: 0 },
  };
  const grid = makeClearGrid(8);
  const attackerToken = makeToken({
    unitId: 'a1',
    isSelected: true,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
  });
  const targetToken = makeToken({
    unitId: 't1',
    side: GameSide.Opponent,
    position: { q: 8, r: 0 },
    facing: Facing.North,
  });

  const projection = deriveCombatRangeHexes({
    attacker: attackerToken,
    hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
    grid,
    tokens: [attackerToken, targetToken],
    weapons: [
      makeWeaponStatus({
        id: 'extreme-ac',
        name: 'Extreme AC',
        ranges: { short: 2, medium: 4, long: 6, extreme: 9 },
      }),
    ],
    combatState: session.currentState,
  }).find((hex) => hex.hex.q === 8 && hex.hex.r === 0);

  expect(projection).toBeDefined();
  expect(projection).toMatchObject({
    attackable: true,
    rangeBracket: RangeBracket.Extreme,
    toHitNumber: 10,
  });
  expect(projection?.toHitModifiers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'Range (extreme)',
        value: 6,
        source: 'range',
      }),
    ]),
  );

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: buildExtremeRangeWeaponsByUnit(),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['extreme-ac'],
    grid,
  });

  const declared = result.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  );
  expect(declared).toBeDefined();
  const payload = declared!.payload as IAttackDeclaredPayload;
  expect(payload.range).toBe(projection!.rangeBracket);
  expect(payload.toHitNumber).toBe(projection!.toHitNumber);
  expect(payload.modifiers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'Range (extreme)',
        value: 6,
        source: 'range',
      }),
    ]),
  );
});

it('keeps airborne aerospace targets exempt from minimum-range preview and committed to-hit modifiers', () => {
  const session = setupSessionAtWeaponAttack();
  session.currentState.units.t1 = {
    ...session.currentState.units.t1,
    position: { q: 3, r: 0 },
    combatState: {
      kind: 'aero',
      state: makeAerospaceCombatState(3),
    },
  };
  const grid = makeIndirectFireWreckGrid();
  const attackerToken = makeToken({
    unitId: 'a1',
    isSelected: true,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
  });
  const targetToken = makeToken({
    unitId: 't1',
    side: GameSide.Opponent,
    position: { q: 3, r: 0 },
    facing: Facing.North,
    unitType: TokenUnitType.Aerospace,
    altitude: 3,
  });

  const projection = deriveCombatRangeHexes({
    attacker: attackerToken,
    hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
    grid,
    tokens: [attackerToken, targetToken],
    weapons: [
      makeWeaponStatus({
        id: 'lrm-15-1',
        name: 'LRM-15',
        heat: 5,
        damage: 9,
        ranges: { short: 7, medium: 14, long: 21, minimum: 6 },
      }),
    ],
    combatState: session.currentState,
  }).find((hex) => hex.hex.q === 3 && hex.hex.r === 0);

  expect(projection).toBeDefined();
  expect(projection).toMatchObject({
    attackable: true,
    rangeBracket: RangeBracket.Short,
    toHitNumber: 5,
  });
  expect(projection?.minimumRangePenalty).toBeUndefined();
  expect(projection?.minimumRangeReason).toBeUndefined();
  expect(projection?.toHitModifiers).not.toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'Minimum Range',
      }),
    ]),
  );
  expect(projection?.toHitModifiers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'Ground-to-air altitude',
        value: 1,
        source: 'other',
      }),
    ]),
  );

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: buildMinimumRangeWeaponsByUnit(),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['lrm-15-1'],
    grid,
  });

  const declared = result.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  );
  expect(declared).toBeDefined();
  const payload = declared!.payload as IAttackDeclaredPayload;
  expect(payload.modifiers).not.toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'Minimum Range',
      }),
    ]),
  );
  expect(payload.modifiers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'Ground-to-air altitude',
        value: 1,
        source: 'other',
      }),
    ]),
  );
  expect(payload.toHitNumber).toBe(projection!.toHitNumber);
});

it('keeps out-of-ammo preview rejection aligned with attack resolution', () => {
  const session = setupSessionAtWeaponAttack();
  const grid = makeIndirectFireWreckGrid();
  const attackerToken = makeToken({
    unitId: 'a1',
    isSelected: true,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
  });
  const targetToken = makeToken({
    unitId: 't1',
    side: GameSide.Opponent,
    position: { q: 2, r: 0 },
    facing: Facing.North,
  });

  const projection = deriveCombatRangeHexes({
    attacker: attackerToken,
    hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
    grid,
    tokens: [attackerToken, targetToken],
    weapons: [
      makeWeaponStatus({
        id: 'ac-5-1',
        name: 'AC/5',
        heat: 1,
        damage: 5,
        ammoRemaining: 0,
        ranges: { short: 3, medium: 6, long: 9 },
      }),
    ],
    combatState: session.currentState,
  }).find((hex) => hex.hex.q === 2 && hex.hex.r === 0);

  expect(projection).toMatchObject({
    attackable: false,
    attackInvalidReason: 'OutOfAmmo',
    attackInvalidDetails: 'No matching non-empty ammo bin for "AC/5"',
    blockedReason: 'No matching non-empty ammo bin for "AC/5"',
  });

  const declaredSession = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: buildDryAmmoWeaponsByUnit(),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['ac-5-1'],
    grid,
  });
  const declared = declaredSession.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  );
  expect(declared).toBeDefined();

  const resolvedSession = resolveAttack(declaredSession, declared!);
  const invalid = resolvedSession.events.find(
    (event) => event.type === GameEventType.AttackInvalid,
  );
  expect(invalid).toBeDefined();
  expect(invalid!.payload as IAttackInvalidPayload).toMatchObject({
    attackerId: 'a1',
    targetId: 't1',
    weaponId: 'ac-5-1',
    reason: projection!.attackInvalidReason,
    details: projection!.attackInvalidDetails,
  });
});

it('keeps LOS-blocked indirect-fire preview aligned with a committed spotter attack', () => {
  const session = setupIndirectSessionAtWeaponAttack();
  const grid = makeIndirectFireGrid();
  const attackerToken = makeToken({
    unitId: 'a1',
    isSelected: true,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
  });
  const spotterToken = makeToken({
    unitId: 's1',
    position: { q: 5, r: 1 },
    facing: Facing.North,
  });
  const targetToken = makeToken({
    unitId: 't1',
    side: GameSide.Opponent,
    position: { q: 5, r: 0 },
    facing: Facing.North,
  });

  const projection = deriveCombatRangeHexes({
    attacker: attackerToken,
    hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
    grid,
    tokens: [attackerToken, spotterToken, targetToken],
    weapons: [
      makeWeaponStatus({
        id: 'lrm-15-1',
        name: 'LRM-15',
        heat: 5,
        damage: 9,
        ranges: { short: 7, medium: 14, long: 21 },
      }),
    ],
    combatState: session.currentState,
  }).find((hex) => hex.hex.q === 5 && hex.hex.r === 0);

  expect(projection).toBeDefined();
  expect(projection).toMatchObject({
    losState: 'blocked',
    attackable: true,
    indirectFireAvailable: true,
    indirectFireSpotterId: 's1',
    indirectFireBasis: 'los',
    indirectFireToHitPenalty: 1,
    indirectFireReason: 'Indirect fire via spotter s1 (+1)',
  });
  expect(projection?.attackInvalidReason).toBeUndefined();

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: buildIndirectWeaponsByUnit(),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['lrm-15-1'],
    grid,
  });

  expect(
    result.events.some((event) => event.type === GameEventType.AttackInvalid),
  ).toBe(false);
  expect(
    result.events.some((event) => event.type === GameEventType.AttackDeclared),
  ).toBe(true);
  expect(
    result.events.some(
      (event) => event.type === GameEventType.IndirectFireSpotterSelected,
    ),
  ).toBe(true);
});

it('keeps run-moved indirect-fire spotter ineligibility aligned between preview and commit', () => {
  const session = setupIndirectSessionAtWeaponAttack();
  session.currentState.units.s1 = {
    ...session.currentState.units.s1,
    movementThisTurn: MovementType.Run,
  };
  const grid = makeIndirectFireGrid();
  const attackerToken = makeToken({
    unitId: 'a1',
    isSelected: true,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
  });
  const spotterToken = makeToken({
    unitId: 's1',
    position: { q: 5, r: 1 },
    facing: Facing.North,
  });
  const targetToken = makeToken({
    unitId: 't1',
    side: GameSide.Opponent,
    position: { q: 5, r: 0 },
    facing: Facing.North,
  });

  const projection = deriveCombatRangeHexes({
    attacker: attackerToken,
    hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
    grid,
    tokens: [attackerToken, spotterToken, targetToken],
    weapons: [
      makeWeaponStatus({
        id: 'lrm-15-1',
        name: 'LRM-15',
        heat: 5,
        damage: 9,
        ranges: { short: 7, medium: 14, long: 21 },
      }),
    ],
    combatState: session.currentState,
  }).find((hex) => hex.hex.q === 5 && hex.hex.r === 0);

  expect(projection).toMatchObject({
    attackable: false,
    indirectFireAvailable: undefined,
    indirectFireSpotterId: undefined,
    indirectFireBasis: undefined,
    indirectFireToHitPenalty: undefined,
  });

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: buildIndirectWeaponsByUnit(),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['lrm-15-1'],
    grid,
  });

  expect(
    result.events.some((event) => event.type === GameEventType.AttackInvalid),
  ).toBe(true);
  const declared = result.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  );
  expect(declared).toBeUndefined();
  const invalid = result.events.find(
    (event) => event.type === GameEventType.AttackInvalid,
  );
  expect(invalid?.payload as IAttackInvalidPayload).toMatchObject({
    reason: projection!.attackInvalidReason,
    details: projection!.attackInvalidDetails,
  });
});

it.each([
  {
    markerKey: 'narcMarkedByTeams',
    basis: 'narc',
    reason: 'Indirect fire via NARC beacon (+1)',
  },
  {
    markerKey: 'iNarcMarkedByTeams',
    basis: 'inarc',
    reason: 'Indirect fire via INARC beacon (+1)',
  },
] as const)(
  'keeps LOS-blocked indirect-fire preview aligned with committed $basis beacon attacks',
  ({ markerKey, basis, reason }) => {
    const session = setupIndirectNoSpotterSessionAtWeaponAttack();
    (
      session.currentState.units.t1 as unknown as {
        [key in typeof markerKey]: string[];
      }
    )[markerKey] = [GameSide.Player as string];
    const grid = makeIndirectFireGrid();
    const attackerToken = makeToken({
      unitId: 'a1',
      isSelected: true,
      position: { q: 0, r: 0 },
      facing: Facing.Southeast,
    });
    const targetToken = makeToken({
      unitId: 't1',
      side: GameSide.Opponent,
      position: { q: 5, r: 0 },
      facing: Facing.North,
    });

    const projection = deriveCombatRangeHexes({
      attacker: attackerToken,
      hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
      grid,
      tokens: [attackerToken, targetToken],
      weapons: [
        makeWeaponStatus({
          id: 'lrm-15-1',
          name: 'LRM-15',
          heat: 5,
          damage: 9,
          ranges: { short: 7, medium: 14, long: 21 },
        }),
      ],
      combatState: session.currentState,
    }).find((hex) => hex.hex.q === 5 && hex.hex.r === 0);

    expect(projection).toBeDefined();
    expect(projection).toMatchObject({
      losState: 'blocked',
      attackable: true,
      indirectFireAvailable: true,
      indirectFireSpotterId: null,
      indirectFireBasis: basis,
      indirectFireToHitPenalty: 1,
      indirectFireReason: reason,
    });
    expect(projection?.attackInvalidReason).toBeUndefined();

    const result = applyInteractiveSessionAttack({
      session,
      weaponsByUnit: buildIndirectWeaponsByUnit(),
      attackerId: 'a1',
      targetId: 't1',
      weaponIds: ['lrm-15-1'],
      grid,
    });

    expect(
      result.events.some((event) => event.type === GameEventType.AttackInvalid),
    ).toBe(false);
    const declared = result.events.find(
      (event) => event.type === GameEventType.AttackDeclared,
    );
    expect(declared).toBeDefined();
    expect((declared!.payload as IAttackDeclaredPayload).toHitNumber).toBe(
      projection!.toHitNumber,
    );
    expect(
      result.events.some(
        (event) => event.type === GameEventType.IndirectFireSpotterSelected,
      ),
    ).toBe(false);
    const override = result.events.find(
      (event) => event.type === GameEventType.IndirectFireNarcOverride,
    );
    expect(override).toBeDefined();
    expect(override!.payload as IIndirectFireNarcOverridePayload).toMatchObject(
      {
        attackerId: 'a1',
        spotterId: null,
        weaponId: 'lrm-15-1',
        basis,
        toHitPenalty: projection!.indirectFireToHitPenalty,
        targetHex: { q: 5, r: 0 },
      },
    );
  },
);

it('keeps LOS-blocked semi-guided TAG preview aligned with a committed no-spotter attack', () => {
  const session = setupIndirectNoSpotterSessionAtWeaponAttack();
  session.currentState.units.t1 = {
    ...session.currentState.units.t1,
    tagDesignated: true,
  };
  const grid = makeIndirectFireGrid();
  const attackerToken = makeToken({
    unitId: 'a1',
    isSelected: true,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
  });
  const targetToken = makeToken({
    unitId: 't1',
    side: GameSide.Opponent,
    position: { q: 5, r: 0 },
    facing: Facing.North,
  });

  const projection = deriveCombatRangeHexes({
    attacker: attackerToken,
    hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
    grid,
    tokens: [attackerToken, targetToken],
    weapons: [
      makeWeaponStatus({
        id: 'semi-guided-lrm-15',
        name: 'Semi-Guided LRM-15',
        heat: 5,
        damage: 9,
        ranges: { short: 7, medium: 14, long: 21 },
      }),
    ],
    combatState: session.currentState,
  }).find((hex) => hex.hex.q === 5 && hex.hex.r === 0);

  expect(projection).toBeDefined();
  expect(projection).toMatchObject({
    losState: 'blocked',
    attackable: true,
    indirectFireAvailable: true,
    indirectFireSpotterId: null,
    indirectFireBasis: 'semi-guided-tag',
    indirectFireToHitPenalty: 0,
    indirectFireReason:
      'Semi-guided indirect fire via TAG (no indirect penalty)',
  });
  expect(projection?.attackInvalidReason).toBeUndefined();

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: buildSemiGuidedWeaponsByUnit(),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['semi-guided-lrm-15'],
    grid,
  });

  expect(
    result.events.some((event) => event.type === GameEventType.AttackInvalid),
  ).toBe(false);
  const declared = result.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  );
  expect(declared).toBeDefined();
  expect((declared!.payload as IAttackDeclaredPayload).toHitNumber).toBe(
    projection!.toHitNumber,
  );
  expect(
    result.events.some(
      (event) => event.type === GameEventType.IndirectFireSpotterSelected,
    ),
  ).toBe(false);
  expect(
    result.events.some(
      (event) => event.type === GameEventType.IndirectFireNarcOverride,
    ),
  ).toBe(false);
});

it('keeps moving-target semi-guided TAG to-hit anchored to an independent engine recomputation', () => {
  const session = setupSessionAtWeaponAttack();
  session.currentState.units.t1 = {
    ...session.currentState.units.t1,
    movementThisTurn: MovementType.Walk,
    hexesMovedThisTurn: 5,
    tagDesignated: true,
  };
  const grid = makeClearGrid(3);
  const attackerToken = makeToken({
    unitId: 'a1',
    isSelected: true,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
  });
  const targetToken = makeToken({
    unitId: 't1',
    side: GameSide.Opponent,
    position: { q: 2, r: 0 },
    facing: Facing.North,
  });
  const weaponsByUnit = buildSemiGuidedWeaponsByUnit();
  const weapon = weaponsByUnit.get('a1')![0];

  const projection = deriveCombatRangeHexes({
    attacker: attackerToken,
    hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
    grid,
    tokens: [attackerToken, targetToken],
    weapons: [
      makeWeaponStatus({
        id: 'semi-guided-lrm-15',
        name: 'Semi-Guided LRM-15',
        heat: 5,
        damage: 9,
        ranges: { short: 7, medium: 14, long: 21 },
      }),
    ],
    combatState: session.currentState,
  }).find((hex) => hex.hex.q === 2 && hex.hex.r === 0);

  expect(projection).toBeDefined();
  expect(projection?.attackable).toBe(true);

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit,
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['semi-guided-lrm-15'],
    grid,
  });

  expect(
    result.events.some((event) => event.type === GameEventType.AttackInvalid),
  ).toBe(false);
  const declared = result.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  );
  expect(declared).toBeDefined();
  const payload = declared!.payload as IAttackDeclaredPayload;
  expect(payload.toHitNumber).toBe(projection!.toHitNumber);
  expectDeclaredToHitMatchesIndependentEngineToHit({
    payload,
    range: projection!.distance,
    rangeBracket: projection!.rangeBracket,
    session,
    weapon,
  });
});

it.each([
  ['non-TAG target', false, false],
  ['ECM-protected TAG target', true, true],
])(
  'keeps moving-target semi-guided attacks from over-cancelling TMM for a %s',
  (_caseName, tagDesignated, ecmProtected) => {
    const session = setupSessionAtWeaponAttack();
    session.currentState.units.t1 = {
      ...session.currentState.units.t1,
      movementThisTurn: MovementType.Walk,
      hexesMovedThisTurn: 5,
      tagDesignated,
      ecmProtected,
    } as EcmAwareTestUnitState;
    const grid = makeClearGrid(3);
    const attackerToken = makeToken({
      unitId: 'a1',
      isSelected: true,
      position: { q: 0, r: 0 },
      facing: Facing.Southeast,
    });
    const targetToken = makeToken({
      unitId: 't1',
      side: GameSide.Opponent,
      position: { q: 2, r: 0 },
      facing: Facing.North,
    });
    const weaponsByUnit = buildSemiGuidedWeaponsByUnit();
    const weapon = weaponsByUnit.get('a1')![0];

    const projection = deriveCombatRangeHexes({
      attacker: attackerToken,
      hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
      grid,
      tokens: [attackerToken, targetToken],
      weapons: [
        makeWeaponStatus({
          id: 'semi-guided-lrm-15',
          name: 'Semi-Guided LRM-15',
          heat: 5,
          damage: 9,
          ranges: { short: 7, medium: 14, long: 21 },
        }),
      ],
      combatState: session.currentState,
    }).find((hex) => hex.hex.q === 2 && hex.hex.r === 0);

    expect(projection).toBeDefined();
    expect(projection).toMatchObject({ attackable: true, toHitNumber: 6 });

    const result = applyInteractiveSessionAttack({
      session,
      weaponsByUnit,
      attackerId: 'a1',
      targetId: 't1',
      weaponIds: ['semi-guided-lrm-15'],
      grid,
    });

    const declared = result.events.find(
      (event) => event.type === GameEventType.AttackDeclared,
    );
    expect(declared).toBeDefined();
    const payload = declared!.payload as IAttackDeclaredPayload;
    expect(payload.toHitNumber).toBe(projection!.toHitNumber);
    expectDeclaredToHitMatchesIndependentEngineToHit({
      payload,
      range: projection!.distance,
      rangeBracket: projection!.rangeBracket,
      session,
      weapon,
    });
    expect(payload.modifiers).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Semi-guided TAG target movement' }),
      ]),
    );
  },
);

it('keeps airborne attacker indirect-fire rejection aligned with committed LOS rejection', () => {
  const session = setupIndirectSessionAtWeaponAttack();
  session.currentState.units.a1 = {
    ...session.currentState.units.a1,
    combatState: {
      kind: 'aero',
      state: makeAerospaceCombatState(3),
    },
  };
  const grid = makeIndirectFireGrid();
  const attackerToken = makeToken({
    unitId: 'a1',
    isSelected: true,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
    unitType: TokenUnitType.Aerospace,
    altitude: 3,
  });
  const spotterToken = makeToken({
    unitId: 's1',
    position: { q: 5, r: 1 },
    facing: Facing.North,
  });
  const targetToken = makeToken({
    unitId: 't1',
    side: GameSide.Opponent,
    position: { q: 5, r: 0 },
    facing: Facing.North,
  });

  const projection = deriveCombatRangeHexes({
    attacker: attackerToken,
    hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
    grid,
    tokens: [attackerToken, spotterToken, targetToken],
    weapons: [
      makeWeaponStatus({
        id: 'lrm-15-1',
        name: 'LRM-15',
        heat: 5,
        damage: 9,
        ranges: { short: 7, medium: 14, long: 21 },
      }),
    ],
    combatState: session.currentState,
  }).find((hex) => hex.hex.q === 5 && hex.hex.r === 0);

  expect(projection).toBeDefined();
  expect(projection).toMatchObject({
    losState: 'blocked',
    attackable: false,
    indirectFireAvailable: undefined,
    attackInvalidReason: 'NoLineOfSight',
  });

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: buildIndirectWeaponsByUnit(),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['lrm-15-1'],
    grid,
  });

  expect(
    result.events.some((event) => event.type === GameEventType.AttackDeclared),
  ).toBe(false);
  expect(
    result.events.some(
      (event) => event.type === GameEventType.IndirectFireSpotterSelected,
    ),
  ).toBe(false);
  const invalid = result.events.find(
    (event) => event.type === GameEventType.AttackInvalid,
  );
  expect(invalid).toBeDefined();
  expect(invalid!.payload as IAttackInvalidPayload).toMatchObject({
    attackerId: 'a1',
    targetId: 't1',
    weaponId: 'lrm-15-1',
    reason: projection!.attackInvalidReason,
    details: projection!.attackInvalidDetails,
  });
});

it('keeps airborne aerospace spotter ineligibility aligned between preview and commit', () => {
  const session = setupIndirectSessionAtWeaponAttack();
  session.currentState.units.s1 = {
    ...session.currentState.units.s1,
    combatState: {
      kind: 'aero',
      state: makeAerospaceCombatState(3),
    },
  };
  const grid = makeIndirectFireGrid();
  const attackerToken = makeToken({
    unitId: 'a1',
    isSelected: true,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
  });
  const spotterToken = makeToken({
    unitId: 's1',
    position: { q: 5, r: 1 },
    facing: Facing.North,
    unitType: TokenUnitType.Aerospace,
    altitude: 3,
  });
  const targetToken = makeToken({
    unitId: 't1',
    side: GameSide.Opponent,
    position: { q: 5, r: 0 },
    facing: Facing.North,
  });

  const projection = deriveCombatRangeHexes({
    attacker: attackerToken,
    hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
    grid,
    tokens: [attackerToken, spotterToken, targetToken],
    weapons: [
      makeWeaponStatus({
        id: 'lrm-15-1',
        name: 'LRM-15',
        heat: 5,
        damage: 9,
        ranges: { short: 7, medium: 14, long: 21 },
      }),
    ],
    combatState: session.currentState,
  }).find((hex) => hex.hex.q === 5 && hex.hex.r === 0);

  expect(projection).toBeDefined();
  expect(projection).toMatchObject({
    losState: 'blocked',
    attackable: false,
    indirectFireAvailable: undefined,
    attackInvalidReason: 'NoLineOfSight',
  });

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: buildIndirectWeaponsByUnit(),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['lrm-15-1'],
    grid,
  });

  expect(
    result.events.some((event) => event.type === GameEventType.AttackDeclared),
  ).toBe(false);
  expect(
    result.events.some(
      (event) => event.type === GameEventType.IndirectFireSpotterSelected,
    ),
  ).toBe(false);
  const invalid = result.events.find(
    (event) => event.type === GameEventType.AttackInvalid,
  );
  expect(invalid).toBeDefined();
  expect(invalid!.payload as IAttackInvalidPayload).toMatchObject({
    attackerId: 'a1',
    targetId: 't1',
    weaponId: 'lrm-15-1',
    reason: projection!.attackInvalidReason,
    details: projection!.attackInvalidDetails,
  });
});

it('does not switch to indirect fire solely because a destroyed marker sits between attacker and target', () => {
  const session = setupIndirectWreckSessionAtWeaponAttack();
  const grid = makeIndirectFireWreckGrid();
  const attackerToken = makeToken({
    unitId: 'a1',
    isSelected: true,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
  });
  const spotterToken = makeToken({
    unitId: 's1',
    position: { q: 5, r: 1 },
    facing: Facing.North,
  });
  const wreckToken = makeToken({
    unitId: 'w1',
    name: 'Wreck',
    side: GameSide.Opponent,
    position: { q: 3, r: 0 },
    facing: Facing.North,
    isDestroyed: true,
  });
  const targetToken = makeToken({
    unitId: 't1',
    side: GameSide.Opponent,
    position: { q: 5, r: 0 },
    facing: Facing.North,
  });

  const projection = deriveCombatRangeHexes({
    attacker: attackerToken,
    hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
    grid,
    tokens: [attackerToken, spotterToken, wreckToken, targetToken],
    weapons: [
      makeWeaponStatus({
        id: 'lrm-15-1',
        name: 'LRM-15',
        heat: 5,
        damage: 9,
        ranges: { short: 7, medium: 14, long: 21 },
      }),
    ],
    combatState: session.currentState,
  }).find((hex) => hex.hex.q === 5 && hex.hex.r === 0);

  expect(projection).toBeDefined();
  expect(projection).toMatchObject({
    losState: 'clear',
    attackable: true,
  });
  expect(projection?.indirectFireAvailable).toBeUndefined();
  expect(projection?.indirectFireSpotterId).toBeUndefined();
  expect(projection?.lineOfSightBlockerReason).toBeUndefined();
  expect(projection?.attackInvalidReason).toBeUndefined();

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: buildIndirectWeaponsByUnit(),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['lrm-15-1'],
    grid,
  });

  expect(
    result.events.some((event) => event.type === GameEventType.AttackInvalid),
  ).toBe(false);
  expect(
    result.events.some((event) => event.type === GameEventType.AttackDeclared),
  ).toBe(true);
  expect(
    result.events.some(
      (event) => event.type === GameEventType.IndirectFireSpotterSelected,
    ),
  ).toBe(false);
});

// ---------------------------------------------------------------------------
// Audit 2026-06-09 finding B-1 (W1.1): the projection must hydrate attacker/
// target to-hit state through the SAME buildWeaponAttackAttackerToHitState /
// buildWeaponAttackTargetToHitState builders the engine uses, so the
// committed AttackDeclared payload (which resolution rolls against) carries
// pilot wounds, sensor hits, actuator damage, SPAs, quirks, and target
// evasion identically in preview and commit.
// ---------------------------------------------------------------------------

it('keeps attacker sensor hits and pilot wounds aligned between preview and committed attacks', () => {
  const session = setupSessionAtWeaponAttack();
  session.currentState.units.a1 = {
    ...session.currentState.units.a1,
    pilotWounds: 1,
    componentDamage: {
      ...buildDefaultComponentDamageState(),
      sensorHits: 2,
    },
  };
  const grid = makeClearGrid(3);
  const attackerToken = makeToken({
    unitId: 'a1',
    isSelected: true,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
  });
  const targetToken = makeToken({
    unitId: 't1',
    side: GameSide.Opponent,
    position: { q: 2, r: 0 },
    facing: Facing.North,
  });

  const projection = deriveCombatRangeHexes({
    attacker: attackerToken,
    hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
    grid,
    tokens: [attackerToken, targetToken],
    weapons: [makeWeaponStatus()],
    combatState: session.currentState,
  }).find((hex) => hex.hex.q === 2 && hex.hex.r === 0);

  expect(projection).toBeDefined();
  // Base 4 (gunnery) + 1 (pilot wound) + 2 (two sensor hits) = 7.
  expect(projection).toMatchObject({
    attackable: true,
    toHitNumber: 7,
  });
  expect(projection?.toHitModifiers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: 'Pilot Wounds', value: 1 }),
      expect.objectContaining({ name: 'Sensor Damage', value: 2 }),
    ]),
  );

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: buildWeaponsByUnit(),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['medium-laser'],
    grid,
  });

  expect(
    result.events.some((event) => event.type === GameEventType.AttackInvalid),
  ).toBe(false);
  const declared = result.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  );
  expect(declared).toBeDefined();
  const payload = declared!.payload as IAttackDeclaredPayload;
  expect(payload.toHitNumber).toBe(7);
  expectDeclaredToHitMatchesIndependentEngineToHit({
    payload,
    range: projection!.distance,
    rangeBracket: projection!.rangeBracket,
    session,
    weapon: buildWeaponsByUnit().get('a1')![0],
  });
  expect(payload.toHitNumber).toBe(projection!.toHitNumber);
  expect(payload.modifiers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: 'Pilot Wounds', value: 1 }),
      expect.objectContaining({ name: 'Sensor Damage', value: 2 }),
    ]),
  );
});

it('keeps attacker arm actuator damage aligned between preview and committed attacks', () => {
  const session = setupSessionAtWeaponAttack();
  session.currentState.units.a1 = {
    ...session.currentState.units.a1,
    componentDamage: {
      ...buildDefaultComponentDamageState(),
      actuators: { [ActuatorType.SHOULDER]: true },
    },
  };
  const grid = makeClearGrid(3);
  const attackerToken = makeToken({
    unitId: 'a1',
    isSelected: true,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
  });
  const targetToken = makeToken({
    unitId: 't1',
    side: GameSide.Opponent,
    position: { q: 2, r: 0 },
    facing: Facing.North,
  });

  const projection = deriveCombatRangeHexes({
    attacker: attackerToken,
    hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
    grid,
    tokens: [attackerToken, targetToken],
    // Arm-mounted weapon (makeWeaponStatus defaults to right_arm).
    weapons: [makeWeaponStatus()],
    combatState: session.currentState,
  }).find((hex) => hex.hex.q === 2 && hex.hex.r === 0);

  expect(projection).toBeDefined();
  // Base 4 (gunnery) + 4 (destroyed shoulder actuator) = 8.
  expect(projection).toMatchObject({
    attackable: true,
    toHitNumber: 8,
  });
  expect(projection?.toHitModifiers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: 'Actuator Damage', value: 4 }),
    ]),
  );

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: buildWeaponsByUnit(),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['medium-laser'],
    grid,
  });

  const declared = result.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  );
  expect(declared).toBeDefined();
  const payload = declared!.payload as IAttackDeclaredPayload;
  expect(payload.toHitNumber).toBe(8);
  expectDeclaredToHitMatchesIndependentEngineToHit({
    payload,
    range: projection!.distance,
    rangeBracket: projection!.rangeBracket,
    session,
    weapon: buildWeaponsByUnit().get('a1')![0],
  });
  expect(payload.toHitNumber).toBe(projection!.toHitNumber);
  expect(payload.modifiers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: 'Actuator Damage', value: 4 }),
    ]),
  );
});

it('keeps target evasion bonus aligned between preview and committed attacks', () => {
  const session = setupSessionAtWeaponAttack();
  session.currentState.units.t1 = {
    ...session.currentState.units.t1,
    isEvading: true,
    evasionBonus: 2,
  };
  const grid = makeClearGrid(3);
  const attackerToken = makeToken({
    unitId: 'a1',
    isSelected: true,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
  });
  const targetToken = makeToken({
    unitId: 't1',
    side: GameSide.Opponent,
    position: { q: 2, r: 0 },
    facing: Facing.North,
  });

  const projection = deriveCombatRangeHexes({
    attacker: attackerToken,
    hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
    grid,
    tokens: [attackerToken, targetToken],
    weapons: [makeWeaponStatus()],
    combatState: session.currentState,
  }).find((hex) => hex.hex.q === 2 && hex.hex.r === 0);

  expect(projection).toBeDefined();
  // Base 4 (gunnery) + 2 (explicit evasion bonus) = 6.
  expect(projection).toMatchObject({
    attackable: true,
    toHitNumber: 6,
  });
  expect(projection?.toHitModifiers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: 'Target Evasion', value: 2 }),
    ]),
  );

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: buildWeaponsByUnit(),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['medium-laser'],
    grid,
  });

  const declared = result.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  );
  expect(declared).toBeDefined();
  const payload = declared!.payload as IAttackDeclaredPayload;
  expect(payload.toHitNumber).toBe(6);
  expectDeclaredToHitMatchesIndependentEngineToHit({
    payload,
    range: projection!.distance,
    rangeBracket: projection!.rangeBracket,
    session,
    weapon: buildWeaponsByUnit().get('a1')![0],
  });
  expect(payload.toHitNumber).toBe(projection!.toHitNumber);
  expect(payload.modifiers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: 'Target Evasion', value: 2 }),
    ]),
  );
});

it('keeps attacker gunnery SPA and weapon quirk modifiers aligned between preview and committed attacks', () => {
  const session = setupSessionAtWeaponAttack();
  session.currentState.units.a1 = {
    ...session.currentState.units.a1,
    // Sniper halves the positive range modifier; Accurate weapon quirk -1.
    abilities: ['sniper'],
    weaponQuirks: { 'medium-laser': ['accurate'] },
  };
  session.currentState.units.t1 = {
    ...session.currentState.units.t1,
    position: { q: 4, r: 0 },
  };
  const grid = makeClearGrid(4);
  const attackerToken = makeToken({
    unitId: 'a1',
    isSelected: true,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
  });
  const targetToken = makeToken({
    unitId: 't1',
    side: GameSide.Opponent,
    position: { q: 4, r: 0 },
    facing: Facing.North,
  });

  const projection = deriveCombatRangeHexes({
    attacker: attackerToken,
    hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
    grid,
    tokens: [attackerToken, targetToken],
    weapons: [makeWeaponStatus()],
    combatState: session.currentState,
  }).find((hex) => hex.hex.q === 4 && hex.hex.r === 0);

  expect(projection).toBeDefined();
  // Base 4 + 2 (medium range) - 1 (Sniper halves range mod) - 1 (Accurate) = 4.
  expect(projection).toMatchObject({
    attackable: true,
    toHitNumber: 4,
  });
  expect(projection?.toHitModifiers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: 'Sniper', value: -1 }),
      expect.objectContaining({ name: 'Accurate Weapon', value: -1 }),
    ]),
  );

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: buildWeaponsByUnit(),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['medium-laser'],
    grid,
  });

  const declared = result.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  );
  expect(declared).toBeDefined();
  const payload = declared!.payload as IAttackDeclaredPayload;
  expect(payload.toHitNumber).toBe(4);
  expectDeclaredToHitMatchesIndependentEngineToHit({
    payload,
    range: projection!.distance,
    rangeBracket: projection!.rangeBracket,
    session,
    weapon: buildWeaponsByUnit().get('a1')![0],
  });
  expect(payload.toHitNumber).toBe(projection!.toHitNumber);
  expect(payload.modifiers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: 'Sniper', value: -1 }),
      expect.objectContaining({ name: 'Accurate Weapon', value: -1 }),
    ]),
  );
});

it('preserves engine called-shot modifiers through committed-attack projection enrichment', () => {
  const session = setupSessionAtWeaponAttack();
  const grid = makeClearGrid(3);

  const result = applyInteractiveSessionAttack({
    session,
    weaponsByUnit: buildWeaponsByUnit(),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['medium-laser'],
    calledShots: { 'medium-laser': true },
    grid,
  });

  const declared = result.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  );
  expect(declared).toBeDefined();
  const payload = declared!.payload as IAttackDeclaredPayload;
  // Base 4 (gunnery) + 3 (called shot) = 7. The committed-attack projection
  // must not strip the engine's called-shot modifier when it enriches the
  // AttackDeclared payload (audit B-1: projection overwrite of engine to-hit).
  expect(payload.toHitNumber).toBe(7);
  expect(payload.modifiers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: 'Called Shot', value: 3 }),
    ]),
  );
});
