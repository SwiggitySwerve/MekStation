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
describe('Weapon attack map target rings', () => {
  it('does not ring an out-of-range enemy even when the store lists it as a target', () => {
    const session = createWeaponPhaseSession(5);
    renderLayout({
      session,
      selectedUnitId: 'unit-player-1',
      validTargetIds: ['unit-opponent-1'],
      unitWeapons: { 'unit-player-1': [createSmallLaser()] },
      interactiveSession: createInteractiveSessionStub(session),
    });

    expect(
      screen.queryByTestId('unit-valid-target-ring'),
    ).not.toBeInTheDocument();
  });

  it('rings weapon targets only after shared combat projection marks them legal', () => {
    const session = createWeaponPhaseSession(2);
    renderLayout({
      session,
      selectedUnitId: 'unit-player-1',
      validTargetIds: [],
      unitWeapons: { 'unit-player-1': [createSmallLaser()] },
      interactiveSession: createInteractiveSessionStub(session),
    });

    expect(screen.getByTestId('unit-valid-target-ring')).toBeInTheDocument();
  });
});
