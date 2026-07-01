import * as H from './TacticalCommandShell.test-helpers';

const {
  ShellSlot,
  TacticalCommandShell,
  act,
  render,
  renderHook,
  useShellSlotRegistryContext,
  useTacticalShell,
} = H;
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
        // Set the NON-default value (false) so the persist write-through
        // actually fires — `true` is the collapsed-by-default seed and a
        // no-op update is intentionally not written.
        leftTrayCollapsed: false,
      });
    });

    const raw = window.sessionStorage.getItem('tactical-shell:match-42');
    const parsed = JSON.parse(raw ?? '{}') as Record<string, unknown>;
    expect(parsed.leftTrayCollapsed).toBe(false);
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

    // Match-A explicitly sets the NON-default value (false = expanded) so
    // the leak-check has a real signal: if match-B picked up match-A's
    // state it would read false; a clean per-session default reads true.
    act(() => {
      probeA.current?.updateState({ leftTrayCollapsed: false });
    });

    unmount();

    // Mount a different session — should start with defaults, not
    // pick up match-A's expanded=false.
    const probeB: {
      current: ReturnType<typeof useTacticalShell> | null;
    } = { current: null };

    render(
      <TacticalCommandShell viewerPlayerId="player-1" sessionId="match-B">
        <ProbeState probe={probeB} />
      </TacticalCommandShell>,
    );

    expect(probeB.current?.state.leftTrayCollapsed).toBe(true);
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
    expect(probe.current?.state.leftTrayCollapsed).toBe(true);
    expect(probe.current?.state.rightTrayPinned).toBe(false);
  });
});
