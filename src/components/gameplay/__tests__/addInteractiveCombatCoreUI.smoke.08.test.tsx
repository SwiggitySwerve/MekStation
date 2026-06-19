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
describe('5.1 Armor diagram renders pips per location', () => {
  it('shows an armor pip rail and structure pip rail for every location', () => {
    renderLayout({ selectedUnitId: 'unit-player-1' });
    // Every canonical location must have a pip container so damage
    // is readable at a glance, not just as a text ratio.
    for (const location of [
      'head',
      'center_torso',
      'left_torso',
      'right_torso',
      'left_arm',
      'right_arm',
      'left_leg',
      'right_leg',
    ]) {
      expect(
        screen.getByTestId(`location-pips-${location}`),
      ).toBeInTheDocument();
      expect(screen.getByTestId(`armor-pips-${location}`)).toBeInTheDocument();
      expect(
        screen.getByTestId(`structure-pips-${location}`),
      ).toBeInTheDocument();
    }

    // § 5.2 — torso locations must include a rear armor pip rail.
    for (const torso of ['center_torso', 'left_torso', 'right_torso']) {
      expect(
        screen.getByTestId(`armor-pips-${torso}_rear`),
      ).toBeInTheDocument();
    }
  });
});
