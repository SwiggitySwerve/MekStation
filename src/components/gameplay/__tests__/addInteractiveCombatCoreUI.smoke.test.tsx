/**
 * Per-change smoke test for `add-interactive-combat-core-ui`.
 *
 * Covers the four integration scenarios in tasks.md § 12:
 *   12.1 Clicking two different tokens in sequence swaps the action
 *        panel content.
 *   12.2 Emitting a phase change advances the phase tracker.
 *   12.3 Emitting a damage event adds an event log entry.
 *   12.4 Resizing the viewport below 1024px collapses the action
 *        panel into a drawer.
 *
 * @spec openspec/changes/add-interactive-combat-core-ui/tasks.md § 12
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';
import type { PhysicalAttackIntent } from '@/components/gameplay/PhysicalAttackPanel';
import type { InteractiveSession } from '@/engine/InteractiveSession';

import {
  createDemoHeatSinks,
  createDemoMaxArmor,
  createDemoMaxStructure,
  createDemoPilotNames,
  createDemoSession,
  createDemoUnitSpas,
  createDemoWeapons,
} from '@/__fixtures__/gameplay';
import { GameplayLayout } from '@/components/gameplay/GameplayLayout';
import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { usePhysicalAttackPlanStore } from '@/stores/useGameplayStore.combatFlows';
import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  type IDamageAppliedPayload,
  type IGameEvent,
  type IGameSession,
  type IHexGrid,
  type IWeaponStatus,
} from '@/types/gameplay';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Convenience wrapper: renders `<GameplayLayout>` with demo data
 * and overridable selection. Keeps each scenario terse while
 * exercising the same prop surface the real page uses.
 */
function renderLayout(
  opts: {
    session?: IGameSession;
    selectedUnitId?: string | null;
    onUnitSelect?: (id: string | null) => void;
    physicalAttackIntent?: PhysicalAttackIntent | null;
    validTargetIds?: readonly string[];
    unitWeapons?: Record<string, readonly IWeaponStatus[]>;
    interactiveSession?: InteractiveSession;
  } = {},
) {
  const session = opts.session ?? createDemoSession();
  const selectedUnitId = opts.selectedUnitId ?? null;
  const onUnitSelect = opts.onUnitSelect ?? jest.fn();
  const unitWeapons = opts.unitWeapons ?? createDemoWeapons();

  return {
    session,
    onUnitSelect,
    ...render(
      <GameplayLayout
        session={session}
        selectedUnitId={selectedUnitId}
        onUnitSelect={onUnitSelect}
        onAction={jest.fn()}
        isPlayerTurn={true}
        unitWeapons={unitWeapons}
        maxArmor={createDemoMaxArmor()}
        maxStructure={createDemoMaxStructure()}
        pilotNames={createDemoPilotNames()}
        heatSinks={createDemoHeatSinks()}
        unitSpas={createDemoUnitSpas()}
        physicalAttackIntent={opts.physicalAttackIntent}
        validTargetIds={opts.validTargetIds}
        interactiveSession={opts.interactiveSession}
        playerSide={GameSide.Player}
      />,
    ),
  };
}

function createInteractiveSessionStub(
  session: IGameSession,
  gridOverride?: IHexGrid,
): InteractiveSession {
  const grid = gridOverride ?? createMinimalGrid(session.config.mapRadius);

  return {
    getGrid: () => grid,
    getMovementCapability: () => ({ walkMP: 4, runMP: 6, jumpMP: 0 }),
    declareWithdrawal: jest.fn(),
    concede: jest.fn(),
    isGameOver: () => false,
    getSession: () => session,
  } as unknown as InteractiveSession;
}

function createSmallLaser(): IWeaponStatus {
  return {
    id: 'small-laser',
    name: 'Small Laser',
    location: 'right_arm',
    destroyed: false,
    firedThisTurn: false,
    heat: 1,
    damage: 3,
    ranges: { short: 1, medium: 2, long: 3 },
  };
}

function createWeaponPhaseSession(targetQ: number): IGameSession {
  const session = createDemoSession();

  return {
    ...session,
    currentState: {
      ...session.currentState,
      phase: GamePhase.WeaponAttack,
      units: {
        ...session.currentState.units,
        'unit-player-1': {
          ...session.currentState.units['unit-player-1'],
          position: { q: 0, r: 0 },
          facing: Facing.Southeast,
        },
        'unit-opponent-1': {
          ...session.currentState.units['unit-opponent-1'],
          position: { q: targetQ, r: 0 },
        },
      },
    },
  };
}

// ---------------------------------------------------------------------------
// 12.1 — Token selection swaps action panel content
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 12.2 — Phase change advances the tracker
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 12.3 — Damage event appears in the event log
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 12.4 — Narrow viewport collapses action panel into a drawer
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// § 6.2 — Heat threshold tick marks
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// § 5.1 — Armor pip rail (read-only pip visualization)
// ---------------------------------------------------------------------------

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
