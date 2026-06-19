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
describe('movement command payload planning', () => {
  const selectedUnitState = {
    id: 'unit-a',
    side: GameSide.Player,
    position: { q: 0, r: 1 },
    facing: Facing.Southeast,
    lockState: LockState.Pending,
  } as IGameSession['currentState']['units'][string];

  it('maps command payload modes to movement types used by map projection', () => {
    expect(movementTypeFromCommandPayload({ mode: 'walk' })).toBe(
      MovementType.Walk,
    );
    expect(movementTypeFromCommandPayload({ mode: 'run' })).toBe(
      MovementType.Run,
    );
    expect(movementTypeFromCommandPayload({ mode: 'jump' })).toBe(
      MovementType.Jump,
    );
    expect(movementTypeFromCommandPayload({ mode: 'sprint' })).toBe(
      MovementType.Sprint,
    );
    expect(movementTypeFromCommandPayload({ mode: 'evade' })).toBe(
      MovementType.Evade,
    );
    expect(movementTypeFromCommandPayload({ mode: 'careful' })).toBeNull();
    expect(movementTypeFromCommandPayload({ volley: true })).toBeNull();
  });

  it('maps map legend selections to movement types used by projection', () => {
    expect(movementTypeFromLegendSelection('walk')).toBe(MovementType.Walk);
    expect(movementTypeFromLegendSelection('run')).toBe(MovementType.Run);
    expect(movementTypeFromLegendSelection('jump')).toBe(MovementType.Jump);
  });

  it('seeds an empty selected-unit movement plan for command mode switches', () => {
    expect(
      buildMovementModeSeedPlan({
        selectedUnitState,
        movementType: MovementType.Jump,
      }),
    ).toEqual({
      unitId: 'unit-a',
      destination: selectedUnitState.position,
      facing: Facing.Southeast,
      movementType: MovementType.Jump,
      path: [],
    });
  });

  it('builds a mode seed plan only for movement-phase command payloads', () => {
    expect(
      buildMovementModeSeedPlanFromCommandPayload({
        phase: GamePhase.Movement,
        payload: { mode: 'run' },
        selectedUnitState,
      }),
    ).toMatchObject({
      unitId: 'unit-a',
      destination: selectedUnitState.position,
      facing: Facing.Southeast,
      movementType: MovementType.Run,
      path: [],
    });

    expect(
      buildMovementModeSeedPlanFromCommandPayload({
        phase: GamePhase.WeaponAttack,
        payload: { mode: 'run' },
        selectedUnitState,
      }),
    ).toBeNull();
    expect(
      buildMovementModeSeedPlanFromCommandPayload({
        phase: GamePhase.Movement,
        payload: { volley: true },
        selectedUnitState,
      }),
    ).toBeNull();
  });

  it('refuses to seed movement projection for units that already locked movement', () => {
    const lockedUnit = {
      ...selectedUnitState,
      lockState: LockState.Locked,
    };

    expect(
      canProjectMovementForSelectedUnit({
        phase: GamePhase.Movement,
        isPlayerControlled: true,
        selectedUnitState: lockedUnit,
      }),
    ).toBe(false);
    expect(
      buildMovementModeSeedPlanFromCommandPayload({
        phase: GamePhase.Movement,
        payload: { mode: 'walk' },
        selectedUnitState: lockedUnit,
      }),
    ).toBeNull();
  });
});
