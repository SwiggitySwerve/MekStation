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

    render(
      <TacticalCommandShell viewerPlayerId="player-1">
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
