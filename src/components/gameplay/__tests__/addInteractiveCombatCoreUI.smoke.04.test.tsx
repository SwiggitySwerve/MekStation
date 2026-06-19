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
describe('12.2 PhaseBanner reacts to session phase change', () => {
  it("renders the new phase when the session's currentState.phase flips", () => {
    const session = createDemoSession();
    // Demo session starts in WeaponAttack; flip to Movement and
    // confirm the banner re-renders with the new phase label.
    const initial = renderLayout({ session });
    expect(screen.getByTestId('phase-name')).toHaveTextContent(
      /Weapon Attack/i,
    );

    const movedSession: IGameSession = {
      ...session,
      currentState: { ...session.currentState, phase: GamePhase.Movement },
    };
    initial.rerender(
      <GameplayLayout
        session={movedSession}
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

    expect(screen.getByTestId('phase-name')).toHaveTextContent(/Movement/i);
  });
});
