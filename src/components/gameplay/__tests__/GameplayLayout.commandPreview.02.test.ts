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
        restrictionReason: 'Push target must be a Mek',
        restrictionReasonCode: 'TargetNotMek',
      },
    });
  });
});
