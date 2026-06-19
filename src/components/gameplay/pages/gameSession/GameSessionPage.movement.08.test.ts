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
describe('appendHoveredMovementProjection', () => {
  const reachableRangeHex: IMovementRangeHex = {
    hex: { q: 1, r: 0 },
    mpCost: 1,
    terrainCost: 0,
    elevationDelta: 0,
    elevationCost: 0,
    path: [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
    ],
    heatGenerated: 1,
    movementMode: 'walk',
    reachable: true,
    movementType: MovementType.Walk,
  };

  it('adds a hovered blocked projection when the base overlay has no entry for that hex', () => {
    const hoveredBlocked: IMovementRangeHex = {
      ...reachableRangeHex,
      hex: { q: 4, r: 0 },
      mpCost: 4,
      path: undefined,
      reachable: false,
      blockedReason: 'Destination is 4 hexes away, but max range for walk is 2',
      movementInvalidReason: 'InsufficientMP',
      movementInvalidDetails:
        'Destination is 4 hexes away, but max range for walk is 2',
    };

    const merged = appendHoveredMovementProjection(
      [reachableRangeHex],
      hoveredBlocked,
    );

    expect(merged).toHaveLength(2);
    expect(merged[1]).toMatchObject({
      hex: { q: 4, r: 0 },
      reachable: false,
      movementInvalidReason: 'InsufficientMP',
    });
  });

  it('does not replace an existing rules projection for the hovered hex', () => {
    const duplicateBlocked: IMovementRangeHex = {
      ...reachableRangeHex,
      reachable: false,
      movementInvalidReason: 'InsufficientMP',
    };

    const merged = appendHoveredMovementProjection(
      [reachableRangeHex],
      duplicateBlocked,
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]).toBe(reachableRangeHex);
  });
});
