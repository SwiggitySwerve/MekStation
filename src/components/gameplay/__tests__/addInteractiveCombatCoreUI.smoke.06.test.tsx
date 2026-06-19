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
describe('12.4 Narrow viewport collapses record sheet into drawer', () => {
  /**
   * jsdom's default matchMedia mock (defined in jest.setup.js)
   * answers `matches: false` for every query — i.e., desktop. We
   * can't redefine the property (not configurable), so instead we
   * re-wire the existing jest.fn() implementation for this block
   * and restore it afterward. That keeps the global mock in place
   * for the rest of the suite.
   */
  const mmFn = window.matchMedia as jest.Mock;
  const originalImpl = mmFn.getMockImplementation();
  const originalInnerWidth = window.innerWidth;

  beforeEach(() => {
    mmFn.mockImplementation((query: string) => ({
      matches: /max-width:\s*1023/.test(query),
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    // innerWidth is read on initial state (SSR-safe fallback path);
    // push it below the breakpoint so the first render is narrow.
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 800,
    });
  });

  afterEach(() => {
    if (originalImpl) {
      mmFn.mockImplementation(originalImpl);
    } else {
      mmFn.mockReset();
    }
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  it('hides the split-view record sheet panel and exposes a drawer toggle', () => {
    renderLayout({ selectedUnitId: 'unit-player-1' });

    // Split-view panel and resize handle are absent below `lg:`.
    expect(screen.queryByTestId('record-sheet-panel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('resize-handle')).not.toBeInTheDocument();

    // Drawer is not yet open — overlay should NOT be mounted.
    expect(screen.queryByTestId('record-sheet-drawer')).not.toBeInTheDocument();

    // PhaseBanner hosts the toggle button; clicking it opens the drawer.
    const toggle = screen.getByTestId('record-sheet-drawer-toggle');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);

    const drawer = screen.getByTestId('record-sheet-drawer');
    expect(drawer).toBeInTheDocument();
    expect(screen.getByTestId('record-sheet-drawer-toggle')).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    // The drawer renders the same record-sheet body, keyed to the
    // same selection — confirm by looking for the unit-name header
    // inside the drawer element.
    expect(drawer).toHaveTextContent(/Atlas/i);

    // Closing via the drawer's own close button hides it again.
    fireEvent.click(screen.getByTestId('record-sheet-drawer-close'));
    expect(screen.queryByTestId('record-sheet-drawer')).not.toBeInTheDocument();
  });
});
