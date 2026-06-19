import * as H from './GameplayLayout.commandPreview.test-helpers';

const {
  Facing,
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  MovementType,
  RangeBracket,
  TerrainType,
  TokenUnitType,
  UnitType,
  buildCommandPreviewInputs,
  coordToKey,
  createMinimalGrid,
  gridWithTerrain,
  makeState,
  makeToken,
  makeUnitBinding,
  makeUnitState,
  makeWeapon,
  terrainStringFromFeatures,
} = H;

type IGameState = H.IGameState;
type IGameUnit = H.IGameUnit;
type IHexCoordinate = H.IHexCoordinate;
type IHexGrid = H.IHexGrid;
type IMovementRangeHex = H.IMovementRangeHex;
type IUnitGameState = H.IUnitGameState;
type IUnitToken = H.IUnitToken;
type IWeaponStatus = H.IWeaponStatus;
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
});
