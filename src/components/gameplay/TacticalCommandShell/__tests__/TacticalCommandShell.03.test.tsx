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
