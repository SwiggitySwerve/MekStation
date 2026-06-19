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
describe('useGameMovementPlanning legend mode selection', () => {
  beforeEach(() => {
    useGameplayStore.getState().reset();
  });

  it('seeds selected-unit movement projection from the map legend callback', () => {
    const { session, interactiveSession } = buildMovementPlanningHookFixture();
    const { result } = renderHook(() =>
      useGameMovementPlanning({
        session,
        interactiveSession,
        selectedUnitId: 'unit-a',
        phase: GamePhase.Movement,
        handleInteractiveHexClick: () => undefined,
      }),
    );

    act(() => {
      result.current.handleMovementModeSelect('jump');
    });

    expect(useGameplayStore.getState().plannedMovement).toEqual({
      unitId: 'unit-a',
      destination: { q: -1, r: 1 },
      facing: Facing.Southeast,
      movementType: MovementType.Jump,
      path: [],
    });
    expect(result.current.mpLegend).toMatchObject({
      active: 'jump',
      jumpAvailable: true,
      jumpMP: 3,
    });
  });

  it('does not seed jump movement when the live capability has no jump MP', () => {
    const { session, interactiveSession } = buildMovementPlanningHookFixture({
      jumpMP: 0,
    });
    const { result } = renderHook(() =>
      useGameMovementPlanning({
        session,
        interactiveSession,
        selectedUnitId: 'unit-a',
        phase: GamePhase.Movement,
        handleInteractiveHexClick: () => undefined,
      }),
    );

    act(() => {
      result.current.handleMovementModeSelect('jump');
    });

    expect(useGameplayStore.getState().plannedMovement).toBeNull();
    expect(result.current.mpLegend).toMatchObject({
      active: 'walk',
      jumpAvailable: false,
      jumpMP: 0,
    });
  });

  it('uses runtime LAM fighter conversion capability for legend MP and jump gating', () => {
    const { session, interactiveSession } = buildMovementPlanningHookFixture({
      selectedUnitState: { conversionMode: 'fighter' },
      capability: {
        jumpMP: 5,
        movementMode: 'walk',
        unitHeight: 1,
        unitHeightProfile: { kind: 'lam', standingHeight: 1 },
      },
    });
    const { result } = renderHook(() =>
      useGameMovementPlanning({
        session,
        interactiveSession,
        selectedUnitId: 'unit-a',
        phase: GamePhase.Movement,
        handleInteractiveHexClick: () => undefined,
      }),
    );

    expect(result.current.effectiveMovementMps).toEqual({
      walkMP: 2,
      runMP: 2,
      jumpMP: 0,
    });
    expect(result.current.mpLegend).toMatchObject({
      active: 'walk',
      jumpAvailable: false,
      movementMode: 'wheeled',
      walkMP: 2,
      runMP: 2,
      jumpMP: 0,
    });
    expect(result.current.capability).toMatchObject({
      movementMode: 'wheeled',
      unitHeight: 0,
      conversionThrustMP: 5,
    });

    act(() => {
      result.current.handleMovementModeSelect('jump');
    });

    expect(useGameplayStore.getState().plannedMovement).toBeNull();
  });
});
