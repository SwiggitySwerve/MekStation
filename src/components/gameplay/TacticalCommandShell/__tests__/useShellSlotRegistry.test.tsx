/**
 * Tests for useShellSlotRegistry.
 *
 * Covers the "one primary home" invariant from the shell spec's
 * `Combat facts have one primary home` scenario, plus the
 * register / unregister / subscribe contract.
 *
 * @module components/gameplay/TacticalCommandShell/__tests__/useShellSlotRegistry.test
 */

import { renderHook, act } from '@testing-library/react';

import type { ISlotOwner } from '@/types/gameplay/TacticalShellInterfaces';

import { useShellSlotRegistry } from '../useShellSlotRegistry';

function makeOwner(ownerId: string, primary: boolean): ISlotOwner {
  return { ownerId, primary, modes: [] };
}

describe('useShellSlotRegistry', () => {
  it('registers a primary owner and returns it from getOwner', () => {
    const { result } = renderHook(() => useShellSlotRegistry());

    act(() => {
      result.current.register('top-band', makeOwner('PhaseBanner', true));
    });

    const owner = result.current.getOwner('top-band');
    expect(owner).not.toBeNull();
    expect(owner?.ownerId).toBe('PhaseBanner');
    expect(owner?.primary).toBe(true);
  });

  it('returns null from getOwner for an unregistered slot', () => {
    const { result } = renderHook(() => useShellSlotRegistry());

    expect(result.current.getOwner('feed')).toBeNull();
  });

  it('lets a primary owner replace any prior owner (primary or not)', () => {
    const { result } = renderHook(() => useShellSlotRegistry());

    act(() => {
      result.current.register('right-tray', makeOwner('PrevPrimary', true));
    });

    act(() => {
      result.current.register('right-tray', makeOwner('NewPrimary', true));
    });

    expect(result.current.getOwner('right-tray')?.ownerId).toBe('NewPrimary');
  });

  it('drops a non-primary registration when a primary already holds the slot', () => {
    // Defends the spec's "each fact SHALL have exactly one primary slot
    // owner" invariant — a downstream component that tries to register
    // itself as secondary CANNOT take ownership.
    const { result } = renderHook(() => useShellSlotRegistry());

    act(() => {
      result.current.register(
        'bottom-dock',
        makeOwner('TacticalActionDock', true),
      );
    });

    act(() => {
      result.current.register('bottom-dock', makeOwner('SecondaryPeek', false));
    });

    expect(result.current.getOwner('bottom-dock')?.ownerId).toBe(
      'TacticalActionDock',
    );
  });

  it('allows a non-primary owner to take an empty slot', () => {
    // A peek surface CAN claim a slot if nothing primary is there yet —
    // the primary registration that arrives later will replace it.
    const { result } = renderHook(() => useShellSlotRegistry());

    act(() => {
      result.current.register('left-tray', makeOwner('PeekOnly', false));
    });

    expect(result.current.getOwner('left-tray')?.ownerId).toBe('PeekOnly');
    expect(result.current.getOwner('left-tray')?.primary).toBe(false);

    act(() => {
      result.current.register('left-tray', makeOwner('LensTray', true));
    });

    expect(result.current.getOwner('left-tray')?.ownerId).toBe('LensTray');
    expect(result.current.getOwner('left-tray')?.primary).toBe(true);
  });

  it('unregister only removes the matching ownerId', () => {
    // Defends against stale unmount-order cleanup: a component that
    // unmounts AFTER being replaced by a primary must not yank the
    // primary's registration on its way out.
    const { result } = renderHook(() => useShellSlotRegistry());

    act(() => {
      result.current.register('feed', makeOwner('EventLog', true));
    });

    // Stale cleanup attempt by an unrelated owner — must be a no-op.
    act(() => {
      result.current.unregister('feed', 'SomethingElse');
    });
    expect(result.current.getOwner('feed')?.ownerId).toBe('EventLog');

    // Real cleanup — clears the slot.
    act(() => {
      result.current.unregister('feed', 'EventLog');
    });
    expect(result.current.getOwner('feed')).toBeNull();
  });

  it('listSlots returns only slots with current owners', () => {
    const { result } = renderHook(() => useShellSlotRegistry());

    expect(result.current.listSlots()).toEqual([]);

    act(() => {
      result.current.register('map-center', makeOwner('HexMapDisplay', true));
      result.current.register('top-band', makeOwner('PhaseBanner', true));
    });

    const slots = result.current.listSlots();
    expect(slots).toContain('map-center');
    expect(slots).toContain('top-band');
    expect(slots).toHaveLength(2);
  });

  it('notifies subscribers on register and unregister', () => {
    const { result } = renderHook(() => useShellSlotRegistry());
    const listener = jest.fn();

    let unsubscribe = () => {};
    act(() => {
      unsubscribe = result.current.subscribe(listener);
    });

    act(() => {
      result.current.register(
        'minimap-cluster',
        makeOwner('MapOverlayChildren', true),
      );
    });
    expect(listener).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.unregister('minimap-cluster', 'MapOverlayChildren');
    });
    expect(listener).toHaveBeenCalledTimes(2);

    act(() => {
      unsubscribe();
    });

    act(() => {
      result.current.register('feed', makeOwner('Anything', true));
    });
    // listener was unsubscribed before the third register; count stays at 2.
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('drops a non-primary registration silently without notifying', () => {
    // No state change means no subscriber notification — important so
    // shell re-renders are driven only by real ownership changes.
    const { result } = renderHook(() => useShellSlotRegistry());
    const listener = jest.fn();

    act(() => {
      result.current.register('top-band', makeOwner('PhaseBanner', true));
      result.current.subscribe(listener);
    });

    act(() => {
      result.current.register('top-band', makeOwner('PeekAttempt', false));
    });

    expect(listener).not.toHaveBeenCalled();
    expect(result.current.getOwner('top-band')?.ownerId).toBe('PhaseBanner');
  });

  it('keeps the registry handle identity-stable across re-renders', () => {
    // Important: a fresh handle on every render would mean every
    // subscribe/unsubscribe cycle in a slot owner would tear down and
    // rebuild every render, defeating the registry's whole purpose.
    const { result, rerender } = renderHook(() => useShellSlotRegistry());

    const handleFirst = result.current;
    rerender();
    rerender();

    expect(result.current).toBe(handleFirst);
  });

  it('survives a listener that unsubscribes during dispatch', () => {
    // The dispatcher snapshots the listener set before iterating so a
    // listener removing itself can't desync the loop.
    const { result } = renderHook(() => useShellSlotRegistry());
    const survivor = jest.fn();
    const selfRemover = jest.fn();

    let removeSelf = () => {};
    act(() => {
      removeSelf = result.current.subscribe(() => {
        selfRemover();
        removeSelf();
      });
      result.current.subscribe(survivor);
    });

    act(() => {
      result.current.register('top-band', makeOwner('PhaseBanner', true));
    });

    expect(selfRemover).toHaveBeenCalledTimes(1);
    expect(survivor).toHaveBeenCalledTimes(1);

    // Second dispatch: the self-remover is gone; only the survivor fires.
    act(() => {
      result.current.unregister('top-band', 'PhaseBanner');
    });
    expect(selfRemover).toHaveBeenCalledTimes(1);
    expect(survivor).toHaveBeenCalledTimes(2);
  });
});
