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
  type IMovementRangeHex,
  type IUnitGameState,
  type IUnitToken,
  type IWeaponStatus,
} from '@/types/gameplay';
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
    expect(inputs.combatInfo?.toHitNumber).toBe(4);
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
