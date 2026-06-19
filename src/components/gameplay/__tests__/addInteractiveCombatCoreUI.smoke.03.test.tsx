import * as H from './addInteractiveCombatCoreUI.smoke.test-helpers';

const {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameplayLayout,
  React,
  act,
  createDemoHeatSinks,
  createDemoMaxArmor,
  createDemoMaxStructure,
  createDemoPilotNames,
  createDemoSession,
  createDemoUnitSpas,
  createDemoWeapons,
  createInteractiveSessionStub,
  createMinimalGrid,
  createSmallLaser,
  createWeaponPhaseSession,
  fireEvent,
  render,
  renderLayout,
  screen,
  usePhysicalAttackPlanStore,
} = H;

type IDamageAppliedPayload = H.IDamageAppliedPayload;
type IGameEvent = H.IGameEvent;
type IGameSession = H.IGameSession;
type IHexGrid = H.IHexGrid;
type IWeaponStatus = H.IWeaponStatus;
type InteractiveSession = H.InteractiveSession;
type PhysicalAttackIntent = H.PhysicalAttackIntent;
describe('Physical attack map intent overlay', () => {
  afterEach(() => {
    act(() => {
      usePhysicalAttackPlanStore.getState().clearPhysicalAttackPlan();
    });
  });

  it('renders physical attack intent arrows in the map SVG layer', () => {
    renderLayout({
      selectedUnitId: 'unit-player-1',
      physicalAttackIntent: {
        variant: 'charge',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
      },
    });

    const projectionLayer = screen.getByTestId('map-projection-layer');
    const arrow = screen.getByTestId('physical-attack-intent-arrow');
    expect(projectionLayer).toContainElement(arrow);
  });

  it('highlights adjacent physical attack targets on the map', () => {
    const session = createDemoSession();
    const physicalSession: IGameSession = {
      ...session,
      currentState: {
        ...session.currentState,
        phase: GamePhase.PhysicalAttack,
        units: {
          ...session.currentState.units,
          'unit-player-1': {
            ...session.currentState.units['unit-player-1'],
            position: { q: 0, r: 0 },
          },
          'unit-opponent-1': {
            ...session.currentState.units['unit-opponent-1'],
            position: { q: 1, r: 0 },
          },
        },
      },
    };

    renderLayout({
      session: physicalSession,
      selectedUnitId: 'unit-player-1',
    });

    expect(screen.getByTestId('unit-valid-target-ring')).toBeInTheDocument();
  });

  it('does not highlight physical attack targets outside adjacent range', () => {
    const session = createDemoSession();
    const physicalSession: IGameSession = {
      ...session,
      currentState: {
        ...session.currentState,
        phase: GamePhase.PhysicalAttack,
        units: {
          ...session.currentState.units,
          'unit-player-1': {
            ...session.currentState.units['unit-player-1'],
            position: { q: 0, r: 0 },
          },
          'unit-opponent-1': {
            ...session.currentState.units['unit-opponent-1'],
            position: { q: 2, r: 0 },
          },
        },
      },
    };

    renderLayout({
      session: physicalSession,
      selectedUnitId: 'unit-player-1',
    });

    expect(screen.queryByTestId('unit-valid-target-ring')).toBeNull();
  });

  it('renders the selected physical target as active on the map', () => {
    usePhysicalAttackPlanStore
      .getState()
      .setPhysicalAttackTarget('unit-opponent-1');
    const session = createDemoSession();
    const physicalSession: IGameSession = {
      ...session,
      currentState: {
        ...session.currentState,
        phase: GamePhase.PhysicalAttack,
        units: {
          ...session.currentState.units,
          'unit-player-1': {
            ...session.currentState.units['unit-player-1'],
            position: { q: 0, r: 0 },
          },
          'unit-opponent-1': {
            ...session.currentState.units['unit-opponent-1'],
            position: { q: 1, r: 0 },
          },
        },
      },
    };

    renderLayout({
      session: physicalSession,
      selectedUnitId: 'unit-player-1',
    });

    expect(screen.getByTestId('unit-active-target-pulse')).toBeInTheDocument();
  });
});
