/**
 * Tests for TacticalCommandShell + ShellSlot.
 *
 * Verifies the PR-B contract:
 *   - TacticalCommandShell provides the registry context
 *   - useTacticalShell / useShellSlotRegistryContext throw outside the shell
 *   - ShellSlot is a transparent Fragment (no DOM wrapper)
 *   - ShellSlot registers on mount, unregisters on unmount
 *   - Per "one primary home", a non-primary ShellSlot loses to a primary
 *   - Multiple ShellSlot owners register independently
 *
 * @module components/gameplay/TacticalCommandShell/__tests__/TacticalCommandShell.test
 */

import { render, renderHook, act } from '@testing-library/react';

import {
  ShellSlot,
  TacticalCommandShell,
  useShellSlotRegistryContext,
  useTacticalShell,
} from '../index';

describe('TacticalCommandShell', () => {
  it('provides registry + viewerPlayerId + shellMode via context', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TacticalCommandShell viewerPlayerId="player-1" shellMode="combat">
        {children}
      </TacticalCommandShell>
    );

    const { result } = renderHook(() => useTacticalShell(), { wrapper });

    expect(result.current.viewerPlayerId).toBe('player-1');
    expect(result.current.shellMode).toBe('combat');
    expect(result.current.registry).toBeDefined();
    expect(typeof result.current.registry.register).toBe('function');
    expect(typeof result.current.registry.subscribe).toBe('function');
  });

  it('defaults shellMode to "combat" when not specified', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TacticalCommandShell viewerPlayerId="player-1">
        {children}
      </TacticalCommandShell>
    );

    const { result } = renderHook(() => useTacticalShell(), { wrapper });
    expect(result.current.shellMode).toBe('combat');
  });

  it('throws when useTacticalShell is called outside the shell', () => {
    // Suppress React error boundary noise for this expected throw.
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    expect(() => renderHook(() => useTacticalShell())).toThrow(
      /must be called inside a <TacticalCommandShell>/,
    );

    consoleErrorSpy.mockRestore();
  });

  it('throws when useShellSlotRegistryContext is called outside the shell', () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    expect(() => renderHook(() => useShellSlotRegistryContext())).toThrow(
      /must be called inside a <TacticalCommandShell>/,
    );

    consoleErrorSpy.mockRestore();
  });

  it('renders no chrome of its own (children render directly)', () => {
    // The shell is a logical provider — it has no visible DOM. Children
    // render as if they were at the same level as <TacticalCommandShell>.
    const { container } = render(
      <TacticalCommandShell viewerPlayerId="player-1">
        <div data-testid="child" className="child-class">
          hello
        </div>
      </TacticalCommandShell>,
    );

    // The root rendered element is the child div itself — no wrapper.
    const child = container.querySelector('[data-testid="child"]');
    expect(child).not.toBeNull();
    expect(child?.parentElement).toBe(container);
    expect(child?.textContent).toBe('hello');
  });
});

describe('ShellSlot', () => {
  function renderShellWith(children: React.ReactNode) {
    return render(
      <TacticalCommandShell viewerPlayerId="player-1">
        {children}
      </TacticalCommandShell>,
    );
  }

  it('is a transparent Fragment — adds no DOM wrapper', () => {
    const { container } = renderShellWith(
      <ShellSlot id="top-band" ownerId="PhaseBanner">
        <div data-testid="banner">phase banner</div>
      </ShellSlot>,
    );

    const banner = container.querySelector('[data-testid="banner"]');
    expect(banner).not.toBeNull();
    // No wrapper div from ShellSlot — banner is a direct child of the
    // render container (the shell is also transparent).
    expect(banner?.parentElement).toBe(container);
  });

  it('registers as a primary owner on mount and removes on unmount', () => {
    // Use a probe component to inspect the registry from inside the shell
    // context.
    const probeRegistry: {
      current: ReturnType<typeof useShellSlotRegistryContext> | null;
    } = { current: null };

    function Probe(): null {
      probeRegistry.current = useShellSlotRegistryContext();
      return null;
    }

    const { rerender, unmount } = render(
      <TacticalCommandShell viewerPlayerId="player-1">
        <Probe />
        <ShellSlot id="top-band" ownerId="PhaseBanner">
          <div>banner</div>
        </ShellSlot>
      </TacticalCommandShell>,
    );

    expect(probeRegistry.current?.getOwner('top-band')?.ownerId).toBe(
      'PhaseBanner',
    );
    expect(probeRegistry.current?.getOwner('top-band')?.primary).toBe(true);

    // Remove the slot — registry should clear.
    rerender(
      <TacticalCommandShell viewerPlayerId="player-1">
        <Probe />
      </TacticalCommandShell>,
    );

    expect(probeRegistry.current?.getOwner('top-band')).toBeNull();

    unmount();
  });

  it('respects primary=false (loses to a primary registration)', () => {
    const probe: {
      current: ReturnType<typeof useShellSlotRegistryContext> | null;
    } = { current: null };

    function Probe(): null {
      probe.current = useShellSlotRegistryContext();
      return null;
    }

    render(
      <TacticalCommandShell viewerPlayerId="player-1">
        <Probe />
        <ShellSlot id="bottom-dock" ownerId="ActionBar" primary={true}>
          <div>action bar</div>
        </ShellSlot>
        <ShellSlot id="bottom-dock" ownerId="PeekSurface" primary={false}>
          <div>peek</div>
        </ShellSlot>
      </TacticalCommandShell>,
    );

    // Primary holds the slot even though the peek mounted "after" in
    // the JSX. Both children still render (the slot wrappers are
    // transparent Fragments) but registry ownership is clear.
    expect(probe.current?.getOwner('bottom-dock')?.ownerId).toBe('ActionBar');
  });

  it('registers multiple distinct slots independently', () => {
    const probe: {
      current: ReturnType<typeof useShellSlotRegistryContext> | null;
    } = { current: null };

    function Probe(): null {
      probe.current = useShellSlotRegistryContext();
      return null;
    }

    render(
      <TacticalCommandShell viewerPlayerId="player-1">
        <Probe />
        <ShellSlot id="top-band" ownerId="PhaseBanner">
          <div>banner</div>
        </ShellSlot>
        <ShellSlot id="map-center" ownerId="HexMapDisplay">
          <div>map</div>
        </ShellSlot>
        <ShellSlot id="bottom-dock" ownerId="ActionBar">
          <div>actions</div>
        </ShellSlot>
        <ShellSlot id="feed" ownerId="EventLogDisplay">
          <div>feed</div>
        </ShellSlot>
      </TacticalCommandShell>,
    );

    expect(probe.current?.getOwner('top-band')?.ownerId).toBe('PhaseBanner');
    expect(probe.current?.getOwner('map-center')?.ownerId).toBe(
      'HexMapDisplay',
    );
    expect(probe.current?.getOwner('bottom-dock')?.ownerId).toBe('ActionBar');
    expect(probe.current?.getOwner('feed')?.ownerId).toBe('EventLogDisplay');
    expect(probe.current?.listSlots()).toHaveLength(4);
  });

  it('forwards modes to the slot owner', () => {
    const probe: {
      current: ReturnType<typeof useShellSlotRegistryContext> | null;
    } = { current: null };

    function Probe(): null {
      probe.current = useShellSlotRegistryContext();
      return null;
    }

    // PR-C: ShellSlot only registers when shellMode matches the modes
    // constraint. Use shellMode='replay' so the modes={['replay']} slot
    // actually registers; otherwise the registry would (correctly) show
    // no owner and the modes-forwarding assertion couldn't run.
    render(
      <TacticalCommandShell viewerPlayerId="player-1" shellMode="replay">
        <Probe />
        <ShellSlot id="bottom-dock" ownerId="ReplayDock" modes={['replay']}>
          <div>replay controls</div>
        </ShellSlot>
      </TacticalCommandShell>,
    );

    expect(probe.current?.getOwner('bottom-dock')?.modes).toEqual(['replay']);
  });

  it('updates registration when the slot id or ownerId changes', () => {
    // Defends a real refactor risk: if a parent component swaps a
    // ShellSlot's id (rare but possible) the old slot must release and
    // the new one must claim.
    const probe: {
      current: ReturnType<typeof useShellSlotRegistryContext> | null;
    } = { current: null };

    function Probe(): null {
      probe.current = useShellSlotRegistryContext();
      return null;
    }

    function Wrapper({
      slotId,
    }: {
      slotId: 'top-band' | 'feed';
    }): React.ReactElement {
      return (
        <TacticalCommandShell viewerPlayerId="player-1">
          <Probe />
          <ShellSlot id={slotId} ownerId="MovingOwner">
            <div>i can move</div>
          </ShellSlot>
        </TacticalCommandShell>
      );
    }

    const { rerender } = render(<Wrapper slotId="top-band" />);
    expect(probe.current?.getOwner('top-band')?.ownerId).toBe('MovingOwner');
    expect(probe.current?.getOwner('feed')).toBeNull();

    act(() => {
      rerender(<Wrapper slotId="feed" />);
    });

    expect(probe.current?.getOwner('top-band')).toBeNull();
    expect(probe.current?.getOwner('feed')?.ownerId).toBe('MovingOwner');
  });
});

describe('TacticalCommandShell — PR-C: mode filtering', () => {
  function ProbeRegistry({
    probe,
  }: {
    probe: { current: ReturnType<typeof useShellSlotRegistryContext> | null };
  }): null {
    probe.current = useShellSlotRegistryContext();
    return null;
  }

  it('does NOT register a mode-restricted slot owner when shellMode does not match', () => {
    // Per the spec `Shell Mode Ownership` requirement, a slot owner
    // declared with `modes={['combat']}` SHALL NOT register in
    // spectator/replay/gm mode.
    const probe: {
      current: ReturnType<typeof useShellSlotRegistryContext> | null;
    } = { current: null };

    render(
      <TacticalCommandShell viewerPlayerId="player-1" shellMode="spectator">
        <ProbeRegistry probe={probe} />
        <ShellSlot
          id="bottom-dock"
          ownerId="CombatActionBar"
          modes={['combat']}
        >
          <div data-testid="combat-actions">Fire</div>
        </ShellSlot>
      </TacticalCommandShell>,
    );

    expect(probe.current?.getOwner('bottom-dock')).toBeNull();
  });

  it('does NOT render children of a mode-restricted slot owner when mode does not match', () => {
    // Defends spec `Spectator mode disables private commands`: action
    // commands SHALL be disabled OR absent from the DOM in spectator
    // mode. Absent is the stronger guarantee.
    const { container } = render(
      <TacticalCommandShell viewerPlayerId="player-1" shellMode="spectator">
        <ShellSlot
          id="bottom-dock"
          ownerId="CombatActionBar"
          modes={['combat']}
        >
          <div data-testid="private-command">Fire weapons</div>
        </ShellSlot>
      </TacticalCommandShell>,
    );

    expect(
      container.querySelector('[data-testid="private-command"]'),
    ).toBeNull();
  });

  it('DOES register and render when modes includes the active shellMode', () => {
    const probe: {
      current: ReturnType<typeof useShellSlotRegistryContext> | null;
    } = { current: null };

    const { container } = render(
      <TacticalCommandShell viewerPlayerId="player-1" shellMode="replay">
        <ProbeRegistry probe={probe} />
        <ShellSlot
          id="bottom-dock"
          ownerId="ReplayPlaybackControls"
          modes={['replay']}
        >
          <div data-testid="playback">Play</div>
        </ShellSlot>
      </TacticalCommandShell>,
    );

    expect(probe.current?.getOwner('bottom-dock')?.ownerId).toBe(
      'ReplayPlaybackControls',
    );
    expect(container.querySelector('[data-testid="playback"]')).not.toBeNull();
  });

  it('treats empty/omitted modes as "all modes" (backward-compat)', () => {
    const probe: {
      current: ReturnType<typeof useShellSlotRegistryContext> | null;
    } = { current: null };

    render(
      <TacticalCommandShell viewerPlayerId="player-1" shellMode="spectator">
        <ProbeRegistry probe={probe} />
        <ShellSlot id="top-band" ownerId="PhaseBanner">
          <div>banner</div>
        </ShellSlot>
        <ShellSlot id="map-center" ownerId="HexMapDisplay" modes={[]}>
          <div>map</div>
        </ShellSlot>
      </TacticalCommandShell>,
    );

    expect(probe.current?.getOwner('top-band')?.ownerId).toBe('PhaseBanner');
    expect(probe.current?.getOwner('map-center')?.ownerId).toBe(
      'HexMapDisplay',
    );
  });
});

describe('TacticalCommandShell — PR-C: state + updateState', () => {
  function ProbeState({
    probe,
  }: {
    probe: { current: ReturnType<typeof useTacticalShell> | null };
  }): null {
    probe.current = useTacticalShell();
    return null;
  }

  it('exposes shell state via context with default-shape values', () => {
    const probe: {
      current: ReturnType<typeof useTacticalShell> | null;
    } = { current: null };

    render(
      <TacticalCommandShell viewerPlayerId="player-1">
        <ProbeState probe={probe} />
      </TacticalCommandShell>,
    );

    expect(probe.current?.state.shellMode).toBe('combat');
    expect(probe.current?.state.viewerPlayerId).toBe('player-1');
    expect(probe.current?.state.selectedUnit).toBeNull();
    expect(probe.current?.state.activeUnit).toBeNull();
    expect(probe.current?.state.inspectedUnit).toBeNull();
    expect(probe.current?.state.leftTrayCollapsed).toBe(false);
    expect(probe.current?.state.rightTrayPinned).toBe(false);
  });

  it('updateState applies a partial merge', () => {
    const probe: {
      current: ReturnType<typeof useTacticalShell> | null;
    } = { current: null };

    render(
      <TacticalCommandShell viewerPlayerId="player-1">
        <ProbeState probe={probe} />
      </TacticalCommandShell>,
    );

    act(() => {
      probe.current?.updateState({
        selectedUnit: 'unit-a',
        leftTrayCollapsed: true,
      });
    });

    expect(probe.current?.state.selectedUnit).toBe('unit-a');
    expect(probe.current?.state.leftTrayCollapsed).toBe(true);
    // Untouched fields stay at their defaults.
    expect(probe.current?.state.activeUnit).toBeNull();
    expect(probe.current?.state.inspectedUnit).toBeNull();
    expect(probe.current?.state.rightTrayPinned).toBe(false);
  });

  it('updateState keeps the three unit references independent', () => {
    // Gate 4 invariant: setting selectedUnit MUST NOT touch activeUnit
    // or inspectedUnit. PR-A's createDefaultShellState shape pinned
    // this at the type level; PR-C confirms it through the mutator.
    const probe: {
      current: ReturnType<typeof useTacticalShell> | null;
    } = { current: null };

    render(
      <TacticalCommandShell viewerPlayerId="player-1">
        <ProbeState probe={probe} />
      </TacticalCommandShell>,
    );

    act(() => {
      probe.current?.updateState({ selectedUnit: 'unit-a' });
    });
    expect(probe.current?.state.selectedUnit).toBe('unit-a');
    expect(probe.current?.state.activeUnit).toBeNull();
    expect(probe.current?.state.inspectedUnit).toBeNull();

    act(() => {
      probe.current?.updateState({ activeUnit: 'unit-b' });
    });
    expect(probe.current?.state.selectedUnit).toBe('unit-a');
    expect(probe.current?.state.activeUnit).toBe('unit-b');
    expect(probe.current?.state.inspectedUnit).toBeNull();

    act(() => {
      probe.current?.updateState({ inspectedUnit: 'unit-c' });
    });
    expect(probe.current?.state.selectedUnit).toBe('unit-a');
    expect(probe.current?.state.activeUnit).toBe('unit-b');
    expect(probe.current?.state.inspectedUnit).toBe('unit-c');
  });
});

describe('TacticalCommandShell — PR-C: per-match sessionStorage persistence', () => {
  function ProbeState({
    probe,
  }: {
    probe: { current: ReturnType<typeof useTacticalShell> | null };
  }): null {
    probe.current = useTacticalShell();
    return null;
  }

  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('writes tray slice to sessionStorage when updateState mutates it', () => {
    const probe: {
      current: ReturnType<typeof useTacticalShell> | null;
    } = { current: null };

    render(
      <TacticalCommandShell viewerPlayerId="player-1" sessionId="match-42">
        <ProbeState probe={probe} />
      </TacticalCommandShell>,
    );

    act(() => {
      probe.current?.updateState({
        leftTrayCollapsed: true,
        rightTrayPinned: true,
        bottomDockActiveTab: 'weapons',
      });
    });

    const raw = window.sessionStorage.getItem('tactical-shell:match-42');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw ?? '{}') as Record<string, unknown>;
    expect(parsed.leftTrayCollapsed).toBe(true);
    expect(parsed.rightTrayPinned).toBe(true);
    expect(parsed.bottomDockActiveTab).toBe('weapons');
  });

  it('hydrates tray state from sessionStorage on mount', () => {
    window.sessionStorage.setItem(
      'tactical-shell:match-42',
      JSON.stringify({
        leftTrayCollapsed: true,
        rightTrayPinned: true,
        bottomDockActiveTab: 'movement',
      }),
    );

    const probe: {
      current: ReturnType<typeof useTacticalShell> | null;
    } = { current: null };

    render(
      <TacticalCommandShell viewerPlayerId="player-1" sessionId="match-42">
        <ProbeState probe={probe} />
      </TacticalCommandShell>,
    );

    expect(probe.current?.state.leftTrayCollapsed).toBe(true);
    expect(probe.current?.state.rightTrayPinned).toBe(true);
    expect(probe.current?.state.bottomDockActiveTab).toBe('movement');
  });

  it('does NOT persist unit-reference triple (runtime-only fields)', () => {
    // The selected/active/inspected unit triple intentionally re-derives
    // from interactive-session state on mount; persisting it across a
    // reload would stale-bind to units that no longer exist (destroyed,
    // withdrawn, replaced via campaign roster change).
    const probe: {
      current: ReturnType<typeof useTacticalShell> | null;
    } = { current: null };

    render(
      <TacticalCommandShell viewerPlayerId="player-1" sessionId="match-42">
        <ProbeState probe={probe} />
      </TacticalCommandShell>,
    );

    act(() => {
      probe.current?.updateState({
        selectedUnit: 'unit-a',
        activeUnit: 'unit-b',
        inspectedUnit: 'unit-c',
        leftTrayCollapsed: true,
      });
    });

    const raw = window.sessionStorage.getItem('tactical-shell:match-42');
    const parsed = JSON.parse(raw ?? '{}') as Record<string, unknown>;
    expect(parsed.leftTrayCollapsed).toBe(true);
    expect(parsed.selectedUnit).toBeUndefined();
    expect(parsed.activeUnit).toBeUndefined();
    expect(parsed.inspectedUnit).toBeUndefined();
  });

  it('does NOT touch sessionStorage when sessionId is null', () => {
    const probe: {
      current: ReturnType<typeof useTacticalShell> | null;
    } = { current: null };

    render(
      <TacticalCommandShell viewerPlayerId="player-1">
        <ProbeState probe={probe} />
      </TacticalCommandShell>,
    );

    act(() => {
      probe.current?.updateState({ leftTrayCollapsed: true });
    });

    // Storage should be empty — no key was written.
    expect(window.sessionStorage.length).toBe(0);
  });

  it('scopes persistence per-session: changes to match-A do not leak into match-B', () => {
    const probeA: {
      current: ReturnType<typeof useTacticalShell> | null;
    } = { current: null };

    const { unmount } = render(
      <TacticalCommandShell viewerPlayerId="player-1" sessionId="match-A">
        <ProbeState probe={probeA} />
      </TacticalCommandShell>,
    );

    act(() => {
      probeA.current?.updateState({ leftTrayCollapsed: true });
    });

    unmount();

    // Mount a different session — should start with defaults, not
    // pick up match-A's collapsed=true.
    const probeB: {
      current: ReturnType<typeof useTacticalShell> | null;
    } = { current: null };

    render(
      <TacticalCommandShell viewerPlayerId="player-1" sessionId="match-B">
        <ProbeState probe={probeB} />
      </TacticalCommandShell>,
    );

    expect(probeB.current?.state.leftTrayCollapsed).toBe(false);
  });

  it('tolerates malformed sessionStorage payload gracefully', () => {
    window.sessionStorage.setItem('tactical-shell:match-42', 'not-valid-json');

    const probe: {
      current: ReturnType<typeof useTacticalShell> | null;
    } = { current: null };

    render(
      <TacticalCommandShell viewerPlayerId="player-1" sessionId="match-42">
        <ProbeState probe={probe} />
      </TacticalCommandShell>,
    );

    // Falls back to defaults — does not throw.
    expect(probe.current?.state.leftTrayCollapsed).toBe(false);
    expect(probe.current?.state.rightTrayPinned).toBe(false);
  });
});
