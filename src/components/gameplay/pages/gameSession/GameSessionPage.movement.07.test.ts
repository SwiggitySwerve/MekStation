import * as H from './GameSessionPage.movement.test-helpers';

const {
  Facing,
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  MovementType,
  act,
  appendHoveredMovementProjection,
  beforeEach,
  buildMovementLegendState,
  buildMovementModeSeedPlan,
  buildMovementModeSeedPlanFromCommandPayload,
  buildMovementPlan,
  buildMovementPlanningHookFixture,
  canProjectMovementForSelectedUnit,
  createHexGrid,
  describe,
  expect,
  getEffectiveMovementMps,
  getPlannedMovementForSelectedUnit,
  it,
  mergeJumpMovementRangeHexes,
  mergeRunMovementRangeHexes,
  movementPathFromRangeHex,
  movementTypeFromCommandPayload,
  movementTypeFromLegendSelection,
  renderHook,
  useGameMovementPlanning,
  useGameplayStore,
} = H;

type IGameSession = H.IGameSession;
type IMovementCapability = H.IMovementCapability;
type IMovementRangeHex = H.IMovementRangeHex;
type InteractiveSession = H.InteractiveSession;
describe('mergeJumpMovementRangeHexes', () => {
  const jumpRangeHex: IMovementRangeHex = {
    hex: { q: 2, r: 0 },
    mpCost: 2,
    terrainCost: 0,
    elevationDelta: 2,
    elevationCost: 0,
    path: [
      { q: 0, r: 0 },
      { q: 2, r: 0 },
    ],
    heatGenerated: 1,
    movementMode: 'jump',
    reachable: true,
    movementType: MovementType.Jump,
  };
  const runRangeHex: IMovementRangeHex = {
    ...jumpRangeHex,
    mpCost: 4,
    terrainCost: 1,
    elevationDelta: 1,
    elevationCost: 1,
    path: [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 2, r: 0 },
    ],
    heatGenerated: 2,
    movementMode: 'tracked',
    movementType: MovementType.Run,
  };
  const walkRangeHex: IMovementRangeHex = {
    ...runRangeHex,
    mpCost: 3,
    heatGenerated: 0,
    movementType: MovementType.Walk,
  };

  it('keeps jump primary while exposing same-hex walk and run options', () => {
    const merged = mergeJumpMovementRangeHexes(
      [jumpRangeHex],
      [runRangeHex],
      [walkRangeHex],
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      movementType: MovementType.Jump,
      movementMode: 'jump',
      mpCost: 2,
      reachable: true,
    });
    expect(merged[0].movementModeOptions).toEqual([
      expect.objectContaining({
        movementType: MovementType.Jump,
        reachable: true,
        mpCost: 2,
        terrainCost: 0,
        elevationDelta: 2,
        elevationCost: 0,
        heatGenerated: 1,
      }),
      expect.objectContaining({
        movementType: MovementType.Run,
        reachable: true,
        mpCost: 4,
        terrainCost: 1,
        elevationDelta: 1,
        elevationCost: 1,
        heatGenerated: 2,
      }),
      expect.objectContaining({
        movementType: MovementType.Walk,
        reachable: true,
        mpCost: 3,
        terrainCost: 1,
        elevationDelta: 1,
        elevationCost: 1,
        heatGenerated: 0,
      }),
    ]);
  });

  it('does not widen the jump overlay with ground-only alternatives', () => {
    const groundOnlyRun: IMovementRangeHex = {
      ...runRangeHex,
      hex: { q: 3, r: 0 },
    };

    const merged = mergeJumpMovementRangeHexes(
      [jumpRangeHex],
      [groundOnlyRun],
      [],
    );

    expect(merged).toHaveLength(1);
    expect(merged[0].hex).toEqual(jumpRangeHex.hex);
    expect(merged[0].movementModeOptions).toBeUndefined();
  });

  it('keeps a blocked jump primary while exposing a reachable walk option', () => {
    const blockedJump: IMovementRangeHex = {
      ...jumpRangeHex,
      reachable: false,
      blockedReason: 'Jump elevation rise of 3 exceeds jump MP 2',
      movementInvalidReason: 'TerrainBlocked',
      movementInvalidDetails: 'Jump elevation rise of 3 exceeds jump MP 2',
    };

    const merged = mergeJumpMovementRangeHexes(
      [blockedJump],
      [],
      [walkRangeHex],
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      movementType: MovementType.Jump,
      reachable: false,
      blockedReason: 'Jump elevation rise of 3 exceeds jump MP 2',
    });
    expect(merged[0].movementModeOptions).toEqual([
      expect.objectContaining({
        movementType: MovementType.Jump,
        reachable: false,
        movementInvalidReason: 'TerrainBlocked',
      }),
      expect.objectContaining({
        movementType: MovementType.Walk,
        reachable: true,
        mpCost: 3,
      }),
    ]);
  });
});
