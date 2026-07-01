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
    // Desktop lens tray defaults to collapsed (map reclaims the column).
    expect(probe.current?.state.leftTrayCollapsed).toBe(true);
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
