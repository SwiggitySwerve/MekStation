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
describe('getPlannedMovementForSelectedUnit', () => {
  const plan = {
    unitId: 'unit-a',
    destination: { q: 1, r: 0 },
    facing: Facing.North,
    movementType: MovementType.Run,
    path: [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
    ],
  };

  it('keeps the plan when it belongs to the selected unit', () => {
    expect(getPlannedMovementForSelectedUnit(plan, 'unit-a')).toBe(plan);
  });

  it('ignores stale movement plans from a different selected unit', () => {
    expect(getPlannedMovementForSelectedUnit(plan, 'unit-b')).toBeNull();
  });

  it('treats legacy unscoped plans as belonging to the current selection', () => {
    const legacyPlan = { ...plan, unitId: undefined };
    expect(getPlannedMovementForSelectedUnit(legacyPlan, 'unit-a')).toBe(
      legacyPlan,
    );
  });
});
