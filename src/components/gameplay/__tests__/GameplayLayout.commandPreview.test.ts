import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import {
  Facing,
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  MovementType,
  RangeBracket,
  TerrainType,
  TokenUnitType,
  type IGameState,
  type IGameUnit,
  type IHexCoordinate,
  type IHexGrid,
  type IMovementRangeHex,
  type IUnitGameState,
  type IUnitToken,
  type IWeaponStatus,
} from '@/types/gameplay';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { coordToKey } from '@/utils/gameplay/hexMath';
import { terrainStringFromFeatures } from '@/utils/gameplay/terrainEncoding';

import { buildCommandPreviewInputs } from '../GameplayLayout.commandPreview';

function makeUnitState({
  id,
  side,
  position,
}: {
  readonly id: string;
  readonly side: GameSide;
  readonly position: IHexCoordinate;
}): IUnitGameState {
  return {
    id,
    side,
    position,
    facing: Facing.Southeast,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    gunnery: 4,
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

function makeState(overrides: Partial<IGameState> = {}): IGameState {
  return {
    gameId: 'game-1',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.WeaponAttack,
    activationIndex: 0,
    units: {
      a1: makeUnitState({
        id: 'a1',
        side: GameSide.Player,
        position: { q: 0, r: 0 },
      }),
      t1: makeUnitState({
        id: 't1',
        side: GameSide.Opponent,
        position: { q: 2, r: 0 },
      }),
    },
    turnEvents: [],
    ...overrides,
  };
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

function makeUnitBinding(overrides: Partial<IGameUnit> = {}): IGameUnit {
  return {
    id: 'a1',
    name: 'Attacker',
    side: GameSide.Player,
    unitRef: 'attacker-ref',
    pilotRef: 'pilot-a',
    gunnery: 4,
    piloting: 5,
    ...overrides,
  } as IGameUnit;
}

function makeWeapon(overrides: Partial<IWeaponStatus> = {}): IWeaponStatus {
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

function gridWithTerrain(
  coord: IHexCoordinate,
  terrain: string,
  radius = 3,
): IHexGrid {
  const grid = createMinimalGrid(radius);
  const key = coordToKey(coord);
  const hex = grid.hexes.get(key);
  if (!hex) {
    throw new Error(`test grid missing hex ${key}`);
  }
  return {
    ...grid,
    hexes: new Map(grid.hexes).set(key, { ...hex, terrain }),
  };
}

describe('buildCommandPreviewInputs', () => {
  it('bridges the selected attacker and target into shared combat projection data', () => {
    const grid = createMinimalGrid(3);
    const attacker = makeToken({
      unitId: 'a1',
      isSelected: true,
      position: { q: 0, r: 0 },
      facing: Facing.Southeast,
    });
    const target = makeToken({
      unitId: 't1',
      side: GameSide.Opponent,
      isValidTarget: true,
      position: { q: 2, r: 0 },
      facing: Facing.North,
    });
    const weapon = makeWeapon();

    const inputs = buildCommandPreviewInputs({
      currentState: makeState(),
      selectedUnitId: 'a1',
      activeTargetId: 't1',
      tokens: [attacker, target],
      unitBindings: [],
      mapRadius: 3,
      grid,
      unitWeapons: { a1: [weapon] },
      hitChance: 72,
    });

    expect(inputs.weaponStatuses).toEqual([weapon]);
    expect(inputs.hitChance).toBe(72);
    expect(inputs.combatInfo).toMatchObject({
      hex: { q: 2, r: 0 },
      targetUnitIds: ['t1'],
      validTargetUnitIds: ['t1'],
      weaponIdsAvailable: ['medium-laser'],
      rangeBracket: RangeBracket.Short,
    });
    expect(inputs.combatInfoByTargetId?.t1).toBe(inputs.combatInfo);
    expect(inputs.combatInfo?.toHitNumber).toBe(4);
  });

  it('keeps all weapon statuses while projecting only selected weapons', () => {
    const grid = createMinimalGrid(3);
    const attacker = makeToken({
      unitId: 'a1',
      isSelected: true,
      position: { q: 0, r: 0 },
      facing: Facing.Southeast,
    });
    const target = makeToken({
      unitId: 't1',
      side: GameSide.Opponent,
      isValidTarget: true,
      position: { q: 2, r: 0 },
      facing: Facing.North,
    });
    const shortWeapon = makeWeapon({
      id: 'small-laser',
      ranges: { short: 1, medium: 1, long: 1 },
    });
    const longWeapon = makeWeapon({
      id: 'medium-laser',
      ranges: { short: 2, medium: 4, long: 6 },
    });

    const inputs = buildCommandPreviewInputs({
      currentState: makeState(),
      selectedUnitId: 'a1',
      activeTargetId: 't1',
      tokens: [attacker, target],
      unitBindings: [],
      mapRadius: 3,
      grid,
      unitWeapons: { a1: [shortWeapon, longWeapon] },
      selectedWeaponIds: ['small-laser'],
      hitChance: 72,
    });

    expect(inputs.weaponStatuses).toEqual([shortWeapon, longWeapon]);
    expect(inputs.combatInfo).toMatchObject({
      hex: { q: 2, r: 0 },
      targetUnitIds: ['t1'],
      validTargetUnitIds: [],
      weaponIdsAvailable: [],
      rangeBracket: RangeBracket.OutOfRange,
    });
    expect(
      inputs.combatInfo?.weaponRangeOptions.map((option) => option.weaponId),
    ).toEqual(['small-laser']);
  });

  it('uses the active target instead of the first unit stacked on a combat hex', () => {
    const baseGrid = createMinimalGrid(3);
    const hexes = new Map(baseGrid.hexes);
    const targetHex = hexes.get('2,0');
    expect(targetHex).toBeDefined();
    hexes.set('2,0', {
      ...targetHex!,
      terrain: terrainStringFromFeatures([
        { type: TerrainType.Water, level: 1 },
      ]),
    });
    const grid = { ...baseGrid, hexes };
    const attacker = makeToken({
      unitId: 'a1',
      isSelected: true,
      position: { q: 0, r: 0 },
      facing: Facing.Southeast,
    });
    const mechTarget = makeToken({
      unitId: 't1',
      side: GameSide.Opponent,
      isValidTarget: true,
      position: { q: 2, r: 0 },
      facing: Facing.North,
      unitType: TokenUnitType.Mech,
    });
    const vehicleTarget = makeToken({
      unitId: 'v1',
      side: GameSide.Opponent,
      isValidTarget: true,
      position: { q: 2, r: 0 },
      facing: Facing.North,
      unitType: TokenUnitType.Vehicle,
    });

    const inputs = buildCommandPreviewInputs({
      currentState: makeState({
        units: {
          a1: makeUnitState({
            id: 'a1',
            side: GameSide.Player,
            position: { q: 0, r: 0 },
          }),
          t1: makeUnitState({
            id: 't1',
            side: GameSide.Opponent,
            position: { q: 2, r: 0 },
          }),
          v1: makeUnitState({
            id: 'v1',
            side: GameSide.Opponent,
            position: { q: 2, r: 0 },
          }),
        },
      }),
      selectedUnitId: 'a1',
      activeTargetId: 'v1',
      tokens: [attacker, mechTarget, vehicleTarget],
      unitBindings: [],
      mapRadius: 3,
      grid,
      unitWeapons: { a1: [makeWeapon()] },
      hitChance: 72,
    });

    expect(inputs.combatInfo).toMatchObject({
      hex: { q: 2, r: 0 },
      targetUnitIds: ['t1', 'v1'],
      validTargetUnitIds: ['v1'],
      targetPartialCover: false,
      targetCoverModifier: 0,
      toHitNumber: 4,
    });
    expect(inputs.combatInfo?.targetCoverReason).toBeUndefined();
    expect(inputs.combatInfo?.toHitModifiers).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Partial Cover' }),
      ]),
    );
    expect(inputs.combatInfoByTargetId?.t1).toBe(inputs.combatInfo);
    expect(inputs.combatInfoByTargetId?.v1).toBe(inputs.combatInfo);
  });

  it('bridges a hovered target hex into shared combat projection data before target lock', () => {
    const grid = createMinimalGrid(3);
    const attacker = makeToken({
      unitId: 'a1',
      isSelected: true,
      position: { q: 0, r: 0 },
      facing: Facing.Southeast,
    });
    const target = makeToken({
      unitId: 't1',
      side: GameSide.Opponent,
      isValidTarget: true,
      position: { q: 2, r: 0 },
      facing: Facing.North,
    });
    const weapon = makeWeapon();

    const inputs = buildCommandPreviewInputs({
      currentState: makeState(),
      selectedUnitId: 'a1',
      activeTargetId: null,
      hoveredHex: { q: 2, r: 0 },
      tokens: [attacker, target],
      unitBindings: [],
      mapRadius: 3,
      grid,
      unitWeapons: { a1: [weapon] },
      hitChance: null,
    });

    expect(inputs.combatInfo).toMatchObject({
      hex: { q: 2, r: 0 },
      targetUnitIds: ['t1'],
      validTargetUnitIds: ['t1'],
      weaponIdsAvailable: ['medium-laser'],
      rangeBracket: RangeBracket.Short,
    });
    expect(inputs.combatInfo?.toHitNumber).toBe(4);
  });

  it('keeps lightweight preview inputs when combat projection is not applicable', () => {
    const weapon = makeWeapon();

    const inputs = buildCommandPreviewInputs({
      currentState: makeState({ phase: GamePhase.Movement }),
      selectedUnitId: 'a1',
      activeTargetId: 't1',
      tokens: [],
      unitBindings: [],
      mapRadius: 3,
      grid: createMinimalGrid(3),
      unitWeapons: { a1: [weapon] },
      hitChance: 55,
    });

    expect(inputs).toEqual({
      weaponStatuses: [weapon],
      hitChance: 55,
    });
  });

  it('bridges the selected physical target and attack type into the shared physical projection', () => {
    const currentState = makeState({
      phase: GamePhase.PhysicalAttack,
      units: {
        a1: makeUnitState({
          id: 'a1',
          side: GameSide.Player,
          position: { q: 0, r: 0 },
        }),
        t1: makeUnitState({
          id: 't1',
          side: GameSide.Opponent,
          position: { q: 1, r: 0 },
        }),
      },
    });

    const inputs = buildCommandPreviewInputs({
      currentState,
      selectedUnitId: 'a1',
      activeTargetId: null,
      tokens: [],
      unitBindings: [makeUnitBinding({ id: 'a1', piloting: 4 })],
      mapRadius: 3,
      grid: createMinimalGrid(3),
      unitWeapons: {},
      hitChance: null,
      physicalAttackTargetId: 't1',
      physicalAttackType: 'punch',
      physicalAttackLimb: 'rightArm',
    });

    expect(inputs.combatInfo).toBeUndefined();
    expect(inputs.physicalTargetUnitId).toBe('t1');
    expect(inputs.physicalAttackType).toBe('punch');
    expect(inputs.physicalAttackLimb).toBe('rightArm');
    expect(inputs.physicalAttackOption).toMatchObject({
      attackType: 'punch',
      limb: 'rightArm',
      toHit: { allowed: true },
      restrictionsFailed: [],
    });
    expect(inputs.physicalAttackOption?.damage.targetDamage).toBeGreaterThan(0);
  });

  it('preserves restricted physical projection rows before commit', () => {
    const currentState = makeState({
      phase: GamePhase.PhysicalAttack,
      units: {
        a1: {
          ...makeUnitState({
            id: 'a1',
            side: GameSide.Player,
            position: { q: 0, r: 0 },
          }),
          movementThisTurn: MovementType.Stationary,
        },
        t1: makeUnitState({
          id: 't1',
          side: GameSide.Opponent,
          position: { q: 1, r: 0 },
        }),
      },
    });

    const inputs = buildCommandPreviewInputs({
      currentState,
      selectedUnitId: 'a1',
      activeTargetId: null,
      tokens: [],
      unitBindings: [makeUnitBinding()],
      mapRadius: 3,
      grid: createMinimalGrid(3),
      unitWeapons: {},
      hitChance: null,
      physicalAttackTargetId: 't1',
      physicalAttackType: 'charge',
    });

    expect(inputs.physicalAttackOption).toMatchObject({
      attackType: 'charge',
      restrictionsFailed: ['NoRunThisTurn'],
    });
    expect(inputs.physicalAttackOption?.toHit.allowed).toBe(false);
  });

  it('threads attacker movement mode into charge command previews', () => {
    const currentState = makeState({
      phase: GamePhase.PhysicalAttack,
      units: {
        a1: {
          ...makeUnitState({
            id: 'a1',
            side: GameSide.Player,
            position: { q: 0, r: 0 },
          }),
          movementThisTurn: MovementType.Run,
        },
        t1: makeUnitState({
          id: 't1',
          side: GameSide.Opponent,
          position: { q: 1, r: 0 },
        }),
      },
    });

    const inputs = buildCommandPreviewInputs({
      currentState,
      selectedUnitId: 'a1',
      activeTargetId: null,
      tokens: [],
      unitBindings: [
        makeUnitBinding({
          unitType: UnitType.VEHICLE,
          movementMode: 'wige',
        }),
      ],
      mapRadius: 3,
      grid: createMinimalGrid(3),
      unitWeapons: {},
      hitChance: null,
      physicalAttackTargetId: 't1',
      physicalAttackType: 'charge',
    });

    expect(inputs.physicalAttackOption).toMatchObject({
      attackType: 'charge',
      restrictionsFailed: ['AttackerCannotCharge'],
    });
    expect(inputs.physicalAttackOption?.toHit.allowed).toBe(false);
  });

  it('preserves physical elevation restrictions from the shared map grid', () => {
    const baseGrid = createMinimalGrid(3);
    const hexes = new Map(baseGrid.hexes);
    const targetHex = hexes.get('1,0');
    expect(targetHex).toBeDefined();
    hexes.set('1,0', { ...targetHex!, elevation: 2 });
    const grid = { ...baseGrid, hexes };
    const currentState = makeState({
      phase: GamePhase.PhysicalAttack,
      units: {
        a1: makeUnitState({
          id: 'a1',
          side: GameSide.Player,
          position: { q: 0, r: 0 },
        }),
        t1: makeUnitState({
          id: 't1',
          side: GameSide.Opponent,
          position: { q: 1, r: 0 },
        }),
      },
    });

    const inputs = buildCommandPreviewInputs({
      currentState,
      selectedUnitId: 'a1',
      activeTargetId: null,
      tokens: [],
      unitBindings: [makeUnitBinding()],
      mapRadius: 3,
      grid,
      unitWeapons: {},
      hitChance: null,
      physicalAttackTargetId: 't1',
      physicalAttackType: 'kick',
      physicalAttackLimb: 'rightLeg',
    });

    expect(inputs.physicalAttackOption).toMatchObject({
      attackType: 'kick',
      limb: 'rightLeg',
      restrictionsFailed: ['TargetElevationNotInRange'],
      toHit: {
        allowed: false,
        restrictionReason: 'Target elevation not in range',
        restrictionReasonCode: 'TargetElevationNotInRange',
      },
    });
  });

  it('preserves represented push target restrictions before commit', () => {
    const currentState = makeState({
      phase: GamePhase.PhysicalAttack,
      units: {
        a1: makeUnitState({
          id: 'a1',
          side: GameSide.Player,
          position: { q: 0, r: 0 },
        }),
        t1: makeUnitState({
          id: 't1',
          side: GameSide.Opponent,
          position: { q: 1, r: 0 },
        }),
      },
    });

    const inputs = buildCommandPreviewInputs({
      currentState,
      selectedUnitId: 'a1',
      activeTargetId: null,
      tokens: [],
      unitBindings: [
        makeUnitBinding({ id: 'a1', unitType: UnitType.BATTLEMECH }),
        makeUnitBinding({
          id: 't1',
          name: 'Target Vehicle',
          side: GameSide.Opponent,
          unitType: UnitType.VEHICLE,
        }),
      ],
      mapRadius: 3,
      grid: createMinimalGrid(3),
      unitWeapons: {},
      hitChance: null,
      physicalAttackTargetId: 't1',
      physicalAttackType: 'push',
    });

    expect(inputs.physicalAttackOption).toMatchObject({
      attackType: 'push',
      restrictionsFailed: ['TargetNotMek'],
      toHit: {
        allowed: false,
        restrictionReason: 'Target is not a mek',
        restrictionReasonCode: 'TargetNotMek',
      },
    });
  });

  it('preserves represented push arm-missing restrictions before commit', () => {
    const currentState = makeState({
      phase: GamePhase.PhysicalAttack,
      units: {
        a1: {
          ...makeUnitState({
            id: 'a1',
            side: GameSide.Player,
            position: { q: 0, r: 0 },
          }),
          destroyedLocations: ['left_arm'],
        },
        t1: makeUnitState({
          id: 't1',
          side: GameSide.Opponent,
          position: { q: 1, r: 0 },
        }),
      },
    });

    const inputs = buildCommandPreviewInputs({
      currentState,
      selectedUnitId: 'a1',
      activeTargetId: null,
      tokens: [],
      unitBindings: [
        makeUnitBinding({ id: 'a1', unitType: UnitType.BATTLEMECH }),
        makeUnitBinding({
          id: 't1',
          name: 'Target Mek',
          side: GameSide.Opponent,
          unitType: UnitType.BATTLEMECH,
        }),
      ],
      mapRadius: 3,
      grid: createMinimalGrid(3),
      unitWeapons: {},
      hitChance: null,
      physicalAttackTargetId: 't1',
      physicalAttackType: 'push',
    });

    expect(inputs.physicalAttackOption).toMatchObject({
      attackType: 'push',
      restrictionsFailed: ['LimbMissing'],
      toHit: {
        allowed: false,
        restrictionReason: 'Arm missing',
        restrictionReasonCode: 'LimbMissing',
      },
    });
  });

  it('preserves represented push building-target restrictions before commit', () => {
    const currentState = makeState({
      phase: GamePhase.PhysicalAttack,
      units: {
        a1: makeUnitState({
          id: 'a1',
          side: GameSide.Player,
          position: { q: 0, r: 0 },
        }),
        t1: makeUnitState({
          id: 't1',
          side: GameSide.Opponent,
          position: { q: 1, r: 0 },
        }),
      },
    });

    const inputs = buildCommandPreviewInputs({
      currentState,
      selectedUnitId: 'a1',
      activeTargetId: null,
      tokens: [],
      unitBindings: [
        makeUnitBinding({ id: 'a1', unitType: UnitType.BATTLEMECH }),
        makeUnitBinding({
          id: 't1',
          name: 'Target Mek',
          side: GameSide.Opponent,
          unitType: UnitType.BATTLEMECH,
        }),
      ],
      mapRadius: 3,
      grid: gridWithTerrain(
        { q: 1, r: 0 },
        terrainStringFromFeatures([{ type: TerrainType.Building, level: 1 }]),
      ),
      unitWeapons: {},
      hitChance: null,
      physicalAttackTargetId: 't1',
      physicalAttackType: 'push',
    });

    expect(inputs.physicalAttackOption).toMatchObject({
      attackType: 'push',
      restrictionsFailed: ['TargetInsideBuilding'],
      toHit: {
        allowed: false,
        restrictionReason: 'Target is inside building',
        restrictionReasonCode: 'TargetInsideBuilding',
      },
    });
  });

  it('carries hovered movement projection inputs for the command preview', () => {
    const weapon = makeWeapon();
    const movementInfo: IMovementRangeHex = {
      hex: { q: 2, r: 0 },
      mpCost: 4,
      terrainCost: 1,
      elevationDelta: 1,
      elevationCost: 1,
      heatGenerated: 2,
      movementMode: 'tracked',
      reachable: false,
      movementType: MovementType.Run,
      blockedReason: 'Destination hex is occupied',
      movementInvalidReason: 'DestinationOccupied',
      movementInvalidDetails: 'Destination hex is occupied',
    };

    const inputs = buildCommandPreviewInputs({
      currentState: makeState({ phase: GamePhase.Movement }),
      selectedUnitId: 'a1',
      activeTargetId: null,
      tokens: [],
      unitBindings: [],
      mapRadius: 3,
      grid: createMinimalGrid(3),
      unitWeapons: { a1: [weapon] },
      hitChance: null,
      movementInfo,
      highlightPath: [],
      hoverUnreachable: true,
    });

    expect(inputs).toMatchObject({
      weaponStatuses: [weapon],
      hitChance: null,
      movementInfo,
      highlightPath: [],
      hoverUnreachable: true,
    });
    expect(inputs.combatInfo).toBeUndefined();
  });
});
