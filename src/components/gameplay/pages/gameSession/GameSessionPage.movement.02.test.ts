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
describe('getEffectiveMovementMps', () => {
  // Audit 2026-06-09 C-1: run MP re-derives from the heat-adjusted walk
  // (ceil(3 * 1.5) = 5, not 8 - 2 = 6). Audit 2026-06-09 C-2: jump MP is
  // heat-immune. The old expectations pinned the pre-fix raw subtraction.
  it('applies the same heat movement penalty used by movement range projection', () => {
    expect(
      getEffectiveMovementMps({ walkMP: 5, runMP: 8, jumpMP: 3 }, 10),
    ).toEqual({
      walkMP: 3,
      runMP: 5,
      jumpMP: 3,
    });
  });

  it('floors effective walk/run budgets at zero; jump MP is heat-immune', () => {
    expect(
      getEffectiveMovementMps({ walkMP: 2, runMP: 3, jumpMP: 1 }, 25),
    ).toEqual({
      walkMP: 0,
      runMP: 0,
      // Audit 2026-06-09 C-2: heat never reduces jump MP.
      jumpMP: 1,
    });
  });
});
