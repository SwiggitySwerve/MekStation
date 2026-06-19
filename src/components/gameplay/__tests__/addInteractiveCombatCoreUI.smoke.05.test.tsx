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
describe('12.3 Damage event adds an entry to the event log', () => {
  it('renders a new event-row when a DamageApplied event is appended', () => {
    const session = createDemoSession();
    const initial = renderLayout({ session });

    // Baseline: two demo events (TurnStarted + PhaseChanged).
    const baselineCount = screen.getAllByTestId('event-row').length;
    expect(baselineCount).toBe(session.events.length);

    const damagePayload: IDamageAppliedPayload = {
      unitId: 'unit-opponent-1',
      location: 'center_torso',
      damage: 20,
      armorRemaining: 2,
      structureRemaining: 16,
      locationDestroyed: false,
    };

    const damageEvent: IGameEvent = {
      id: 'evt-damage-1',
      gameId: session.id,
      sequence: session.events.length + 1,
      timestamp: new Date().toISOString(),
      type: GameEventType.DamageApplied,
      turn: session.currentState.turn,
      phase: session.currentState.phase,
      payload: damagePayload,
    };

    const updatedSession: IGameSession = {
      ...session,
      events: [...session.events, damageEvent],
    };

    initial.rerender(
      <GameplayLayout
        session={updatedSession}
        selectedUnitId={null}
        onUnitSelect={jest.fn()}
        onAction={jest.fn()}
        isPlayerTurn={true}
        unitWeapons={createDemoWeapons()}
        maxArmor={createDemoMaxArmor()}
        maxStructure={createDemoMaxStructure()}
        pilotNames={createDemoPilotNames()}
        heatSinks={createDemoHeatSinks()}
        unitSpas={createDemoUnitSpas()}
        playerSide={GameSide.Player}
      />,
    );

    const rows = screen.getAllByTestId('event-row');
    expect(rows.length).toBe(baselineCount + 1);
    // Newest-first ordering — the first row must be our damage row.
    expect(rows[0]).toHaveAttribute('data-event-id', 'evt-damage-1');
    // Event-count badge on the header updates too.
    expect(screen.getByTestId('event-log-count')).toHaveTextContent(
      `(${updatedSession.events.length})`,
    );
  });
});
