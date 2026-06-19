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
describe('movement projection path planning', () => {
  const selectedUnitState = {
    id: 'unit-a',
    position: { q: 0, r: 0 },
    facing: Facing.North,
  } as IGameSession['currentState']['units'][string];

  const projectedRangeHex: IMovementRangeHex = {
    hex: { q: 1, r: 0 },
    mpCost: 3,
    terrainCost: 1,
    elevationDelta: 1,
    elevationCost: 1,
    path: [
      { q: 0, r: 0 },
      { q: 0, r: 1 },
      { q: 1, r: 0 },
    ],
    heatGenerated: 2,
    movementMode: 'tracked',
    reachable: true,
    movementType: MovementType.Run,
  };

  it('uses the projected range path for hover and commit previews', () => {
    expect(
      movementPathFromRangeHex(projectedRangeHex, selectedUnitState.position),
    ).toBe(projectedRangeHex.path);

    const plan = buildMovementPlan({
      hex: projectedRangeHex.hex,
      selectedUnitState,
      movementRangeLookup: new Map([['1,0', projectedRangeHex]]),
      movementType: MovementType.Run,
    });

    expect(plan).toMatchObject({
      unitId: 'unit-a',
      destination: { q: 1, r: 0 },
      facing: Facing.Northeast,
      movementType: MovementType.Run,
      path: projectedRangeHex.path,
      mpCost: 3,
      heatGenerated: 2,
      movementMode: 'tracked',
      terrainCost: 1,
      elevationDelta: 1,
      elevationCost: 1,
    });
  });

  it('commits the projected movement type when run mode exposes a walk fallback', () => {
    const walkFallback: IMovementRangeHex = {
      ...projectedRangeHex,
      mpCost: 4,
      heatGenerated: 1,
      movementMode: 'walk',
      movementType: MovementType.Walk,
    };

    const plan = buildMovementPlan({
      hex: walkFallback.hex,
      selectedUnitState,
      movementRangeLookup: new Map([['1,0', walkFallback]]),
      movementType: MovementType.Run,
    });

    expect(plan).toMatchObject({
      movementType: MovementType.Walk,
      mpCost: 4,
      heatGenerated: 1,
      movementMode: 'walk',
      path: walkFallback.path,
    });
  });

  it('refuses to plan movement for projected blocked destinations', () => {
    const blocked: IMovementRangeHex = {
      ...projectedRangeHex,
      reachable: false,
      blockedReason: 'Destination hex is occupied',
      movementInvalidReason: 'DestinationOccupied',
      movementInvalidDetails: 'Destination hex is occupied',
    };

    expect(
      buildMovementPlan({
        hex: blocked.hex,
        selectedUnitState,
        movementRangeLookup: new Map([['1,0', blocked]]),
        movementType: MovementType.Run,
      }),
    ).toBeNull();
  });
});
