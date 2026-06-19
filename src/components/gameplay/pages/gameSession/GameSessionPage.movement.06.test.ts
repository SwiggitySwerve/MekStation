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
describe('mergeRunMovementRangeHexes', () => {
  const runRangeHex: IMovementRangeHex = {
    hex: { q: 2, r: 0 },
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
    reachable: true,
    movementType: MovementType.Run,
  };
  const walkRangeHex: IMovementRangeHex = {
    ...runRangeHex,
    mpCost: 2,
    terrainCost: 2,
    elevationDelta: -1,
    elevationCost: 0,
    heatGenerated: 1,
    path: [
      { q: 0, r: 0 },
      { q: 2, r: 0 },
    ],
    movementType: MovementType.Walk,
  };

  it('keeps active run projection data and exposes the walk option when both reach the same hex', () => {
    const merged = mergeRunMovementRangeHexes([runRangeHex], [walkRangeHex]);

    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      movementType: MovementType.Run,
      mpCost: 4,
      heatGenerated: 2,
      path: runRangeHex.path,
    });
    expect(merged[0].movementModeOptions).toEqual([
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
        mpCost: 2,
        terrainCost: 2,
        elevationDelta: -1,
        elevationCost: 0,
        heatGenerated: 1,
      }),
    ]);
  });

  it('uses reachable walk data when the matching run projection is blocked while preserving the blocked run option', () => {
    const blockedRun: IMovementRangeHex = {
      ...runRangeHex,
      reachable: false,
      blockedReason: 'Elevation change exceeds movement mode limit',
      movementInvalidReason: 'InvalidPath',
    };

    const merged = mergeRunMovementRangeHexes([blockedRun], [walkRangeHex]);

    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      movementType: MovementType.Walk,
      mpCost: 2,
      heatGenerated: 1,
      reachable: true,
    });
    expect(merged[0].movementModeOptions).toEqual([
      expect.objectContaining({
        movementType: MovementType.Walk,
        reachable: true,
        mpCost: 2,
      }),
      expect.objectContaining({
        movementType: MovementType.Run,
        reachable: false,
        mpCost: 4,
        blockedReason: 'Elevation change exceeds movement mode limit',
        movementInvalidReason: 'InvalidPath',
      }),
    ]);
  });
});
