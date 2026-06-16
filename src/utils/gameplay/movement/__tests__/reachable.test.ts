/**
 * Tests for `deriveReachableHexes` — the Movement-phase UI projection
 * helper.
 *
 * @spec openspec/changes/add-movement-phase-ui/specs/movement-system/spec.md
 */

import { describe, expect, it } from '@jest/globals';

import { parseMegaMekBoard } from '@/lib/parsers/megaMekBoard';
import { GyroType } from '@/types/construction/GyroType';
import {
  Facing,
  GameSide,
  LockState,
  MovementType,
  TerrainType,
  type IComponentDamageState,
  type IHex,
  type IMovementCapability,
  type IHexCoordinate,
  type IHexGrid,
  type LightCondition,
  type IUnitGameState,
} from '@/types/gameplay';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { createAerospaceCombatState } from '@/utils/gameplay/aerospace/state';
import { createEnvironmentalConditions } from '@/utils/gameplay/environmentalModifiers';
import { createHexGrid } from '@/utils/gameplay/hexGrid';
import { coordToKey } from '@/utils/gameplay/hexMath';
import { validateCommittedMovement } from '@/utils/gameplay/movement/commitValidation';
import {
  deriveMovementRangeHexForDestination,
  deriveReachableHexes,
} from '@/utils/gameplay/movement/reachable';
import {
  AIRBORNE_LAM_AIRMEK_GROUND_MOVEMENT_BLOCKED_REASON,
  AIRBORNE_VTOL_GROUND_MOVEMENT_BLOCKED_REASON,
  AIRBORNE_WIGE_GROUND_MOVEMENT_BLOCKED_REASON,
} from '@/utils/gameplay/movement/runtimeCapability';
import { validateMovement } from '@/utils/gameplay/movement/validation';
import { terrainStringFromFeatures } from '@/utils/gameplay/terrainEncoding';
import { createVehicleCombatState } from '@/utils/gameplay/vehicleDamage';

function makeUnitAtOrigin(): IUnitGameState {
  return {
    id: 'u1',
    side: GameSide.Player,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    piloting: 5,
    armor: {},
    structure: {},
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
  };
}

function makeComponentDamage(
  overrides: Partial<IComponentDamageState> = {},
): IComponentDamageState {
  return {
    engineHits: 0,
    gyroHits: 0,
    sensorHits: 0,
    lifeSupport: 0,
    cockpitHit: false,
    actuators: {},
    weaponsDestroyed: [],
    heatSinksDestroyed: 0,
    jumpJetsDestroyed: 0,
    ...overrides,
  };
}

function setHex(
  grid: IHexGrid,
  coord: IHexCoordinate,
  terrain: string,
  elevation = 0,
): IHexGrid {
  const key = coordToKey(coord);
  const hex = grid.hexes.get(key);
  if (!hex) throw new Error(`Missing test hex ${key}`);
  const hexes = new Map(grid.hexes);
  hexes.set(key, { ...hex, terrain, elevation });
  return { ...grid, hexes };
}

function gridFromParsedBoard(content: string): IHexGrid {
  const parsedBoard = parseMegaMekBoard(content);
  const hexes = new Map<string, IHex>();

  for (const parsedHex of parsedBoard.hexes) {
    hexes.set(coordToKey(parsedHex.coordinate), {
      coord: parsedHex.coordinate,
      occupantId: null,
      terrain: terrainStringFromFeatures(parsedHex.features),
      elevation: parsedHex.elevation,
    });
  }

  return {
    config: { radius: Math.max(parsedBoard.width, parsedBoard.height) },
    hexes,
  };
}

function setOccupant(
  grid: IHexGrid,
  coord: IHexCoordinate,
  occupantId: string,
): IHexGrid {
  const key = coordToKey(coord);
  const hex = grid.hexes.get(key);
  if (!hex) throw new Error(`Missing test hex ${key}`);
  const hexes = new Map(grid.hexes);
  hexes.set(key, { ...hex, occupantId });
  return { ...grid, hexes };
}

describe('deriveReachableHexes', () => {
  it('returns empty array for Stationary movement type', () => {
    const grid = createHexGrid({ radius: 5 });
    const unit = makeUnitAtOrigin();
    const cap: IMovementCapability = { walkMP: 5, runMP: 8, jumpMP: 0 };

    const result = deriveReachableHexes(
      unit,
      MovementType.Stationary,
      grid,
      cap,
    );

    expect(result).toEqual([]);
  });

  it('returns empty array when the MP budget is zero', () => {
    const grid = createHexGrid({ radius: 5 });
    const unit = makeUnitAtOrigin();
    const cap: IMovementCapability = { walkMP: 0, runMP: 0, jumpMP: 0 };

    expect(deriveReachableHexes(unit, MovementType.Walk, grid, cap)).toEqual(
      [],
    );
    expect(deriveReachableHexes(unit, MovementType.Jump, grid, cap)).toEqual(
      [],
    );
  });

  it('derives walk reach for a 5-walk-MP unit on clear terrain', () => {
    const grid = createHexGrid({ radius: 6 });
    const unit = makeUnitAtOrigin();
    const cap: IMovementCapability = { walkMP: 5, runMP: 8, jumpMP: 0 };

    const result = deriveReachableHexes(unit, MovementType.Walk, grid, cap);

    // Every returned hex is marked reachable + walk-typed with cost ≤ 5.
    expect(result.length).toBeGreaterThan(0);
    for (const entry of result) {
      expect(entry.reachable).toBe(true);
      expect(entry.movementType).toBe(MovementType.Walk);
      expect(entry.mpCost).toBeGreaterThan(0);
      expect(entry.mpCost).toBeLessThanOrEqual(5);
    }
    // A well-known direct neighbour (q=1, r=0) is 1 MP away on clear
    // terrain and must be in the set with cost 1.
    const neighbor = result.find((r) => r.hex.q === 1 && r.hex.r === 0);
    expect(neighbor).toBeDefined();
    expect(neighbor?.mpCost).toBe(1);
  });

  it('subtracts normal stand-up MP before projecting prone ground reach', () => {
    const grid = createHexGrid({ radius: 6 });
    const unit = { ...makeUnitAtOrigin(), prone: true };
    const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 3 };

    const result = deriveReachableHexes(unit, MovementType.Walk, grid, cap);

    const maxStandingWalk = result.find(
      (entry) => entry.hex.q === 2 && entry.hex.r === 0,
    );
    expect(maxStandingWalk).toMatchObject({
      mpCost: 4,
      heatGenerated: 1,
      reachable: true,
      movementType: MovementType.Walk,
      standUpRequired: true,
      standUpCost: 2,
      standUpPsrRequired: true,
      standUpPsrReason: 'Standing up',
      standUpPsrTargetNumber: 5,
      standUpPsrModifier: 0,
    });

    const tooFar = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      cap,
      { q: 3, r: 0 },
    );
    expect(tooFar).toMatchObject({
      mpCost: 5,
      reachable: false,
      movementInvalidReason: 'InsufficientMP',
      movementInvalidDetails:
        'Destination is 3 hexes away, but max range for walk after standing is 2',
      standUpRequired: true,
      standUpCost: 2,
      standUpPsrRequired: true,
    });
  });

  it('subtracts MegaMek GET_UP MP before projecting hull-down ground reach', () => {
    const grid = createHexGrid({ radius: 6 });
    const unit = { ...makeUnitAtOrigin(), hullDown: true };
    const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 3 };

    const result = deriveReachableHexes(unit, MovementType.Walk, grid, cap);

    const maxHullDownWalk = result.find(
      (entry) => entry.hex.q === 2 && entry.hex.r === 0,
    );
    expect(maxHullDownWalk).toMatchObject({
      mpCost: 4,
      heatGenerated: 1,
      reachable: true,
      movementType: MovementType.Walk,
      hullDownExitRequired: true,
      hullDownExitCost: 2,
    });
    expect(maxHullDownWalk?.standUpRequired).toBeUndefined();

    const tooFar = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      cap,
      { q: 3, r: 0 },
    );
    expect(tooFar).toMatchObject({
      mpCost: 5,
      reachable: false,
      movementInvalidReason: 'InsufficientMP',
      movementInvalidDetails:
        'Destination is 3 hexes away, but max range for walk after exit hull-down is 2',
      hullDownExitRequired: true,
      hullDownExitCost: 2,
    });

    const occupiedOriginGrid = setOccupant(grid, { q: 0, r: 0 }, 'u1');
    const sameHexExit = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      occupiedOriginGrid,
      cap,
      { q: 0, r: 0 },
    );
    expect(sameHexExit).toMatchObject({
      mpCost: 2,
      reachable: true,
      movementType: MovementType.Walk,
      hullDownExitRequired: true,
      hullDownExitCost: 2,
    });
  });

  it('does not apply Mek GET_UP hull-down exit costs to vehicle motive modes', () => {
    const grid = createHexGrid({ radius: 6 });
    const unit = { ...makeUnitAtOrigin(), hullDown: true };
    const cap: IMovementCapability = {
      walkMP: 4,
      runMP: 6,
      jumpMP: 0,
      movementMode: 'tracked',
      movementHeatProfile: 'none',
    };

    const result = deriveReachableHexes(unit, MovementType.Walk, grid, cap);

    const maxTrackedWalk = result.find(
      (entry) => entry.hex.q === 4 && entry.hex.r === 0,
    );
    expect(maxTrackedWalk).toMatchObject({
      mpCost: 4,
      heatGenerated: 0,
      reachable: true,
      movementType: MovementType.Walk,
    });
    expect(maxTrackedWalk?.hullDownExitRequired).toBeUndefined();
    expect(maxTrackedWalk?.hullDownExitCost).toBeUndefined();
  });

  it('projects hull-down jump attempts as blocked until the unit exits hull-down', () => {
    const grid = createHexGrid({ radius: 5 });
    const unit = { ...makeUnitAtOrigin(), hullDown: true };
    const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 3 };

    const projected = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Jump,
      grid,
      cap,
      { q: 1, r: 0 },
    );

    expect(projected).toMatchObject({
      mpCost: 2,
      heatGenerated: 0,
      reachable: false,
      movementType: MovementType.Jump,
      movementInvalidReason: 'InvalidDestination',
      movementInvalidDetails: 'Unit is hull-down and must stand before jumping',
    });
    expect(projected?.hullDownExitRequired).toBeUndefined();
    expect(projected?.standUpRequired).toBeUndefined();
  });

  it('projects intact quad Mek stand-up as MP cost without a PSR', () => {
    const grid = createHexGrid({ radius: 5 });
    const unit = { ...makeUnitAtOrigin(), prone: true };
    const cap: IMovementCapability = {
      walkMP: 4,
      runMP: 6,
      jumpMP: 0,
      standUpCapability: { standUpLegProfile: 'quad' },
    };

    const projected = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      cap,
      { q: 1, r: 0 },
    );

    expect(projected).toMatchObject({
      reachable: true,
      mpCost: 3,
      standUpRequired: true,
      standUpCost: 2,
      standUpPsrRequired: false,
      standUpPsrReason:
        'Quad Mek has all four legs and does not need a stand-up PSR',
      standUpPsrModifier: 0,
      standUpPsrModifierDetails: [],
      standUpPsrAutomaticSuccessReason:
        'Quad Mek has all four legs and does not need a stand-up PSR',
    });
    expect(projected?.standUpPsrTargetNumber).toBeUndefined();
  });

  it.each(['left_arm', 'front_left_leg'] as const)(
    'requires the normal stand-up PSR when a quad leg is destroyed as %s',
    (destroyedLocation) => {
      const grid = createHexGrid({ radius: 5 });
      const unit = {
        ...makeUnitAtOrigin(),
        prone: true,
        destroyedLocations: [destroyedLocation],
      };
      const cap: IMovementCapability = {
        walkMP: 4,
        runMP: 6,
        jumpMP: 0,
        standUpCapability: { standUpLegProfile: 'quad' },
      };

      const projected = deriveMovementRangeHexForDestination(
        unit,
        MovementType.Walk,
        grid,
        cap,
        { q: 1, r: 0 },
      );

      expect(projected).toMatchObject({
        reachable: true,
        standUpPsrRequired: true,
        standUpPsrReason: 'Standing up',
        standUpPsrTargetNumber: 5,
        standUpPsrModifier: 0,
        standUpPsrModifierDetails: [],
      });
      expect(projected?.standUpPsrAutomaticSuccessReason).toBeUndefined();
    },
  );

  it('projects TacOps careful stand as a whole-turn stand with the PSR bonus', () => {
    const grid = createHexGrid({ radius: 5 });
    const unit = { ...makeUnitAtOrigin(), prone: true };
    const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 0 };

    const projected = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      cap,
      { q: 1, r: 0 },
      'careful',
    );

    expect(projected).toMatchObject({
      mpCost: 4,
      heatGenerated: 0,
      reachable: false,
      movementType: MovementType.Walk,
      movementInvalidReason: 'InvalidDestination',
      movementInvalidDetails:
        'Careful stand consumes the movement for this turn',
      standUpRequired: true,
      standUpMode: 'careful',
      standUpCost: 4,
      standUpPsrRequired: true,
      standUpPsrTargetNumber: 3,
      standUpPsrModifier: -2,
      standUpPsrModifierDetails: ['Careful stand -2'],
    });
  });

  it('projects prone jump attempts as blocked until the unit stands', () => {
    const grid = createHexGrid({ radius: 5 });
    const unit = { ...makeUnitAtOrigin(), prone: true };
    const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 3 };

    const projected = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Jump,
      grid,
      cap,
      { q: 1, r: 0 },
    );

    expect(projected).toMatchObject({
      mpCost: 2,
      heatGenerated: 0,
      reachable: false,
      movementType: MovementType.Jump,
      movementInvalidReason: 'InvalidDestination',
      movementInvalidDetails: 'Unit is prone and must stand before jumping',
      standUpRequired: true,
      standUpCost: 2,
      standUpPsrRequired: true,
      standUpPsrTargetNumber: 5,
    });
  });

  it('blocks prone ground projection when destroyed leg plus both arms makes standing impossible', () => {
    const grid = createHexGrid({ radius: 5 });
    const unit = {
      ...makeUnitAtOrigin(),
      prone: true,
      destroyedLocations: ['left_leg', 'left_arm', 'right_arm'],
    };
    const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 0 };

    const projected = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      cap,
      { q: 1, r: 0 },
    );

    expect(projected).toMatchObject({
      mpCost: 2,
      reachable: false,
      movementType: MovementType.Walk,
      movementInvalidReason: 'InvalidDestination',
      movementInvalidDetails:
        'Cannot stand with a destroyed leg and both arms destroyed',
      standUpRequired: true,
      standUpCost: 2,
      standUpPsrRequired: true,
      standUpPsrImpossibleReason:
        'Cannot stand with a destroyed leg and both arms destroyed',
    });
  });

  it('blocks prone ground projection when a destroyed gyro makes standing impossible', () => {
    const grid = createHexGrid({ radius: 5 });
    const unit = {
      ...makeUnitAtOrigin(),
      prone: true,
      componentDamage: makeComponentDamage({ gyroHits: 2 }),
    };
    const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 0 };

    const projected = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      cap,
      { q: 1, r: 0 },
    );

    expect(projected).toMatchObject({
      mpCost: 2,
      reachable: false,
      movementType: MovementType.Walk,
      movementInvalidReason: 'InvalidDestination',
      movementInvalidDetails: 'Cannot stand with a destroyed gyro',
      standUpRequired: true,
      standUpCost: 2,
      standUpPsrRequired: true,
      standUpPsrTargetNumber: Infinity,
      standUpPsrModifier: 6,
      standUpPsrModifierDetails: ['Gyro damage +6'],
      standUpPsrImpossibleReason: 'Cannot stand with a destroyed gyro',
    });
  });

  it('blocks standing non-tracked movement when the gyro is destroyed', () => {
    const grid = createHexGrid({ radius: 5 });
    const unit = {
      ...makeUnitAtOrigin(),
      componentDamage: makeComponentDamage({ gyroHits: 2 }),
    };
    const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 3 };

    const walkProjection = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      cap,
      { q: 1, r: 0 },
    );
    const jumpProjection = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Jump,
      grid,
      cap,
      { q: 1, r: 0 },
    );

    expect(walkProjection).toMatchObject({
      mpCost: Infinity,
      reachable: false,
      movementType: MovementType.Walk,
      blockedReason: 'Destroyed gyro only permits tracked or wheeled movement',
      movementInvalidReason: 'InvalidDestination',
      movementInvalidDetails:
        'Destroyed gyro only permits tracked or wheeled movement',
    });
    expect(jumpProjection).toMatchObject({
      mpCost: Infinity,
      reachable: false,
      movementType: MovementType.Jump,
      blockedReason: 'Destroyed gyro only permits tracked or wheeled movement',
      movementInvalidReason: 'InvalidDestination',
      movementInvalidDetails:
        'Destroyed gyro only permits tracked or wheeled movement',
    });
  });

  it('preserves tracked and wheeled destroyed-gyro movement exceptions', () => {
    const grid = createHexGrid({ radius: 5 });
    const unit = {
      ...makeUnitAtOrigin(),
      componentDamage: makeComponentDamage({ gyroHits: 2 }),
    };

    const trackedProjection = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      { walkMP: 4, runMP: 6, jumpMP: 0, movementMode: 'tracked' },
      { q: 1, r: 0 },
    );
    const wheeledProjection = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      { walkMP: 4, runMP: 6, jumpMP: 0, movementMode: 'wheeled' },
      { q: 1, r: 0 },
    );

    expect(trackedProjection).toMatchObject({
      mpCost: 1,
      reachable: true,
      movementMode: 'tracked',
    });
    expect(wheeledProjection).toMatchObject({
      mpCost: 1,
      reachable: true,
      movementMode: 'wheeled',
    });
  });

  it('keeps Playtest3 three-hit heavy-duty gyro ground movement unblocked', () => {
    const grid = createHexGrid({ radius: 5 });
    const unit = {
      ...makeUnitAtOrigin(),
      gyroType: GyroType.HEAVY_DUTY,
      componentDamage: makeComponentDamage({ gyroHits: 3 }),
    };

    const projection = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      { walkMP: 4, runMP: 6, jumpMP: 0 },
      { q: 1, r: 0 },
      'normal',
      { optionalRules: ['playtest_3'] },
    );

    expect(projection).toMatchObject({
      mpCost: 1,
      reachable: true,
      movementType: MovementType.Walk,
    });
  });

  it('keeps a two-hit heavy-duty gyro stand-up rollable instead of destroyed', () => {
    const grid = createHexGrid({ radius: 5 });
    const unit = {
      ...makeUnitAtOrigin(),
      prone: true,
      gyroType: GyroType.HEAVY_DUTY,
      componentDamage: makeComponentDamage({ gyroHits: 2 }),
    };
    const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 0 };

    const projected = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      cap,
      { q: 1, r: 0 },
    );

    expect(projected).toMatchObject({
      mpCost: 3,
      reachable: true,
      movementType: MovementType.Walk,
      standUpRequired: true,
      standUpCost: 2,
      standUpPsrRequired: true,
      standUpPsrTargetNumber: 8,
      standUpPsrModifier: 3,
      standUpPsrModifierDetails: ['Heavy-duty gyro damage +3'],
    });
    expect(projected?.standUpPsrImpossibleReason).toBeUndefined();
  });

  it('blocks prone ground projection when a heavy-duty gyro reaches three hits', () => {
    const grid = createHexGrid({ radius: 5 });
    const unit = {
      ...makeUnitAtOrigin(),
      prone: true,
      gyroType: GyroType.HEAVY_DUTY,
      componentDamage: makeComponentDamage({ gyroHits: 3 }),
    };
    const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 0 };

    const projected = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      cap,
      { q: 1, r: 0 },
    );

    expect(projected).toMatchObject({
      mpCost: 2,
      reachable: false,
      movementType: MovementType.Walk,
      movementInvalidReason: 'InvalidDestination',
      movementInvalidDetails: 'Cannot stand with a destroyed gyro',
      standUpRequired: true,
      standUpCost: 2,
      standUpPsrRequired: true,
      standUpPsrTargetNumber: Infinity,
      standUpPsrModifier: 3,
      standUpPsrModifierDetails: ['Heavy-duty gyro damage +3'],
      standUpPsrImpossibleReason: 'Cannot stand with a destroyed gyro',
    });
  });

  it('keeps a three-hit heavy-duty gyro rollable under Playtest3 rules', () => {
    const grid = createHexGrid({ radius: 5 });
    const unit = {
      ...makeUnitAtOrigin(),
      prone: true,
      gyroType: GyroType.HEAVY_DUTY,
      componentDamage: makeComponentDamage({ gyroHits: 3 }),
    };
    const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 0 };

    const projected = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      cap,
      { q: 1, r: 0 },
      'normal',
      { optionalRules: ['playtest_3'] },
    );

    expect(projected).toMatchObject({
      mpCost: 3,
      reachable: true,
      movementType: MovementType.Walk,
      standUpRequired: true,
      standUpCost: 2,
      standUpPsrRequired: true,
      standUpPsrTargetNumber: 8,
      standUpPsrModifier: 3,
      standUpPsrModifierDetails: ['Heavy-duty gyro damage +3'],
    });
    expect(projected?.standUpPsrImpossibleReason).toBeUndefined();
  });

  it('blocks Playtest3 heavy-duty gyro stand-up at four hits', () => {
    const grid = createHexGrid({ radius: 5 });
    const unit = {
      ...makeUnitAtOrigin(),
      prone: true,
      gyroType: GyroType.HEAVY_DUTY,
      componentDamage: makeComponentDamage({ gyroHits: 4 }),
    };
    const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 0 };

    const projected = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      cap,
      { q: 1, r: 0 },
      'normal',
      { optionalRules: ['playtest_3'] },
    );

    expect(projected).toMatchObject({
      mpCost: 2,
      reachable: false,
      movementType: MovementType.Walk,
      movementInvalidReason: 'InvalidDestination',
      movementInvalidDetails: 'Cannot stand with a destroyed gyro',
      standUpRequired: true,
      standUpCost: 2,
      standUpPsrRequired: true,
      standUpPsrTargetNumber: Infinity,
      standUpPsrModifier: 3,
      standUpPsrModifierDetails: ['Heavy-duty gyro damage +3'],
      standUpPsrImpossibleReason: 'Cannot stand with a destroyed gyro',
    });
  });

  it('projects stand-up PSR modifier details from represented pilot and gyro state', () => {
    const grid = createHexGrid({ radius: 5 });
    const unit = {
      ...makeUnitAtOrigin(),
      prone: true,
      piloting: 4,
      pilotWounds: 1,
      componentDamage: makeComponentDamage({ gyroHits: 1 }),
    };
    const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 0 };

    const projected = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      cap,
      { q: 1, r: 0 },
    );

    expect(projected).toMatchObject({
      reachable: true,
      standUpPsrTargetNumber: 8,
      standUpPsrModifier: 4,
      standUpPsrModifierDetails: ['Gyro damage +3', 'Pilot wounds +1'],
    });
  });

  it('projects represented TacOps destroyed-arm stand-up penalties', () => {
    const grid = createHexGrid({ radius: 5 });
    const unit = {
      ...makeUnitAtOrigin(),
      prone: true,
      destroyedLocations: ['right_arm'],
    };
    const cap: IMovementCapability = {
      walkMP: 4,
      runMP: 6,
      jumpMP: 0,
      standUpCapability: { tacOpsAttemptingStand: true },
    };

    const projected = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      cap,
      { q: 1, r: 0 },
    );

    expect(projected).toMatchObject({
      reachable: true,
      standUpPsrTargetNumber: 7,
      standUpPsrModifier: 2,
      standUpPsrModifierDetails: ['Right arm destroyed +2'],
    });
  });

  it('projects represented Playtest2 trying-to-stand bonus', () => {
    const grid = createHexGrid({ radius: 5 });
    const unit = {
      ...makeUnitAtOrigin(),
      prone: true,
    };
    const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 0 };

    const projected = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      cap,
      { q: 1, r: 0 },
      'normal',
      { optionalRules: ['playtest_2'] },
    );

    expect(projected).toMatchObject({
      reachable: true,
      standUpPsrTargetNumber: 4,
      standUpPsrModifier: -1,
      standUpPsrModifierDetails: ['Trying to stand -1'],
    });
  });

  it('projects represented TacOps arm-actuator stand-up penalties per arm', () => {
    const grid = createHexGrid({ radius: 5 });
    const unit = {
      ...makeUnitAtOrigin(),
      prone: true,
    };
    const cap: IMovementCapability = {
      walkMP: 4,
      runMP: 6,
      jumpMP: 0,
      standUpCapability: {
        tacOpsAttemptingStand: true,
        armActuators: { right: 'hand', left: 'shoulder' },
      },
    };

    const projected = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      cap,
      { q: 1, r: 0 },
    );

    expect(projected).toMatchObject({
      reachable: true,
      standUpPsrTargetNumber: 7,
      standUpPsrModifier: 2,
      standUpPsrModifierDetails: [
        'Right arm hand actuator missing/destroyed +1',
        'Left arm shoulder actuator missing/destroyed +1',
      ],
    });
  });

  it('uses destroyed arm before represented TacOps arm-actuator checks', () => {
    const grid = createHexGrid({ radius: 5 });
    const unit = {
      ...makeUnitAtOrigin(),
      prone: true,
      destroyedLocations: ['right_arm'],
    };
    const cap: IMovementCapability = {
      walkMP: 4,
      runMP: 6,
      jumpMP: 0,
      standUpCapability: {
        tacOpsAttemptingStand: true,
        armActuators: { right: 'hand' },
      },
    };

    const projected = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      cap,
      { q: 1, r: 0 },
    );

    expect(projected).toMatchObject({
      reachable: true,
      standUpPsrTargetNumber: 7,
      standUpPsrModifier: 2,
      standUpPsrModifierDetails: ['Right arm destroyed +2'],
    });
  });

  it('projects represented no-arms stand-up quirk before TacOps arm checks', () => {
    const grid = createHexGrid({ radius: 5 });
    const unit = {
      ...makeUnitAtOrigin(),
      prone: true,
      destroyedLocations: ['right_arm', 'left_arm'],
    };
    const cap: IMovementCapability = {
      walkMP: 4,
      runMP: 6,
      jumpMP: 0,
      standUpCapability: {
        noMinimalArmsQuirk: true,
        tacOpsAttemptingStand: true,
      },
    };

    const projected = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      cap,
      { q: 1, r: 0 },
    );

    expect(projected).toMatchObject({
      reachable: true,
      standUpPsrTargetNumber: 7,
      standUpPsrModifier: 2,
      standUpPsrModifierDetails: ['No/minimal arms +2'],
    });
  });

  it('reports terrain and elevation costs for reachable ground movement', () => {
    let grid = createHexGrid({ radius: 3 });
    grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
    grid = setHex(grid, { q: 1, r: 0 }, TerrainType.LightWoods, 1);
    const unit = makeUnitAtOrigin();
    const cap: IMovementCapability = { walkMP: 3, runMP: 5, jumpMP: 0 };

    const result = deriveReachableHexes(unit, MovementType.Walk, grid, cap);

    const elevatedWoods = result.find((r) => r.hex.q === 1 && r.hex.r === 0);
    expect(elevatedWoods).toMatchObject({
      mpCost: 3,
      terrainCost: 1,
      elevationDelta: 1,
      elevationCost: 1,
      heatGenerated: 1,
      reachable: true,
      movementType: MovementType.Walk,
    });
    expect(elevatedWoods?.path).toEqual([
      { q: 0, r: 0 },
      { q: 1, r: 0 },
    ]);
  });

  it('prices encoded multi-feature terrain consistently with grid terrain projection', () => {
    let grid = createHexGrid({ radius: 3 });
    grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
    grid = setHex(
      grid,
      { q: 1, r: 0 },
      terrainStringFromFeatures([
        { type: TerrainType.Rough, level: 1 },
        { type: TerrainType.HeavyWoods, level: 1 },
      ]),
      0,
    );
    const unit = makeUnitAtOrigin();
    const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 0 };

    const result = deriveReachableHexes(unit, MovementType.Walk, grid, cap);

    const encodedHeavyWoods = result.find(
      (r) => r.hex.q === 1 && r.hex.r === 0,
    );
    // Audit 2026-06-09 C-4: MegaMek Hex.movementCost sums every terrain
    // feature in the hex, so rough + heavy woods now charges 1 + 1 + 2 = 4
    // (the old primary-feature lookup charged only the woods).
    expect(encodedHeavyWoods).toMatchObject({
      mpCost: 4,
      terrainCost: 3,
      elevationDelta: 0,
      elevationCost: 0,
      reachable: true,
      movementType: MovementType.Walk,
    });
  });

  it('marks ground destinations blocked when they require an illegal elevation climb', () => {
    let grid = createHexGrid({ radius: 3 });
    grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
    grid = setHex(grid, { q: 1, r: 0 }, TerrainType.Clear, 3);
    const unit = makeUnitAtOrigin();
    const cap: IMovementCapability = { walkMP: 5, runMP: 8, jumpMP: 0 };

    const result = deriveReachableHexes(unit, MovementType.Walk, grid, cap);

    const blocked = result.find((r) => r.hex.q === 1 && r.hex.r === 0);
    expect(blocked).toMatchObject({
      mpCost: Infinity,
      elevationDelta: 3,
      elevationCost: 3,
      movementMode: 'walk',
      reachable: false,
      movementType: MovementType.Walk,
      blockedReason: 'Elevation change of 3 exceeds ground movement limit',
      movementInvalidReason: 'TerrainBlocked',
      movementInvalidDetails:
        'Elevation change of 3 exceeds ground movement limit',
    });
  });

  it('uses MegaMek vehicle elevation limits for tracked movement reachability', () => {
    let grid = createHexGrid({ radius: 3 });
    grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
    grid = setHex(grid, { q: 1, r: 0 }, TerrainType.Clear, 2);
    const unit = makeUnitAtOrigin();

    const tracked = deriveReachableHexes(unit, MovementType.Walk, grid, {
      walkMP: 5,
      runMP: 8,
      jumpMP: 0,
      movementMode: 'tracked',
    }).find((r) => r.hex.q === 1 && r.hex.r === 0);
    const walking = deriveReachableHexes(unit, MovementType.Walk, grid, {
      walkMP: 5,
      runMP: 8,
      jumpMP: 0,
      movementMode: 'walk',
    }).find((r) => r.hex.q === 1 && r.hex.r === 0);

    expect(tracked).toMatchObject({
      mpCost: Infinity,
      elevationDelta: 2,
      elevationCost: 4,
      movementMode: 'tracked',
      reachable: false,
      movementInvalidReason: 'TerrainBlocked',
      movementInvalidDetails:
        'Elevation change of 2 exceeds Tracked movement limit',
    });
    expect(walking).toMatchObject({
      mpCost: 3,
      elevationDelta: 2,
      elevationCost: 2,
      movementMode: 'walk',
      reachable: true,
    });
  });

  it('uses MegaMek absolute elevation costs for downhill ground movement', () => {
    let grid = createHexGrid({ radius: 3 });
    grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 2);
    grid = setHex(grid, { q: 1, r: 0 }, TerrainType.Clear, 0);
    const unit = makeUnitAtOrigin();

    const downhill = deriveReachableHexes(unit, MovementType.Walk, grid, {
      walkMP: 3,
      runMP: 5,
      jumpMP: 0,
      movementMode: 'walk',
    }).find((r) => r.hex.q === 1 && r.hex.r === 0);

    expect(downhill).toMatchObject({
      mpCost: 3,
      elevationDelta: -2,
      elevationCost: 2,
      movementMode: 'walk',
      reachable: true,
    });

    grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 3);
    const blockedDrop = deriveReachableHexes(unit, MovementType.Walk, grid, {
      walkMP: 5,
      runMP: 8,
      jumpMP: 0,
      movementMode: 'walk',
    }).find((r) => r.hex.q === 1 && r.hex.r === 0);

    expect(blockedDrop).toMatchObject({
      mpCost: Infinity,
      elevationDelta: -3,
      elevationCost: 3,
      movementMode: 'walk',
      reachable: false,
      movementInvalidReason: 'TerrainBlocked',
      movementInvalidDetails:
        'Elevation change of 3 exceeds ground movement limit',
    });
  });

  it('marks destinations over the MP budget with the engine insufficient-MP reason', () => {
    let grid = createHexGrid({ radius: 3 });
    grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
    grid = setHex(grid, { q: 1, r: 0 }, TerrainType.LightWoods, 0);
    const unit = makeUnitAtOrigin();
    const cap: IMovementCapability = { walkMP: 1, runMP: 1, jumpMP: 0 };

    const result = deriveReachableHexes(unit, MovementType.Walk, grid, cap);

    const expensiveWoods = result.find((r) => r.hex.q === 1 && r.hex.r === 0);
    expect(expensiveWoods).toMatchObject({
      mpCost: 2,
      terrainCost: 1,
      reachable: false,
      movementType: MovementType.Walk,
      blockedReason: 'Path costs 2 MP, but only 1 MP is available',
      movementInvalidReason: 'InsufficientMP',
      movementInvalidDetails: 'Path costs 2 MP, but only 1 MP is available',
    });
  });

  it('uses vehicle motive mode when pricing terrain for reachability', () => {
    let grid = createHexGrid({ radius: 3 });
    grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
    grid = setHex(grid, { q: 1, r: 0 }, TerrainType.LightWoods, 0);
    const unit = makeUnitAtOrigin();
    const cap: IMovementCapability = {
      walkMP: 3,
      runMP: 5,
      jumpMP: 0,
      movementMode: 'vtol',
    };

    const result = deriveReachableHexes(unit, MovementType.Walk, grid, cap);

    const woods = result.find((r) => r.hex.q === 1 && r.hex.r === 0);
    expect(woods).toMatchObject({
      mpCost: 1,
      terrainCost: 0,
      elevationCost: 0,
      heatGenerated: 0,
      movementMode: 'vtol',
      reachable: true,
      movementType: MovementType.Walk,
    });
  });

  it('allows walking through depth-1 water while blocking tracked entry', () => {
    let grid = createHexGrid({ radius: 3 });
    grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
    grid = setHex(grid, { q: 1, r: 0 }, TerrainType.Water, 0);
    const unit = makeUnitAtOrigin();

    const walking = deriveReachableHexes(unit, MovementType.Walk, grid, {
      walkMP: 3,
      runMP: 5,
      jumpMP: 0,
      movementMode: 'walk',
    }).find((r) => r.hex.q === 1 && r.hex.r === 0);
    const tracked = deriveReachableHexes(unit, MovementType.Walk, grid, {
      walkMP: 3,
      runMP: 5,
      jumpMP: 0,
      movementMode: 'tracked',
    }).find((r) => r.hex.q === 1 && r.hex.r === 0);
    const hover = deriveReachableHexes(unit, MovementType.Walk, grid, {
      walkMP: 3,
      runMP: 5,
      jumpMP: 0,
      movementMode: 'hover',
    }).find((r) => r.hex.q === 1 && r.hex.r === 0);

    expect(walking).toMatchObject({
      mpCost: 2,
      terrainCost: 1,
      heatGenerated: 1,
      movementMode: 'walk',
      reachable: true,
    });
    expect(tracked).toMatchObject({
      movementMode: 'tracked',
      reachable: false,
      blockedReason: 'Water blocks ground movement',
      movementInvalidReason: 'TerrainBlocked',
      movementInvalidDetails: 'Water blocks ground movement',
    });
    expect(hover).toMatchObject({
      mpCost: 1,
      terrainCost: 0,
      heatGenerated: 0,
      movementMode: 'hover',
      reachable: true,
    });
  });

  it('prices encoded deep water even when another feature is primary', () => {
    let grid = createHexGrid({ radius: 3 });
    grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
    grid = setHex(
      grid,
      { q: 1, r: 0 },
      terrainStringFromFeatures([
        { type: TerrainType.Water, level: 2 },
        { type: TerrainType.Smoke, level: 1 },
      ]),
      0,
    );
    const unit = makeUnitAtOrigin();

    const walking = deriveReachableHexes(unit, MovementType.Walk, grid, {
      walkMP: 4,
      runMP: 6,
      jumpMP: 0,
      movementMode: 'walk',
    }).find((r) => r.hex.q === 1 && r.hex.r === 0);
    const tracked = deriveReachableHexes(unit, MovementType.Walk, grid, {
      walkMP: 3,
      runMP: 5,
      jumpMP: 0,
      movementMode: 'tracked',
    }).find((r) => r.hex.q === 1 && r.hex.r === 0);
    const hover = deriveReachableHexes(unit, MovementType.Walk, grid, {
      walkMP: 3,
      runMP: 5,
      jumpMP: 0,
      movementMode: 'hover',
    }).find((r) => r.hex.q === 1 && r.hex.r === 0);

    expect(walking).toMatchObject({
      mpCost: 4,
      terrainCost: 3,
      movementMode: 'walk',
      reachable: true,
    });
    expect(tracked).toMatchObject({
      movementMode: 'tracked',
      reachable: false,
      blockedReason: 'Water blocks ground movement',
      movementInvalidReason: 'TerrainBlocked',
    });
    expect(hover).toMatchObject({
      mpCost: 1,
      movementMode: 'hover',
      reachable: true,
    });
  });

  it('uses the Playtest2 deep-water movement surcharge when enabled', () => {
    let grid = createHexGrid({ radius: 3 });
    grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
    grid = setHex(
      grid,
      { q: 1, r: 0 },
      terrainStringFromFeatures([{ type: TerrainType.Water, level: 2 }]),
      0,
    );
    const unit = makeUnitAtOrigin();
    const cap: IMovementCapability = {
      walkMP: 3,
      runMP: 5,
      jumpMP: 0,
      movementMode: 'walk',
    };

    const defaultWater = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      cap,
      { q: 1, r: 0 },
    );
    const playtest2Water = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      cap,
      { q: 1, r: 0 },
      'normal',
      { optionalRules: ['playtest_2'] },
    );

    expect(defaultWater).toMatchObject({
      reachable: false,
      mpCost: 4,
      terrainCost: 3,
      movementInvalidReason: 'InsufficientMP',
    });
    expect(playtest2Water).toMatchObject({
      reachable: true,
      mpCost: 3,
      terrainCost: 2,
      movementMode: 'walk',
    });
  });

  it('lets Playtest2 Mek-style running enter water after the first step', () => {
    let grid = createHexGrid({ radius: 3 });
    grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
    grid = setHex(grid, { q: 1, r: 0 }, TerrainType.Clear, 0);
    grid = setHex(
      grid,
      { q: 2, r: 0 },
      terrainStringFromFeatures([{ type: TerrainType.Water, level: 2 }]),
      0,
    );
    const unit = makeUnitAtOrigin();
    const cap: IMovementCapability = {
      walkMP: 3,
      runMP: 5,
      jumpMP: 0,
    };

    const standardRun = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Run,
      grid,
      cap,
      { q: 2, r: 0 },
    );
    const playtest2Run = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Run,
      grid,
      cap,
      { q: 2, r: 0 },
      'normal',
      { optionalRules: ['playtest_2'] },
    );

    expect(standardRun).toMatchObject({
      reachable: false,
      movementMode: 'run',
      blockedReason: 'Water blocks ground movement',
      movementInvalidReason: 'TerrainBlocked',
      movementInvalidDetails: 'Water blocks ground movement',
    });
    expect(playtest2Run).toMatchObject({
      reachable: true,
      movementMode: 'run',
      mpCost: 4,
      terrainCost: 2,
      heatGenerated: 2,
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        { q: 2, r: 0 },
      ],
    });
  });

  it('lets UMU movement cross deep water without water-depth MP surcharges', () => {
    let grid = createHexGrid({ radius: 3 });
    grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
    grid = setHex(
      grid,
      { q: 1, r: 0 },
      terrainStringFromFeatures([{ type: TerrainType.Water, level: 2 }]),
      0,
    );
    const unit = makeUnitAtOrigin();
    const baseCapability = { walkMP: 1, runMP: 1, jumpMP: 0 } as const;

    const walking = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      {
        ...baseCapability,
        movementMode: 'walk',
      },
      { q: 1, r: 0 },
    );
    const umu = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      {
        ...baseCapability,
        movementMode: 'umu',
        movementHeatProfile: 'none',
        movementTerrainProfile: 'infantry',
      },
      { q: 1, r: 0 },
    );

    expect(walking).toMatchObject({
      reachable: false,
      mpCost: 4,
      terrainCost: 3,
      movementMode: 'walk',
      movementInvalidReason: 'InsufficientMP',
    });
    expect(umu).toMatchObject({
      reachable: true,
      mpCost: 1,
      terrainCost: 0,
      elevationCost: 0,
      heatGenerated: 0,
      movementMode: 'umu',
      movementType: MovementType.Walk,
    });
  });

  it('lets UMU run movement enter water after the first step', () => {
    let grid = createHexGrid({ radius: 3 });
    grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
    grid = setHex(grid, { q: 1, r: 0 }, TerrainType.Clear, 0);
    grid = setHex(
      grid,
      { q: 2, r: 0 },
      terrainStringFromFeatures([{ type: TerrainType.Water, level: 2 }]),
      0,
    );
    const unit = makeUnitAtOrigin();

    const umu = deriveReachableHexes(unit, MovementType.Run, grid, {
      walkMP: 2,
      runMP: 2,
      jumpMP: 0,
      movementMode: 'umu',
      movementHeatProfile: 'none',
      movementTerrainProfile: 'infantry',
    }).find((r) => r.hex.q === 2 && r.hex.r === 0);

    expect(umu).toMatchObject({
      reachable: true,
      mpCost: 2,
      terrainCost: 0,
      heatGenerated: 0,
      movementMode: 'umu',
      movementType: MovementType.Run,
    });
  });

  it('keeps Mek swim movement in water and ignores represented elevation rises', () => {
    let grid = createHexGrid({ radius: 3 });
    grid = setHex(
      grid,
      { q: 0, r: 0 },
      terrainStringFromFeatures([{ type: TerrainType.Water, level: 2 }]),
      0,
    );
    grid = setHex(
      grid,
      { q: 1, r: 0 },
      terrainStringFromFeatures([{ type: TerrainType.Water, level: 2 }]),
      3,
    );
    grid = setHex(grid, { q: 0, r: 1 }, TerrainType.Clear, 0);
    const unit = makeUnitAtOrigin();
    const capability = {
      walkMP: 1,
      runMP: 1,
      jumpMP: 0,
      movementMode: 'biped_swim',
    } as const;

    const elevatedWater = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      capability,
      { q: 1, r: 0 },
    );
    const dryLand = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      capability,
      { q: 0, r: 1 },
    );

    expect(elevatedWater).toMatchObject({
      reachable: true,
      mpCost: 1,
      terrainCost: 0,
      elevationDelta: 3,
      elevationCost: 0,
      heatGenerated: 1,
      movementMode: 'biped_swim',
      movementType: MovementType.Walk,
    });
    expect(dryLand).toMatchObject({
      reachable: false,
      blockedReason: 'Biped swim movement requires water terrain',
      movementInvalidReason: 'TerrainBlocked',
      movementInvalidDetails: 'Biped swim movement requires water terrain',
    });
  });

  it('lets tracked movement cross ice-covered water as surface terrain', () => {
    let grid = createHexGrid({ radius: 3 });
    grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
    grid = setHex(
      grid,
      { q: 1, r: 0 },
      terrainStringFromFeatures([
        { type: TerrainType.Water, level: 2 },
        { type: TerrainType.Ice, level: 1 },
      ]),
      0,
    );
    const unit = makeUnitAtOrigin();

    const tracked = deriveReachableHexes(unit, MovementType.Walk, grid, {
      walkMP: 3,
      runMP: 5,
      jumpMP: 0,
      movementMode: 'tracked',
    }).find((r) => r.hex.q === 1 && r.hex.r === 0);

    // Audit 2026-06-09 C-3: ice charges +1 to tracked (only hover/WiGE are
    // exempt per MegaMek Terrain.movementCost) — the surface crossing stays
    // legal but is no longer free.
    expect(tracked).toMatchObject({
      mpCost: 2,
      terrainCost: 1,
      heatGenerated: 0,
      movementMode: 'tracked',
      reachable: true,
    });
  });

  it('lets tracked movement cross bridge-covered water as surface terrain', () => {
    let grid = createHexGrid({ radius: 3 });
    grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
    grid = setHex(
      grid,
      { q: 1, r: 0 },
      terrainStringFromFeatures([
        { type: TerrainType.Water, level: 2 },
        { type: TerrainType.Bridge, level: 1 },
      ]),
      0,
    );
    const unit = makeUnitAtOrigin();

    const tracked = deriveReachableHexes(unit, MovementType.Walk, grid, {
      walkMP: 3,
      runMP: 5,
      jumpMP: 0,
      movementMode: 'tracked',
    }).find((r) => r.hex.q === 1 && r.hex.r === 0);

    expect(tracked).toMatchObject({
      mpCost: 1,
      terrainCost: 0,
      heatGenerated: 0,
      movementMode: 'tracked',
      reachable: true,
    });
  });

  it('lets tracked movement cross paved-road water as surface terrain', () => {
    let grid = createHexGrid({ radius: 3 });
    grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
    grid = setHex(
      grid,
      { q: 1, r: 0 },
      terrainStringFromFeatures([
        { type: TerrainType.Water, level: 2 },
        { type: TerrainType.Road, level: 1 },
      ]),
      0,
    );
    const unit = makeUnitAtOrigin();

    const tracked = deriveReachableHexes(unit, MovementType.Walk, grid, {
      walkMP: 3,
      runMP: 5,
      jumpMP: 0,
      movementMode: 'tracked',
    }).find((r) => r.hex.q === 1 && r.hex.r === 0);

    expect(tracked).toMatchObject({
      mpCost: 1,
      terrainCost: 0,
      heatGenerated: 0,
      movementMode: 'tracked',
      reachable: true,
    });
  });

  it.each([3, 4] as const)(
    'blocks tracked movement from treating road level %i water as paved surface',
    (roadLevel) => {
      let grid = createHexGrid({ radius: 3 });
      grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
      grid = setHex(
        grid,
        { q: 1, r: 0 },
        terrainStringFromFeatures([
          { type: TerrainType.Water, level: 2 },
          { type: TerrainType.Road, level: roadLevel },
        ]),
        0,
      );
      const unit = makeUnitAtOrigin();

      const tracked = deriveReachableHexes(unit, MovementType.Walk, grid, {
        walkMP: 3,
        runMP: 5,
        jumpMP: 0,
        movementMode: 'tracked',
      }).find((r) => r.hex.q === 1 && r.hex.r === 0);

      expect(tracked).toMatchObject({
        mpCost: Infinity,
        heatGenerated: 0,
        movementMode: 'tracked',
        reachable: false,
        blockedReason: 'Water blocks ground movement',
        movementInvalidReason: 'TerrainBlocked',
        movementInvalidDetails: 'Water blocks ground movement',
      });
    },
  );

  it('projects tracked road-bonus destinations one MP beyond base walking MP', () => {
    let grid = createHexGrid({ radius: 4 });
    for (const q of [1, 2, 3]) {
      grid = setHex(
        grid,
        { q, r: 0 },
        terrainStringFromFeatures([{ type: TerrainType.Road, level: 1 }]),
        0,
      );
    }
    const unit = makeUnitAtOrigin();

    const tracked = deriveReachableHexes(unit, MovementType.Walk, grid, {
      walkMP: 2,
      runMP: 3,
      jumpMP: 0,
      movementMode: 'tracked',
    }).find((r) => r.hex.q === 3 && r.hex.r === 0);

    expect(tracked).toMatchObject({
      mpCost: 3,
      terrainCost: 0,
      heatGenerated: 0,
      movementMode: 'tracked',
      reachable: true,
    });
  });

  it('gates represented infantry pavement bonus behind the TacOps option', () => {
    let grid = createHexGrid({ radius: 4 });
    for (const q of [1, 2, 3]) {
      grid = setHex(
        grid,
        { q, r: 0 },
        terrainStringFromFeatures([{ type: TerrainType.Road, level: 1 }]),
        0,
      );
    }
    const unit = makeUnitAtOrigin();
    const mechanizedInfantry: IMovementCapability = {
      walkMP: 2,
      runMP: 2,
      jumpMP: 0,
      movementMode: 'tracked',
      movementHeatProfile: 'none',
      pavementRoadBonusProfile: 'tacops_infantry',
    };

    const disabled = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      mechanizedInfantry,
      { q: 3, r: 0 },
    );
    const enabled = deriveReachableHexes(
      unit,
      MovementType.Walk,
      grid,
      mechanizedInfantry,
      'normal',
      { optionalRules: ['tacops_inf_pave_bonus'] },
    ).find((r) => r.hex.q === 3 && r.hex.r === 0);

    expect(disabled).toMatchObject({
      reachable: false,
      movementMode: 'tracked',
      movementInvalidReason: 'InsufficientMP',
      movementInvalidDetails:
        'Destination is 3 hexes away, but max range for walk is 2',
    });
    expect(enabled).toMatchObject({
      mpCost: 3,
      terrainCost: 0,
      heatGenerated: 0,
      movementMode: 'tracked',
      reachable: true,
    });
  });

  it('requires dirt and gravel road bonus paths to match MegaMek motive eligibility', () => {
    let dirtGrid = createHexGrid({ radius: 4 });
    let gravelGrid = createHexGrid({ radius: 4 });
    for (const q of [1, 2, 3]) {
      dirtGrid = setHex(
        dirtGrid,
        { q, r: 0 },
        terrainStringFromFeatures([{ type: TerrainType.Road, level: 3 }]),
        0,
      );
      gravelGrid = setHex(
        gravelGrid,
        { q, r: 0 },
        terrainStringFromFeatures([{ type: TerrainType.Road, level: 4 }]),
        0,
      );
    }
    const unit = makeUnitAtOrigin();
    const baseCapability = { walkMP: 2, runMP: 3, jumpMP: 0 } as const;

    const hoverDirt = deriveReachableHexes(unit, MovementType.Walk, dirtGrid, {
      ...baseCapability,
      movementMode: 'hover',
    }).find((r) => r.hex.q === 3 && r.hex.r === 0);
    const trackedDirt = deriveReachableHexes(
      unit,
      MovementType.Walk,
      dirtGrid,
      {
        ...baseCapability,
        movementMode: 'tracked',
      },
    ).find((r) => r.hex.q === 3 && r.hex.r === 0);
    const trackedGravel = deriveReachableHexes(
      unit,
      MovementType.Walk,
      gravelGrid,
      {
        ...baseCapability,
        movementMode: 'tracked',
      },
    ).find((r) => r.hex.q === 3 && r.hex.r === 0);
    const wheeledGravel = deriveReachableHexes(
      unit,
      MovementType.Walk,
      gravelGrid,
      {
        ...baseCapability,
        movementMode: 'wheeled',
      },
    ).find((r) => r.hex.q === 3 && r.hex.r === 0);

    expect(hoverDirt).toMatchObject({ reachable: true, mpCost: 3 });
    expect(trackedDirt).toMatchObject({
      reachable: false,
      mpCost: 3,
      movementInvalidReason: 'InsufficientMP',
      movementInvalidDetails: 'Path costs 3 MP, but only 2 MP is available',
    });
    expect(trackedGravel).toMatchObject({ reachable: true, mpCost: 3 });
    expect(wheeledGravel).toMatchObject({
      reachable: false,
      mpCost: 3,
      movementInvalidReason: 'InsufficientMP',
      movementInvalidDetails: 'Path costs 3 MP, but only 2 MP is available',
    });
  });

  it('blocks naval movement under low bridges while letting submarines pass with depth clearance', () => {
    let grid = createHexGrid({ radius: 3 });
    grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Water, 0);
    grid = setHex(
      grid,
      { q: 1, r: 0 },
      terrainStringFromFeatures([
        { type: TerrainType.Water, level: 2 },
        { type: TerrainType.Bridge, level: 0 },
      ]),
      0,
    );
    const unit = makeUnitAtOrigin();

    const naval = deriveReachableHexes(unit, MovementType.Walk, grid, {
      walkMP: 3,
      runMP: 5,
      jumpMP: 0,
      movementMode: 'naval',
    }).find((r) => r.hex.q === 1 && r.hex.r === 0);
    const submarine = deriveReachableHexes(unit, MovementType.Walk, grid, {
      walkMP: 3,
      runMP: 5,
      jumpMP: 0,
      movementMode: 'submarine',
    }).find((r) => r.hex.q === 1 && r.hex.r === 0);

    expect(naval).toMatchObject({
      reachable: false,
      movementMode: 'naval',
      blockedReason: 'Naval movement lacks bridge clearance',
      movementInvalidReason: 'TerrainBlocked',
      movementInvalidDetails: 'Naval movement lacks bridge clearance',
    });
    expect(submarine).toMatchObject({
      mpCost: 1,
      terrainCost: 0,
      heatGenerated: 0,
      movementMode: 'submarine',
      reachable: true,
    });
  });

  it('uses runtime unit height override for bridge-clearance movement projection', () => {
    let grid = createHexGrid({ radius: 2 });
    grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Water, 0);
    grid = setHex(
      grid,
      { q: 1, r: 0 },
      terrainStringFromFeatures([
        { type: TerrainType.Water, level: 1 },
        { type: TerrainType.Bridge, level: 1 },
      ]),
      0,
    );
    const capability: IMovementCapability = {
      walkMP: 3,
      runMP: 5,
      jumpMP: 0,
      movementMode: 'naval',
    };

    const lowProfile = deriveMovementRangeHexForDestination(
      makeUnitAtOrigin(),
      MovementType.Walk,
      grid,
      capability,
      { q: 1, r: 0 },
    );
    const tallRuntimeState = deriveMovementRangeHexForDestination(
      { ...makeUnitAtOrigin(), unitHeight: 1 },
      MovementType.Walk,
      grid,
      capability,
      { q: 1, r: 0 },
    );

    expect(lowProfile).toMatchObject({
      reachable: true,
      movementMode: 'naval',
    });
    expect(tallRuntimeState).toMatchObject({
      reachable: false,
      movementMode: 'naval',
      blockedReason: 'Naval movement lacks bridge clearance',
      movementInvalidReason: 'TerrainBlocked',
      movementInvalidDetails: 'Naval movement lacks bridge clearance',
    });
  });

  it('lets infantry dismount state override stale mounted height for bridge-clearance projection', () => {
    let grid = createHexGrid({ radius: 2 });
    grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Water, 0);
    grid = setHex(
      grid,
      { q: 1, r: 0 },
      terrainStringFromFeatures([
        { type: TerrainType.Water, level: 1 },
        { type: TerrainType.Bridge, level: 1 },
      ]),
      0,
    );
    const capability: IMovementCapability = {
      walkMP: 3,
      runMP: 5,
      jumpMP: 0,
      movementMode: 'naval',
      unitHeight: 1,
      unitHeightProfile: { kind: 'infantry_mount', mountedHeight: 1 },
    };

    const mountedState = deriveMovementRangeHexForDestination(
      { ...makeUnitAtOrigin(), infantryMounted: true },
      MovementType.Walk,
      grid,
      capability,
      { q: 1, r: 0 },
    );
    const dismountedState = deriveMovementRangeHexForDestination(
      { ...makeUnitAtOrigin(), infantryMounted: false, unitHeight: 1 },
      MovementType.Walk,
      grid,
      capability,
      { q: 1, r: 0 },
    );

    expect(mountedState).toMatchObject({
      reachable: false,
      movementMode: 'naval',
      blockedReason: 'Naval movement lacks bridge clearance',
      movementInvalidReason: 'TerrainBlocked',
      movementInvalidDetails: 'Naval movement lacks bridge clearance',
    });
    expect(dismountedState).toMatchObject({
      reachable: true,
      mpCost: 1,
      terrainCost: 0,
      movementMode: 'naval',
    });
  });

  it('lets flotation-hull tracked vehicles enter water with water MP costs', () => {
    let grid = createHexGrid({ radius: 3 });
    grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
    grid = setHex(
      grid,
      { q: 1, r: 0 },
      terrainStringFromFeatures([{ type: TerrainType.Water, level: 2 }]),
      0,
    );
    const unit = makeUnitAtOrigin();

    const tracked = deriveReachableHexes(unit, MovementType.Walk, grid, {
      walkMP: 4,
      runMP: 6,
      jumpMP: 0,
      movementMode: 'tracked',
      waterCapability: { flotationHull: true },
    }).find((r) => r.hex.q === 1 && r.hex.r === 0);

    expect(tracked).toMatchObject({
      mpCost: 4,
      terrainCost: 3,
      heatGenerated: 0,
      movementMode: 'tracked',
      reachable: true,
    });
  });

  it('applies Frogman deep-water movement cost reduction when represented', () => {
    let grid = createHexGrid({ radius: 3 });
    grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
    grid = setHex(
      grid,
      { q: 1, r: 0 },
      terrainStringFromFeatures([{ type: TerrainType.Water, level: 2 }]),
      0,
    );
    const unit = makeUnitAtOrigin();

    const standard = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      {
        walkMP: 3,
        runMP: 5,
        jumpMP: 0,
        movementMode: 'walk',
      },
      { q: 1, r: 0 },
    );
    const frogman = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      {
        walkMP: 3,
        runMP: 5,
        jumpMP: 0,
        movementMode: 'walk',
        waterCapability: { frogmanSpecialist: true },
      },
      { q: 1, r: 0 },
    );

    expect(standard).toMatchObject({
      reachable: false,
      mpCost: 4,
      terrainCost: 3,
      movementInvalidReason: 'InsufficientMP',
    });
    expect(frogman).toMatchObject({
      reachable: true,
      mpCost: 3,
      terrainCost: 2,
      elevationCost: 0,
      movementMode: 'walk',
      movementType: MovementType.Walk,
    });
  });

  it('lets flotation-hull tracked vehicles run one first step into water', () => {
    let grid = createHexGrid({ radius: 3 });
    grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
    grid = setHex(
      grid,
      { q: 1, r: 0 },
      terrainStringFromFeatures([{ type: TerrainType.Water, level: 2 }]),
      0,
    );
    const unit = makeUnitAtOrigin();

    const tracked = deriveReachableHexes(unit, MovementType.Run, grid, {
      walkMP: 4,
      runMP: 6,
      jumpMP: 0,
      movementMode: 'tracked',
      waterCapability: { flotationHull: true },
    }).find((r) => r.hex.q === 1 && r.hex.r === 0);

    expect(tracked).toMatchObject({
      mpCost: 4,
      terrainCost: 3,
      heatGenerated: 0,
      movementMode: 'tracked',
      reachable: true,
    });
  });

  it('blocks flotation-hull tracked vehicles from running into water after the first step', () => {
    let grid = createHexGrid({ radius: 3 });
    grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
    grid = setHex(grid, { q: 1, r: 0 }, TerrainType.Clear, 0);
    grid = setHex(
      grid,
      { q: 2, r: 0 },
      terrainStringFromFeatures([{ type: TerrainType.Water, level: 2 }]),
      0,
    );
    const unit = makeUnitAtOrigin();

    const tracked = deriveReachableHexes(unit, MovementType.Run, grid, {
      walkMP: 4,
      runMP: 6,
      jumpMP: 0,
      movementMode: 'tracked',
      waterCapability: { flotationHull: true },
    }).find((r) => r.hex.q === 2 && r.hex.r === 0);

    expect(tracked).toMatchObject({
      movementMode: 'tracked',
      reachable: false,
      blockedReason: 'Water blocks ground movement',
      movementInvalidReason: 'TerrainBlocked',
      movementInvalidDetails: 'Water blocks ground movement',
    });
  });

  it('lets fully amphibious tracked vehicles run into water with amphibious MP cost', () => {
    let grid = createHexGrid({ radius: 3 });
    grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
    grid = setHex(
      grid,
      { q: 1, r: 0 },
      terrainStringFromFeatures([{ type: TerrainType.Water, level: 2 }]),
      0,
    );
    const unit = makeUnitAtOrigin();

    const tracked = deriveReachableHexes(unit, MovementType.Run, grid, {
      walkMP: 4,
      runMP: 6,
      jumpMP: 0,
      movementMode: 'tracked',
      waterCapability: { fullyAmphibious: true },
    }).find((r) => r.hex.q === 1 && r.hex.r === 0);

    expect(tracked).toMatchObject({
      mpCost: 2,
      terrainCost: 1,
      heatGenerated: 0,
      movementMode: 'tracked',
      reachable: true,
    });
  });

  it('lets VTOL motive ignore abrupt elevation changes for reachability', () => {
    let grid = createHexGrid({ radius: 3 });
    grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
    grid = setHex(grid, { q: 1, r: 0 }, TerrainType.Clear, 4);
    const unit = makeUnitAtOrigin();
    const cap: IMovementCapability = {
      walkMP: 3,
      runMP: 5,
      jumpMP: 0,
      movementMode: 'vtol',
    };

    const result = deriveReachableHexes(unit, MovementType.Walk, grid, cap);

    const highGround = result.find((r) => r.hex.q === 1 && r.hex.r === 0);
    expect(highGround).toMatchObject({
      mpCost: 1,
      elevationDelta: 4,
      elevationCost: 0,
      movementMode: 'vtol',
      reachable: true,
    });
  });

  it('lets WiGE motive ignore ground terrain and abrupt elevation like an airborne mover', () => {
    let grid = createHexGrid({ radius: 3 });
    grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
    grid = setHex(grid, { q: 1, r: 0 }, TerrainType.HeavyWoods, 4);
    const unit = makeUnitAtOrigin();

    const result = deriveReachableHexes(unit, MovementType.Walk, grid, {
      walkMP: 3,
      runMP: 5,
      jumpMP: 0,
      movementMode: 'wige',
    });

    const highWoods = result.find((r) => r.hex.q === 1 && r.hex.r === 0);
    expect(highWoods).toMatchObject({
      mpCost: 1,
      terrainCost: 0,
      elevationDelta: 4,
      elevationCost: 0,
      movementMode: 'wige',
      reachable: true,
      movementType: MovementType.Walk,
    });
  });

  it('charges WiGE climb-mode MP when entering a higher represented building top', () => {
    let grid = createHexGrid({ radius: 3 });
    grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
    grid = setHex(
      grid,
      { q: 1, r: 0 },
      terrainStringFromFeatures([{ type: TerrainType.Building, level: 3 }]),
      0,
    );
    const unit = makeUnitAtOrigin();
    const capability: IMovementCapability = {
      walkMP: 3,
      runMP: 5,
      jumpMP: 0,
      movementMode: 'wige',
    };

    const preview = deriveReachableHexes(
      unit,
      MovementType.Walk,
      grid,
      capability,
    ).find((r) => r.hex.q === 1 && r.hex.r === 0);
    expect(preview).toMatchObject({
      mpCost: 3,
      terrainCost: 2,
      elevationDelta: 0,
      elevationCost: 0,
      movementMode: 'wige',
      reachable: true,
      movementType: MovementType.Walk,
    });

    const commit = validateCommittedMovement({
      grid,
      unit,
      to: { q: 1, r: 0 },
      facing: Facing.Southeast,
      movementType: MovementType.Walk,
      capability,
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
    });
    expect(commit).toMatchObject({
      valid: true,
      mpCost: 3,
      heatGenerated: 0,
    });

    const insufficientCapability: IMovementCapability = {
      ...capability,
      walkMP: 2,
    };
    const overBudgetPreview = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      insufficientCapability,
      { q: 1, r: 0 },
    );
    expect(overBudgetPreview).toMatchObject({
      mpCost: 3,
      terrainCost: 2,
      movementMode: 'wige',
      reachable: false,
      movementInvalidReason: 'InsufficientMP',
    });

    const overBudgetCommit = validateCommittedMovement({
      grid,
      unit,
      to: { q: 1, r: 0 },
      facing: Facing.Southeast,
      movementType: MovementType.Walk,
      capability: insufficientCapability,
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
    });
    expect(overBudgetCommit).toMatchObject({
      valid: false,
      reason: 'InsufficientMP',
      mpCost: 3,
      heatGenerated: 0,
    });
  });

  it('uses explicit directional cliff metadata for WiGE and vehicle ascent projection', () => {
    let grid = createHexGrid({ radius: 3 });
    grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
    grid = setHex(grid, { q: -1, r: 0 }, TerrainType.Clear, 1);
    grid = setHex(
      grid,
      { q: 1, r: 0 },
      terrainStringFromFeatures([
        {
          type: TerrainType.Clear,
          level: 0,
          cliffTopExits: [
            Facing.North,
            Facing.Northeast,
            Facing.Southeast,
            Facing.South,
            Facing.Southwest,
            Facing.Northwest,
          ],
        },
      ]),
      1,
    );
    const unit = makeUnitAtOrigin();

    const ordinaryTrackedRise = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      {
        walkMP: 4,
        runMP: 6,
        jumpMP: 0,
        movementMode: 'tracked',
      },
      { q: -1, r: 0 },
    );
    expect(ordinaryTrackedRise).toMatchObject({
      mpCost: 3,
      movementMode: 'tracked',
      elevationDelta: 1,
      elevationCost: 2,
      reachable: true,
    });

    const wigeCapability: IMovementCapability = {
      walkMP: 2,
      runMP: 3,
      jumpMP: 0,
      movementMode: 'wige',
    };
    const wigePreview = deriveReachableHexes(
      unit,
      MovementType.Walk,
      grid,
      wigeCapability,
    ).find((r) => r.hex.q === 1 && r.hex.r === 0);
    expect(wigePreview).toMatchObject({
      mpCost: 2,
      terrainCost: 1,
      elevationDelta: 1,
      elevationCost: 0,
      movementMode: 'wige',
      reachable: true,
    });

    const wigeCommit = validateCommittedMovement({
      grid,
      unit,
      to: { q: 1, r: 0 },
      facing: Facing.Southeast,
      movementType: MovementType.Walk,
      capability: wigeCapability,
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
    });
    expect(wigeCommit).toMatchObject({
      valid: true,
      mpCost: 2,
      heatGenerated: 0,
    });

    const trackedPreview = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      {
        walkMP: 4,
        runMP: 6,
        jumpMP: 0,
        movementMode: 'tracked',
      },
      { q: 1, r: 0 },
    );
    expect(trackedPreview).toMatchObject({
      mpCost: Infinity,
      movementMode: 'tracked',
      reachable: false,
      movementInvalidReason: 'TerrainBlocked',
      movementInvalidDetails: 'Tracked movement cannot ascend a sheer cliff',
    });

    const trackedCommit = validateCommittedMovement({
      grid,
      unit,
      to: { q: 1, r: 0 },
      facing: Facing.Southeast,
      movementType: MovementType.Walk,
      capability: {
        walkMP: 4,
        runMP: 6,
        jumpMP: 0,
        movementMode: 'tracked',
      },
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
    });
    expect(trackedCommit).toMatchObject({
      valid: false,
      reason: 'TerrainBlocked',
      details: 'Tracked movement cannot ascend a sheer cliff',
      mpCost: Infinity,
      heatGenerated: 0,
    });
  });

  it('uses parsed MegaMek cliff_top exits for movement projection', () => {
    const grid = gridFromParsedBoard(`size 2 1
hex 0101 0 "" ""
hex 0201 1 "cliff_top:1:32" ""
end`);
    const unit = makeUnitAtOrigin();

    const wigePreview = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      {
        walkMP: 2,
        runMP: 3,
        jumpMP: 0,
        movementMode: 'wige',
      },
      { q: 1, r: 0 },
    );
    expect(wigePreview).toMatchObject({
      mpCost: 2,
      terrainCost: 1,
      elevationDelta: 1,
      movementMode: 'wige',
      reachable: true,
    });

    const trackedPreview = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      {
        walkMP: 4,
        runMP: 6,
        jumpMP: 0,
        movementMode: 'tracked',
      },
      { q: 1, r: 0 },
    );
    expect(trackedPreview).toMatchObject({
      mpCost: Infinity,
      movementMode: 'tracked',
      reachable: false,
      movementInvalidReason: 'TerrainBlocked',
      movementInvalidDetails: 'Tracked movement cannot ascend a sheer cliff',
    });
  });

  it.each([
    {
      label: 'VTOL',
      movementMode: 'vtol',
      motionType: GroundMotionType.VTOL,
      reason: AIRBORNE_VTOL_GROUND_MOVEMENT_BLOCKED_REASON,
    },
    {
      label: 'WiGE',
      movementMode: 'wige',
      motionType: GroundMotionType.WIGE,
      reason: AIRBORNE_WIGE_GROUND_MOVEMENT_BLOCKED_REASON,
    },
  ] as const)(
    'blocks airborne $label ground projection while preserving landed movement',
    ({ movementMode, motionType, reason }) => {
      let grid = createHexGrid({ radius: 3 });
      grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
      grid = setHex(grid, { q: 1, r: 0 }, TerrainType.HeavyWoods, 4);
      const capability: IMovementCapability = {
        walkMP: 3,
        runMP: 5,
        jumpMP: 0,
        movementMode,
      };
      const vehicleCombatState = (altitude: number) => ({
        kind: 'vehicle' as const,
        state: createVehicleCombatState({
          unitId: 'u1',
          motionType,
          originalCruiseMP: 3,
          armor: {},
          structure: {},
          altitude,
        }),
      });
      const airborneUnit = {
        ...makeUnitAtOrigin(),
        combatState: vehicleCombatState(2),
      };
      const landedUnit = {
        ...makeUnitAtOrigin(),
        combatState: vehicleCombatState(0),
      };

      const airbornePreview = deriveMovementRangeHexForDestination(
        airborneUnit,
        MovementType.Walk,
        grid,
        capability,
        { q: 1, r: 0 },
      );
      if (movementMode === 'wige') {
        expect(airbornePreview).toMatchObject({
          mpCost: 1,
          terrainCost: 0,
          elevationDelta: 4,
          elevationCost: 0,
          movementMode,
          reachable: true,
          movementType: MovementType.Walk,
          automaticLandingRequired: true,
          automaticLandingMode: 'wige',
          automaticLandingDistance: 1,
          automaticLandingMinimumDistance: 5,
        });
      } else {
        expect(airbornePreview).toMatchObject({
          mpCost: Infinity,
          heatGenerated: 0,
          movementMode,
          reachable: false,
          movementType: MovementType.Walk,
          blockedReason: reason,
          movementInvalidReason: 'InvalidDestination',
          movementInvalidDetails: reason,
          altitudeControlRequired: true,
          altitudeControlMode: movementMode,
          altitudeControlAltitude: 2,
        });
      }

      const commit = validateCommittedMovement({
        grid,
        unit: airborneUnit,
        to: { q: 1, r: 0 },
        facing: Facing.Southeast,
        movementType: MovementType.Walk,
        capability,
        path: [
          { q: 0, r: 0 },
          { q: 1, r: 0 },
        ],
      });
      if (movementMode === 'wige') {
        expect(commit).toMatchObject({
          valid: true,
          mpCost: 1,
          heatGenerated: 0,
        });
      } else {
        expect(commit).toMatchObject({
          valid: false,
          reason: 'InvalidDestination',
          details: reason,
          mpCost: Infinity,
          heatGenerated: 0,
        });
      }

      const landedPreview = deriveMovementRangeHexForDestination(
        landedUnit,
        MovementType.Walk,
        grid,
        capability,
        { q: 1, r: 0 },
      );
      expect(landedPreview).toMatchObject({
        mpCost: 1,
        terrainCost: 0,
        elevationDelta: 4,
        elevationCost: 0,
        movementMode,
        reachable: true,
        movementType: MovementType.Walk,
      });

      const staleCapability: IMovementCapability = {
        ...capability,
        movementMode: 'walk',
      };
      const stalePreview = deriveMovementRangeHexForDestination(
        airborneUnit,
        MovementType.Walk,
        grid,
        staleCapability,
        { q: 1, r: 0 },
      );
      expect(stalePreview).toMatchObject({
        mpCost: Infinity,
        heatGenerated: 0,
        movementMode: 'walk',
        reachable: false,
        movementType: MovementType.Walk,
        blockedReason: reason,
        movementInvalidReason: 'InvalidDestination',
        movementInvalidDetails: reason,
        altitudeControlRequired: true,
        altitudeControlMode: movementMode,
        altitudeControlAltitude: 2,
      });

      const staleCommit = validateCommittedMovement({
        grid,
        unit: airborneUnit,
        to: { q: 1, r: 0 },
        facing: Facing.Southeast,
        movementType: MovementType.Walk,
        capability: staleCapability,
        path: [
          { q: 0, r: 0 },
          { q: 1, r: 0 },
        ],
      });
      expect(staleCommit).toMatchObject({
        valid: false,
        reason: 'InvalidDestination',
        details: reason,
        mpCost: Infinity,
        heatGenerated: 0,
      });
    },
  );

  it('counts prior WiGE movement before showing automatic landing metadata', () => {
    let grid = createHexGrid({ radius: 5 });
    grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
    grid = setHex(grid, { q: 1, r: 0 }, TerrainType.Clear, 0);
    const capability: IMovementCapability = {
      walkMP: 5,
      runMP: 7,
      jumpMP: 0,
      movementMode: 'wige',
    };
    const unit = {
      ...makeUnitAtOrigin(),
      hexesMovedThisTurn: 4,
      combatState: {
        kind: 'vehicle' as const,
        state: createVehicleCombatState({
          unitId: 'u1',
          motionType: GroundMotionType.WIGE,
          originalCruiseMP: 5,
          armor: {},
          structure: {},
          altitude: 2,
        }),
      },
    };

    const preview = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      capability,
      { q: 1, r: 0 },
    );

    expect(preview).toMatchObject({
      mpCost: 1,
      movementMode: 'wige',
      reachable: true,
      movementType: MovementType.Walk,
    });
    expect(preview?.automaticLandingRequired).toBeUndefined();
    expect(preview?.automaticLandingDistance).toBeUndefined();
  });

  it('does not show automatic landing metadata for represented hover-style WiGE movement', () => {
    let grid = createHexGrid({ radius: 3 });
    grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Clear, 0);
    grid = setHex(grid, { q: 1, r: 0 }, TerrainType.Clear, 0);
    const unit = {
      ...makeUnitAtOrigin(),
      conversionMode: 'airmek' as const,
      lamAirMekAltitude: 2,
    };

    const preview = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      {
        walkMP: 3,
        runMP: 5,
        jumpMP: 0,
        movementMode: 'hover',
      },
      { q: 1, r: 0 },
    );

    expect(preview).toMatchObject({
      mpCost: 1,
      movementMode: 'hover',
      reachable: true,
      movementType: MovementType.Walk,
    });
    expect(preview?.automaticLandingRequired).toBeUndefined();
    expect(preview?.automaticLandingDistance).toBeUndefined();
  });

  it('reserves represented WiGE altitude-control MP before landed ground movement', () => {
    const grid = createHexGrid({ radius: 3 });
    const unit = {
      ...makeUnitAtOrigin(),
      pendingAltitudeControlStepCount: 1,
      pendingAltitudeControlMpCost: 1,
      combatState: {
        kind: 'vehicle' as const,
        state: createVehicleCombatState({
          unitId: 'u1',
          motionType: GroundMotionType.WIGE,
          originalCruiseMP: 2,
          armor: {},
          structure: {},
          altitude: 0,
        }),
      },
    };
    const capability: IMovementCapability = {
      walkMP: 2,
      runMP: 3,
      jumpMP: 0,
      movementMode: 'wige',
    };

    const reachable = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      capability,
      { q: 1, r: 0 },
    );
    expect(reachable).toMatchObject({
      reachable: true,
      mpCost: 2,
      movementMode: 'wige',
      altitudeControlStepCount: 1,
      altitudeControlMpCost: 1,
    });

    const tooFar = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      capability,
      { q: 2, r: 0 },
    );
    expect(tooFar).toMatchObject({
      reachable: false,
      mpCost: 3,
      movementInvalidReason: 'InsufficientMP',
      movementInvalidDetails:
        'Destination is 2 hexes away, but max range for walk after altitude control is 1',
      altitudeControlStepCount: 1,
      altitudeControlMpCost: 1,
    });

    const committed = validateCommittedMovement({
      grid,
      unit,
      to: { q: 2, r: 0 },
      facing: Facing.Northeast,
      movementType: MovementType.Walk,
      capability,
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        { q: 2, r: 0 },
      ],
    });
    expect(committed).toMatchObject({
      valid: false,
      reason: 'InsufficientMP',
      details:
        'Destination is 2 hexes away, but max range for walk after altitude control is 1',
      mpCost: 3,
    });
  });

  it('requires naval motive movement to stay on water terrain', () => {
    let grid = createHexGrid({ radius: 3 });
    grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Water, 0);
    grid = setHex(grid, { q: 1, r: 0 }, TerrainType.Water, 0);
    grid = setHex(grid, { q: 0, r: 1 }, TerrainType.Clear, 0);
    const unit = makeUnitAtOrigin();
    const cap: IMovementCapability = {
      walkMP: 3,
      runMP: 5,
      jumpMP: 0,
      movementMode: 'naval',
    };

    const result = deriveReachableHexes(unit, MovementType.Walk, grid, cap);
    const water = result.find((r) => r.hex.q === 1 && r.hex.r === 0);
    const land = result.find((r) => r.hex.q === 0 && r.hex.r === 1);

    expect(water).toMatchObject({
      mpCost: 1,
      terrainCost: 0,
      elevationCost: 0,
      movementMode: 'naval',
      reachable: true,
    });
    expect(land).toMatchObject({
      movementMode: 'naval',
      reachable: false,
      blockedReason: 'Naval movement requires water terrain',
      movementInvalidReason: 'TerrainBlocked',
      movementInvalidDetails: 'Naval movement requires water terrain',
    });
  });

  it.each<['hydrofoil' | 'submarine', string]>([
    ['hydrofoil', 'Hydrofoil movement requires water terrain'],
    ['submarine', 'Submarine movement requires water terrain'],
  ])(
    'marks %s land destinations blocked with a motive-specific reason',
    (movementMode, blockedReason) => {
      let grid = createHexGrid({ radius: 3 });
      grid = setHex(grid, { q: 0, r: 0 }, TerrainType.Water, 0);
      grid = setHex(grid, { q: 1, r: 0 }, TerrainType.Clear, 0);
      const unit = makeUnitAtOrigin();

      const result = deriveReachableHexes(unit, MovementType.Walk, grid, {
        walkMP: 3,
        runMP: 5,
        jumpMP: 0,
        movementMode,
      }).find((r) => r.hex.q === 1 && r.hex.r === 0);

      expect(result).toMatchObject({
        movementMode,
        reachable: false,
        blockedReason,
        movementInvalidReason: 'TerrainBlocked',
        movementInvalidDetails: blockedReason,
      });
    },
  );

  it.each<['rail' | 'maglev', string]>([
    ['rail', 'Rail movement requires rail terrain'],
    ['maglev', 'Maglev movement requires rail terrain'],
  ])(
    'marks %s destinations blocked until the map has rail terrain',
    (movementMode, blockedReason) => {
      const grid = createHexGrid({ radius: 3 });
      const unit = makeUnitAtOrigin();

      const result = deriveReachableHexes(unit, MovementType.Walk, grid, {
        walkMP: 3,
        runMP: 5,
        jumpMP: 0,
        movementMode,
      }).find((r) => r.hex.q === 1 && r.hex.r === 0);

      expect(result).toMatchObject({
        movementMode,
        reachable: false,
        blockedReason,
        movementInvalidReason: 'TerrainBlocked',
        movementInvalidDetails: blockedReason,
      });
    },
  );

  it('expands the reachable envelope when switching Walk → Run', () => {
    const grid = createHexGrid({ radius: 8 });
    const unit = makeUnitAtOrigin();
    const cap: IMovementCapability = { walkMP: 5, runMP: 8, jumpMP: 0 };

    const walk = deriveReachableHexes(unit, MovementType.Walk, grid, cap);
    const run = deriveReachableHexes(unit, MovementType.Run, grid, cap);

    // Run covers strictly more ground than Walk on an open grid.
    expect(run.length).toBeGreaterThan(walk.length);
  });

  it('derives TacOps Evade reach from the run MP envelope', () => {
    const grid = createHexGrid({ radius: 8 });
    const unit = makeUnitAtOrigin();
    const cap: IMovementCapability = { walkMP: 5, runMP: 8, jumpMP: 0 };

    const run = deriveReachableHexes(unit, MovementType.Run, grid, cap);
    const evade = deriveReachableHexes(unit, MovementType.Evade, grid, cap);

    expect(evade.length).toBe(run.length);
    expect(
      evade.every((entry) => entry.movementType === MovementType.Evade),
    ).toBe(true);
    expect(evade.map((entry) => entry.mpCost)).toEqual(
      run.map((entry) => entry.mpCost),
    );
  });

  it('derives TacOps Sprint reach from the sprint MP envelope using run terrain costs', () => {
    const grid = createHexGrid({ radius: 10 });
    const unit = makeUnitAtOrigin();
    const cap: IMovementCapability = { walkMP: 5, runMP: 8, jumpMP: 0 };

    const run = deriveReachableHexes(unit, MovementType.Run, grid, cap);
    const sprint = deriveReachableHexes(unit, MovementType.Sprint, grid, cap);

    expect(sprint.length).toBeGreaterThan(run.length);
    expect(
      sprint.every((entry) => entry.movementType === MovementType.Sprint),
    ).toBe(true);
    expect(sprint.every((entry) => entry.mpCost <= 10)).toBe(true);
    expect(sprint.some((entry) => entry.mpCost > 8)).toBe(true);
  });

  it('uses heat-penalized MP for movement overlays', () => {
    const grid = createHexGrid({ radius: 5 });
    const unit = { ...makeUnitAtOrigin(), heat: 10 };
    const cap: IMovementCapability = { walkMP: 5, runMP: 8, jumpMP: 0 };

    const result = deriveReachableHexes(unit, MovementType.Walk, grid, cap);

    expect(result.some((entry) => entry.hex.q === 3 && entry.hex.r === 0)).toBe(
      true,
    );
    expect(result.some((entry) => entry.hex.q === 4 && entry.hex.r === 0)).toBe(
      false,
    );
  });

  it('marks occupied landing and destination hexes blocked', () => {
    let grid = createHexGrid({ radius: 4 });
    grid = setOccupant(grid, { q: 1, r: 0 }, 'enemy-1');
    const unit = makeUnitAtOrigin();
    const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 3 };

    const walk = deriveReachableHexes(unit, MovementType.Walk, grid, cap).find(
      (r) => r.hex.q === 1 && r.hex.r === 0,
    );
    const jump = deriveReachableHexes(unit, MovementType.Jump, grid, cap).find(
      (r) => r.hex.q === 1 && r.hex.r === 0,
    );

    expect(walk).toMatchObject({
      reachable: false,
      heatGenerated: 0,
      blockedReason: 'Destination hex is occupied',
      movementInvalidReason: 'DestinationOccupied',
      movementInvalidDetails: 'Destination hex is occupied',
    });
    expect(jump).toMatchObject({
      reachable: false,
      heatGenerated: 0,
      blockedReason: 'Destination hex is occupied',
      movementInvalidReason: 'DestinationOccupied',
      movementInvalidDetails: 'Destination hex is occupied',
    });
  });

  it('marks follow-up movement from another unit occupied start hex blocked', () => {
    let grid = createHexGrid({ radius: 4 });
    grid = setOccupant(grid, { q: 0, r: 0 }, 'enemy-1');
    const unit = makeUnitAtOrigin();
    const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 3 };

    const walk = deriveReachableHexes(unit, MovementType.Walk, grid, cap).find(
      (r) => r.hex.q === 1 && r.hex.r === 0,
    );

    expect(walk).toMatchObject({
      reachable: false,
      heatGenerated: 0,
      blockedReason:
        'Unit cannot make follow-up movement from a start hex occupied by another unit',
      movementInvalidReason: 'InvalidDestination',
      movementInvalidDetails:
        'Unit cannot make follow-up movement from a start hex occupied by another unit',
    });
  });

  it('marks shutdown units immobile in movement projection', () => {
    const grid = createHexGrid({ radius: 4 });
    const unit = { ...makeUnitAtOrigin(), shutdown: true };
    const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 3 };

    const walk = deriveReachableHexes(unit, MovementType.Walk, grid, cap).find(
      (r) => r.hex.q === 1 && r.hex.r === 0,
    );
    const jump = deriveReachableHexes(unit, MovementType.Jump, grid, cap).find(
      (r) => r.hex.q === 1 && r.hex.r === 0,
    );

    expect(walk).toMatchObject({
      reachable: false,
      mpCost: 0,
      heatGenerated: 0,
      blockedReason: 'Unit is shut down and cannot move',
      movementInvalidReason: 'UnitImmobile',
      movementInvalidDetails: 'Unit is shut down and cannot move',
    });
    expect(jump).toMatchObject({
      reachable: false,
      mpCost: 0,
      heatGenerated: 0,
      movementInvalidReason: 'UnitImmobile',
      movementInvalidDetails: 'Unit is shut down and cannot move',
    });
  });

  it('jump reach is a flat hex-distance gate on clear paths', () => {
    const grid = createHexGrid({ radius: 5 });
    const unit = makeUnitAtOrigin();
    const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 3 };

    const jump = deriveReachableHexes(unit, MovementType.Jump, grid, cap);

    // All returned hexes are within jump distance 3 and are marked Jump.
    for (const entry of jump) {
      expect(entry.movementType).toBe(MovementType.Jump);
      expect(entry.mpCost).toBeLessThanOrEqual(3);
      expect(entry.terrainCost).toBe(0);
      expect(entry.elevationCost).toBe(0);
      expect(entry.heatGenerated).toBeGreaterThanOrEqual(3);
    }

    // Origin hex is excluded.
    const origin = jump.find((r) => r.hex.q === 0 && r.hex.r === 0);
    expect(origin).toBeUndefined();

    // A hex at distance 3 (e.g., q=3, r=0) is reachable.
    const far = jump.find((r) => r.hex.q === 3 && r.hex.r === 0);
    expect(far).toBeDefined();
    expect(far?.mpCost).toBe(3);
    expect(far?.heatGenerated).toBe(3);
  });

  it('caps jump landing rise by jump MP while allowing equal rises and drops', () => {
    let grid = createHexGrid({ radius: 5 });
    grid = setHex(grid, { q: 1, r: 0 }, TerrainType.Clear, 3);
    grid = setHex(grid, { q: 0, r: 2 }, TerrainType.Clear, 2);
    grid = setHex(grid, { q: -2, r: 0 }, TerrainType.Clear, -5);
    const unit = makeUnitAtOrigin();
    const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 2 };

    const jump = deriveReachableHexes(unit, MovementType.Jump, grid, cap);
    const tooHigh = jump.find((r) => r.hex.q === 1 && r.hex.r === 0);
    const equalRise = jump.find((r) => r.hex.q === 0 && r.hex.r === 2);
    const drop = jump.find((r) => r.hex.q === -2 && r.hex.r === 0);

    expect(tooHigh).toMatchObject({
      mpCost: 1,
      elevationDelta: 3,
      elevationCost: 0,
      terrainCost: 0,
      heatGenerated: 0,
      reachable: false,
      movementType: MovementType.Jump,
      blockedReason: 'Jump elevation rise of 3 exceeds jump MP 2',
      movementInvalidReason: 'TerrainBlocked',
      movementInvalidDetails: 'Jump elevation rise of 3 exceeds jump MP 2',
    });
    expect(equalRise).toMatchObject({
      mpCost: 2,
      elevationDelta: 2,
      elevationCost: 0,
      terrainCost: 0,
      heatGenerated: 3,
      reachable: true,
      movementType: MovementType.Jump,
    });
    expect(drop).toMatchObject({
      mpCost: 2,
      elevationDelta: -5,
      elevationCost: 0,
      terrainCost: 0,
      heatGenerated: 3,
      reachable: true,
      movementType: MovementType.Jump,
    });
  });

  it('blocks jump paths that cannot clear intervening represented terrain height', () => {
    let grid = createHexGrid({ radius: 5 });
    grid = setHex(
      grid,
      { q: 1, r: 0 },
      terrainStringFromFeatures([{ type: TerrainType.Building, level: 4 }]),
      0,
    );
    grid = setHex(grid, { q: 3, r: 0 }, TerrainType.Clear, 0);
    const unit = makeUnitAtOrigin();
    const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 3 };

    const jump = deriveReachableHexes(unit, MovementType.Jump, grid, cap);
    const blockedLanding = jump.find((r) => r.hex.q === 3 && r.hex.r === 0);

    expect(blockedLanding).toMatchObject({
      mpCost: 3,
      elevationDelta: 0,
      elevationCost: 0,
      terrainCost: 0,
      heatGenerated: 0,
      reachable: false,
      movementType: MovementType.Jump,
      blockedReason: 'Jump path height +4 at (1,0) exceeds jump clearance +3',
      movementInvalidReason: 'TerrainBlocked',
      movementInvalidDetails:
        'Jump path height +4 at (1,0) exceeds jump clearance +3',
    });
  });

  it('jump returns empty when unit has zero jumpMP', () => {
    const grid = createHexGrid({ radius: 5 });
    const unit = makeUnitAtOrigin();
    const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 0 };

    const jump = deriveReachableHexes(unit, MovementType.Jump, grid, cap);

    expect(jump).toEqual([]);
  });

  it('marks off-map jump landings with the engine out-of-bounds reason', () => {
    const grid = createHexGrid({ radius: 1 });
    const unit = makeUnitAtOrigin();
    const cap: IMovementCapability = { walkMP: 2, runMP: 3, jumpMP: 2 };

    const jump = deriveReachableHexes(unit, MovementType.Jump, grid, cap);
    const offMap = jump.find((r) => r.hex.q === 2 && r.hex.r === 0);

    expect(offMap).toMatchObject({
      reachable: false,
      heatGenerated: 0,
      movementType: MovementType.Jump,
      blockedReason: 'Destination is outside map bounds',
      movementInvalidReason: 'DestinationOutOfBounds',
      movementInvalidDetails: 'Destination is outside map bounds',
    });
  });

  it('returned hexes are sorted by ascending mpCost', () => {
    const grid = createHexGrid({ radius: 6 });
    const unit = makeUnitAtOrigin();
    const cap: IMovementCapability = { walkMP: 5, runMP: 8, jumpMP: 0 };

    const result = deriveReachableHexes(unit, MovementType.Walk, grid, cap);

    for (let i = 1; i < result.length; i++) {
      expect(result[i].mpCost).toBeGreaterThanOrEqual(result[i - 1].mpCost);
    }
  });
});

describe('deriveMovementRangeHexForDestination', () => {
  it('projects an on-map destination beyond MP with an engine-aligned insufficient-MP reason', () => {
    const grid = createHexGrid({ radius: 5 });
    const unit = makeUnitAtOrigin();
    const cap: IMovementCapability = { walkMP: 2, runMP: 3, jumpMP: 0 };

    const projected = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      cap,
      { q: 4, r: 0 },
    );

    expect(projected).toMatchObject({
      hex: { q: 4, r: 0 },
      mpCost: 4,
      reachable: false,
      movementType: MovementType.Walk,
      movementMode: 'walk',
      blockedReason: 'Destination is 4 hexes away, but max range for walk is 2',
      movementInvalidReason: 'InsufficientMP',
      movementInvalidDetails:
        'Destination is 4 hexes away, but max range for walk is 2',
    });
  });

  it('projects a passable path that exceeds MP with terrain and elevation costs', () => {
    let grid = createHexGrid({ radius: 5 });
    grid = setHex(grid, { q: 1, r: 0 }, TerrainType.Clear, 0);
    grid = setHex(grid, { q: 2, r: 0 }, TerrainType.Clear, 0);
    grid = setHex(grid, { q: 3, r: 0 }, TerrainType.Clear, 2);
    const unit = makeUnitAtOrigin();
    const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 0 };

    const projected = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      cap,
      { q: 3, r: 0 },
    );

    expect(projected).toMatchObject({
      hex: { q: 3, r: 0 },
      mpCost: 5,
      terrainCost: 0,
      elevationDelta: 2,
      elevationCost: 2,
      reachable: false,
      movementType: MovementType.Walk,
      movementMode: 'walk',
      blockedReason: 'Path costs 5 MP, but only 4 MP is available',
      movementInvalidReason: 'InsufficientMP',
      movementInvalidDetails: 'Path costs 5 MP, but only 4 MP is available',
    });
  });

  // Audit 2026-06-09 C-2: jump MP is heat-immune (MegaMek Mek.getJumpMP has
  // no heat term) — this test previously pinned the wrong pre-fix behavior
  // where heat 25 (penalty 5) zeroed a jump-2 capability.
  it('projects a reachable jump destination because jump MP is heat-immune', () => {
    const grid = createHexGrid({ radius: 5 });
    const unit = { ...makeUnitAtOrigin(), heat: 25 };
    const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 2 };

    const projected = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Jump,
      grid,
      cap,
      { q: 1, r: 0 },
    );

    expect(projected).toMatchObject({
      hex: { q: 1, r: 0 },
      mpCost: 1,
      heatGenerated: 3,
      reachable: true,
      movementType: MovementType.Jump,
      movementMode: 'jump',
    });
  });

  it('projects no-jump-jets hover destinations with the commit validator reason', () => {
    const grid = createHexGrid({ radius: 5 });
    const unit = makeUnitAtOrigin();
    const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 0 };

    const projected = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Jump,
      grid,
      cap,
      { q: 1, r: 0 },
    );

    expect(projected).toMatchObject({
      hex: { q: 1, r: 0 },
      mpCost: 0,
      terrainCost: 0,
      elevationCost: 0,
      heatGenerated: 0,
      reachable: false,
      movementType: MovementType.Jump,
      movementMode: 'jump',
      blockedReason: 'Unit cannot jump (no jump jets)',
      movementInvalidReason: 'JumpUnavailable',
      movementInvalidDetails: 'Unit cannot jump (no jump jets)',
    });
  });

  it('projects non-Mek walk-like units without Mek movement heat', () => {
    const grid = createHexGrid({ radius: 5 });
    const unit = makeUnitAtOrigin();
    const cap: IMovementCapability = {
      walkMP: 3,
      runMP: 3,
      jumpMP: 3,
      movementMode: 'walk',
      movementHeatProfile: 'none',
    };

    const walkProjection = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      cap,
      { q: 1, r: 0 },
    );
    const jumpProjection = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Jump,
      grid,
      cap,
      { q: 1, r: 0 },
    );

    expect(walkProjection).toMatchObject({
      movementType: MovementType.Walk,
      movementMode: 'walk',
      reachable: true,
      heatGenerated: 0,
    });
    expect(jumpProjection).toMatchObject({
      movementType: MovementType.Jump,
      movementMode: 'jump',
      reachable: true,
      heatGenerated: 0,
    });
  });

  it('projects AirMek walk and run heat from used movement points', () => {
    const grid = createHexGrid({ radius: 6 });
    const unit = makeUnitAtOrigin();
    const cap: IMovementCapability = {
      walkMP: 6,
      runMP: 9,
      jumpMP: 2,
      movementMode: 'wige',
      movementHeatProfile: 'airmek',
    };

    const walkProjection = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      cap,
      { q: 6, r: 0 },
    );
    const runProjection = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Run,
      grid,
      cap,
      { q: 6, r: 0 },
    );

    expect(walkProjection).toMatchObject({
      movementType: MovementType.Walk,
      movementMode: 'wige',
      reachable: true,
      mpCost: 6,
      heatGenerated: 2,
    });
    expect(runProjection).toMatchObject({
      movementType: MovementType.Run,
      movementMode: 'wige',
      reachable: true,
      mpCost: 6,
      heatGenerated: 2,
    });
  });

  it('uses infantry terrain profile for woods and elevation costs', () => {
    let grid = createHexGrid({ radius: 5 });
    grid = setHex(grid, { q: 1, r: 0 }, TerrainType.LightWoods, 0);
    grid = setHex(grid, { q: 0, r: 1 }, TerrainType.Clear, 1);
    const unit = makeUnitAtOrigin();
    const cap: IMovementCapability = {
      walkMP: 1,
      runMP: 1,
      jumpMP: 0,
      movementMode: 'walk',
      movementTerrainProfile: 'infantry',
    };

    const woodsProjection = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      cap,
      { q: 1, r: 0 },
    );
    const elevationProjection = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      cap,
      { q: 0, r: 1 },
    );

    expect(woodsProjection).toMatchObject({
      reachable: true,
      mpCost: 1,
      terrainCost: 0,
      elevationCost: 0,
      movementMode: 'walk',
    });
    expect(elevationProjection).toMatchObject({
      reachable: false,
      mpCost: 3,
      terrainCost: 0,
      elevationDelta: 1,
      elevationCost: 2,
      movementInvalidReason: 'InsufficientMP',
    });
  });
});

// Audit 2026-06-09 findings B-3 / B-4: the reachability projection is the
// canonical movement authority. These tests pin (1) the Partial Wing
// jump-heat bonus flowing through projection AND commit, (2) validateMovement
// agreeing with the projection on motive-mode costs, and (3) the commit path
// surfacing validator disagreement instead of silently resolving to the more
// permissive side.
describe('movement heat and validator agreement (audit B-3/B-4)', () => {
  it('includes the Partial Wing bonus in projection and commit jump heat', () => {
    const grid = createHexGrid({ radius: 7 });
    const unit = makeUnitAtOrigin();
    const capability: IMovementCapability = {
      walkMP: 4,
      runMP: 6,
      jumpMP: 6,
      partialWingJumpBonus: 2,
    };

    // 6 jump hexes − wing bonus 2 → 4 heat (MegaMek Mek#getJumpHeat).
    const projection = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Jump,
      grid,
      capability,
      { q: 0, r: -6 },
    );
    expect(projection).toMatchObject({
      reachable: true,
      heatGenerated: 4,
    });

    const commit = validateCommittedMovement({
      grid,
      unit,
      to: { q: 0, r: -6 },
      facing: Facing.North,
      movementType: MovementType.Jump,
      capability,
    });
    expect(commit).toMatchObject({
      valid: true,
      heatGenerated: 4,
    });
  });

  it('keeps validateMovement in agreement with the projection for motive-mode capabilities', () => {
    let grid = createHexGrid({ radius: 3 });
    grid = setHex(grid, { q: 0, r: -1 }, TerrainType.Water);
    const unit = makeUnitAtOrigin();
    const capability: IMovementCapability = {
      walkMP: 1,
      runMP: 2,
      jumpMP: 0,
      movementMode: 'hover',
    };

    // Hover pays no water-depth surcharge: the projection reaches the
    // depth-1 water hex for 1 MP with no movement heat.
    const projection = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      capability,
      { q: 0, r: -1 },
    );
    expect(projection).toMatchObject({
      reachable: true,
      mpCost: 1,
      heatGenerated: 0,
    });

    // validateMovement must path with the same motive mode and land on the
    // same MP cost + heat instead of charging Mek ground costs.
    const validation = validateMovement(
      grid,
      {
        unitId: unit.id,
        coord: unit.position,
        facing: unit.facing,
        prone: false,
      },
      { q: 0, r: -1 },
      Facing.North,
      MovementType.Walk,
      capability,
    );
    expect(validation.valid).toBe(true);
    expect(validation.mpCost).toBe(projection?.mpCost);
    expect(validation.heatGenerated).toBe(projection?.heatGenerated);
  });

  it('projects represented low-light Nightwalker movement relief and run prohibition', () => {
    const grid = createHexGrid({ radius: 3 });
    const target = { q: 0, r: -1 };
    const night = createEnvironmentalConditions({ light: 'night' });
    const unit = makeUnitAtOrigin();
    const nightwalker = { ...unit, abilities: ['tm_nightwalker'] };
    const capability: IMovementCapability = { walkMP: 1, runMP: 2, jumpMP: 0 };

    const blockedWalk = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      capability,
      target,
      'normal',
      { environmentalConditions: night },
    );
    const allowedNightwalkerWalk = deriveMovementRangeHexForDestination(
      nightwalker,
      MovementType.Walk,
      grid,
      capability,
      target,
      'normal',
      { environmentalConditions: night },
    );
    const blockedNightwalkerRun = deriveMovementRangeHexForDestination(
      nightwalker,
      MovementType.Run,
      grid,
      capability,
      target,
      'normal',
      { environmentalConditions: night },
    );

    expect(blockedWalk).toMatchObject({
      reachable: false,
      mpCost: 3,
      movementInvalidReason: 'InsufficientMP',
    });
    expect(allowedNightwalkerWalk).toMatchObject({
      reachable: true,
      mpCost: 1,
      movementType: MovementType.Walk,
    });
    expect(blockedNightwalkerRun).toMatchObject({
      reachable: false,
      movementInvalidReason: 'TerrainBlocked',
      movementInvalidDetails: expect.stringContaining(
        'Nightwalker prohibits running',
      ),
    });

    const commit = validateCommittedMovement({
      grid,
      unit: nightwalker,
      to: target,
      facing: Facing.North,
      movementType: MovementType.Run,
      capability,
      environmentalConditions: night,
    });
    expect(commit).toMatchObject({
      valid: false,
      reason: 'TerrainBlocked',
      details: expect.stringContaining('Nightwalker prohibits running'),
    });
  });

  it.each<{ readonly light: LightCondition; readonly blockedCost: number }>([
    { light: 'full_moon', blockedCost: 2 },
    { light: 'glare', blockedCost: 2 },
    { light: 'moonless', blockedCost: 3 },
    { light: 'solar_flare', blockedCost: 3 },
    { light: 'pitch_black', blockedCost: 4 },
  ])(
    'projects MegaMek $light Nightwalker movement relief and run prohibition',
    ({ light, blockedCost }) => {
      const grid = createHexGrid({ radius: 3 });
      const target = { q: 0, r: -1 };
      const conditions = createEnvironmentalConditions({ light });
      const unit = makeUnitAtOrigin();
      const nightwalker = { ...unit, abilities: ['tm_nightwalker'] };
      const capability: IMovementCapability = {
        walkMP: 1,
        runMP: 2,
        jumpMP: 0,
      };

      const blockedWalk = deriveMovementRangeHexForDestination(
        unit,
        MovementType.Walk,
        grid,
        capability,
        target,
        'normal',
        { environmentalConditions: conditions },
      );
      const allowedNightwalkerWalk = deriveMovementRangeHexForDestination(
        nightwalker,
        MovementType.Walk,
        grid,
        capability,
        target,
        'normal',
        { environmentalConditions: conditions },
      );
      const blockedNightwalkerRun = deriveMovementRangeHexForDestination(
        nightwalker,
        MovementType.Run,
        grid,
        capability,
        target,
        'normal',
        { environmentalConditions: conditions },
      );

      expect(blockedWalk).toMatchObject({
        reachable: false,
        mpCost: blockedCost,
        movementInvalidReason: 'InsufficientMP',
      });
      expect(allowedNightwalkerWalk).toMatchObject({
        reachable: true,
        mpCost: 1,
        movementType: MovementType.Walk,
      });
      expect(blockedNightwalkerRun).toMatchObject({
        reachable: false,
        movementInvalidReason: 'TerrainBlocked',
        movementInvalidDetails: expect.stringContaining(
          'Nightwalker prohibits running',
        ),
      });
    },
  );

  it('keeps airborne LAM AirMek Nightwalker out of low-light ground projection', () => {
    const grid = createHexGrid({ radius: 3 });
    const target = { q: 0, r: -1 };
    const night = createEnvironmentalConditions({ light: 'night' });
    const airborneNightwalker = {
      ...makeUnitAtOrigin(),
      abilities: ['tm_nightwalker'],
      conversionMode: 'airmek' as const,
      combatState: {
        kind: 'aero' as const,
        state: createAerospaceCombatState({
          maxSI: 3,
          armorByArc: { nose: 1, leftWing: 1, rightWing: 1, aft: 1 },
          heatSinks: 10,
          fuelPoints: 20,
          safeThrust: 5,
          maxThrust: 8,
          altitude: 1,
          currentVelocity: 2,
          nextVelocity: 2,
          airborneState: 'airborne',
        }),
      },
    };
    const capability: IMovementCapability = {
      walkMP: 4,
      runMP: 6,
      jumpMP: 2,
      movementMode: 'walk',
      unitHeight: 1,
      unitHeightProfile: { kind: 'lam', standingHeight: 1 },
    };

    const projection = deriveMovementRangeHexForDestination(
      airborneNightwalker,
      MovementType.Walk,
      grid,
      capability,
      target,
      'normal',
      { environmentalConditions: night },
    );

    expect(projection).toMatchObject({
      reachable: false,
      blockedReason: AIRBORNE_LAM_AIRMEK_GROUND_MOVEMENT_BLOCKED_REASON,
      movementInvalidDetails:
        AIRBORNE_LAM_AIRMEK_GROUND_MOVEMENT_BLOCKED_REASON,
    });

    const commit = validateCommittedMovement({
      grid,
      unit: airborneNightwalker,
      to: target,
      facing: Facing.North,
      movementType: MovementType.Walk,
      capability,
      environmentalConditions: night,
    });
    expect(commit).toMatchObject({
      valid: false,
      reason: 'InvalidDestination',
      details: AIRBORNE_LAM_AIRMEK_GROUND_MOVEMENT_BLOCKED_REASON,
    });
  });

  it('surfaces validateMovement disagreement instead of silently committing the permissive side', () => {
    const grid = createHexGrid({ radius: 3 });
    const unit = makeUnitAtOrigin(); // facing North
    const capability: IMovementCapability = { walkMP: 1, runMP: 2, jumpMP: 0 };

    // The projection (canonical) reaches the adjacent hex for 1 MP; it does
    // not model facing. validateMovement additionally charges 3 turning MP
    // for the 180° facing change and rejects. The commit must stay
    // projection-authoritative but cannot stay silent about the split.
    const projection = deriveMovementRangeHexForDestination(
      unit,
      MovementType.Walk,
      grid,
      capability,
      { q: 0, r: -1 },
    );
    expect(projection).toMatchObject({ reachable: true, mpCost: 1 });

    const commit = validateCommittedMovement({
      grid,
      unit,
      to: { q: 0, r: -1 },
      facing: Facing.South,
      movementType: MovementType.Walk,
      capability,
    });
    if (!commit.valid) {
      throw new Error('expected projection-backed commit to stay valid');
    }
    expect(commit.mpCost).toBe(1);
    expect(commit.validatorDisagreement).toBeDefined();
    expect(commit.validatorDisagreement).toContain('max range');
  });

  it('reports no validator disagreement when both validators accept', () => {
    const grid = createHexGrid({ radius: 3 });
    const unit = makeUnitAtOrigin();
    const capability: IMovementCapability = { walkMP: 1, runMP: 2, jumpMP: 0 };

    const commit = validateCommittedMovement({
      grid,
      unit,
      to: { q: 0, r: -1 },
      facing: Facing.North,
      movementType: MovementType.Walk,
      capability,
    });
    if (!commit.valid) {
      throw new Error('expected commit to be valid');
    }
    expect(commit.validatorDisagreement).toBeUndefined();
  });
});
