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
describe('6.2 Heat bar tick marks at canonical thresholds', () => {
  it('renders a tick and label for each of the 8/13/17/24 breakpoints', () => {
    renderLayout({ selectedUnitId: 'unit-player-1' });
    for (const threshold of [8, 13, 17, 24]) {
      expect(screen.getByTestId(`heat-tick-${threshold}`)).toBeInTheDocument();
      const label = screen.getByTestId(`heat-tick-label-${threshold}`);
      expect(label).toBeInTheDocument();
      expect(label).toHaveAttribute('data-threshold', String(threshold));
    }
  });
});
