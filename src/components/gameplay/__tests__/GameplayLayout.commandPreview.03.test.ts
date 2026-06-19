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
        restrictionReason: 'Both arms must be present to push',
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
