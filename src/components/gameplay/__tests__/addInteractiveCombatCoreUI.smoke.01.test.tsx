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
describe('12.1 Token selection swaps record sheet', () => {
  it("shows the selected unit's name and updates when selection changes", () => {
    // First render with player unit selected.
    const { rerender, session } = renderLayout({
      selectedUnitId: 'unit-player-1',
    });

    const header1 = screen.getByTestId('record-sheet-unit-name');
    expect(header1).toHaveTextContent(/Atlas/i);

    // Re-render with the opponent unit selected; the record sheet's
    // unit name header must swap to reflect the new selection.
    rerender(
      <GameplayLayout
        session={session}
        selectedUnitId="unit-opponent-1"
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

    // Wave 7.2 PR-F: opponent units now route through TacticalUnitInspector
    // (applies opponent intel redaction per spec) instead of the legacy
    // RecordSheetBody. At the default 'rough' visibility tier the chassis
    // name is still visible (silhouette-level recognition); the precise
    // heat / armor / structure numerics are hidden until 'exact' tier.
    const header2 = screen.getByTestId('inspector-unit-name');
    expect(header2).toHaveTextContent(/Hunchback/i);

    // Inspector exposes the opponent target view (kind === 'target')
    // rather than the friendly record sheet.
    expect(screen.getByTestId('inspector-target')).toBeTruthy();
  });

  it('shows the placeholder when no unit is selected', () => {
    renderLayout({ selectedUnitId: null });
    expect(screen.getByTestId('no-unit-selected')).toHaveTextContent(
      /Select a unit to view its status/i,
    );
  });

  it('projects fog-of-war token state from the session config', () => {
    const session = createDemoSession();
    const foggedSession: IGameSession = {
      ...session,
      sideOwners: {
        [GameSide.Player]: 'pid_player',
        [GameSide.Opponent]: 'pid_opponent',
      },
      config: { ...session.config, fogOfWar: true },
      currentState: {
        ...session.currentState,
        units: {
          ...session.currentState.units,
          'unit-opponent-1': {
            ...session.currentState.units['unit-opponent-1'],
            position: { q: 20, r: 0 },
          },
        },
      },
    };

    renderLayout({ session: foggedSession });

    expect(screen.getByTestId('unit-token-unit-opponent-1')).toHaveAttribute(
      'data-fog-status',
      'lastKnown',
    );
    expect(
      screen.queryByTestId('unit-valid-target-ring'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('sensor-ring-unit-player-1')).toBeInTheDocument();
  });
});
