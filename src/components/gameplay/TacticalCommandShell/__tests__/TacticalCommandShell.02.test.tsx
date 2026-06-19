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
