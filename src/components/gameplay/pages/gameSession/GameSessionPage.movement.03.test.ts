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
describe('buildMovementLegendState', () => {
  it('threads selected motive mode and effective MP values into the map legend state', () => {
    expect(
      buildMovementLegendState({
        phase: GamePhase.Movement,
        isPlayerControlled: true,
        effectiveMovementMps: { walkMP: 3, runMP: 5, jumpMP: 0 },
        movementType: MovementType.Run,
        movementMode: 'vtol',
      }),
    ).toEqual({
      active: 'run',
      jumpAvailable: false,
      movementMode: 'vtol',
      walkMP: 3,
      runMP: 5,
      jumpMP: 0,
    });
  });

  it('hides the map legend outside player-controlled movement planning', () => {
    expect(
      buildMovementLegendState({
        phase: GamePhase.WeaponAttack,
        isPlayerControlled: true,
        effectiveMovementMps: { walkMP: 3, runMP: 5, jumpMP: 1 },
        movementType: MovementType.Walk,
        movementMode: 'tracked',
      }),
    ).toBeUndefined();
    expect(
      buildMovementLegendState({
        phase: GamePhase.Movement,
        isPlayerControlled: false,
        effectiveMovementMps: { walkMP: 3, runMP: 5, jumpMP: 1 },
        movementType: MovementType.Walk,
        movementMode: 'tracked',
      }),
    ).toBeUndefined();
  });
});
