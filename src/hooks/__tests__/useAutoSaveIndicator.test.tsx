/**
 * Tests for useAutoSaveIndicator.
 *
 * Regression focus: the hook is mounted by CustomizerWithRouter, which sits
 * ABOVE the UnitStoreProvider boundary. On non-mech tabs there is no provider,
 * so the hook must read UnitStoreContext as nullable and no-op rather than
 * throw (the pre-existing /customizer crash — audit
 * .audit/2026-05-14-customizer-armor-diagram-visual-audit.md Finding 1).
 */

import { renderHook, act } from '@testing-library/react';
import React from 'react';

import { useAutoSaveIndicator } from '@/hooks/useAutoSaveIndicator';
import { createNewUnitStore, UnitStoreContext } from '@/stores/useUnitStore';
import { TechBase } from '@/types/enums/TechBase';

const showToastMock = jest.fn();
jest.mock('@/components/shared/Toast', () => ({
  useToast: () => ({ showToast: showToastMock }),
}));

function makeStore() {
  return createNewUnitStore({
    name: 'Test Mech TST-1',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  });
}

beforeEach(() => {
  showToastMock.mockClear();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe('useAutoSaveIndicator', () => {
  it('does not throw when rendered with NO UnitStoreProvider ancestor', () => {
    // The pre-existing /customizer crash: non-mech tabs have no provider.
    expect(() => {
      renderHook(() => useAutoSaveIndicator());
    }).not.toThrow();
  });

  it('does not fire a toast when there is no store in context', () => {
    renderHook(() => useAutoSaveIndicator());
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(showToastMock).not.toHaveBeenCalled();
  });

  it('fires a "Saved" toast after a debounce when the store records a modification', () => {
    const store = makeStore();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <UnitStoreContext.Provider value={store}>
        {children}
      </UnitStoreContext.Provider>
    );
    renderHook(() => useAutoSaveIndicator(), { wrapper });

    act(() => {
      store.setState({ lastModifiedAt: Date.now() });
    });
    // Toast is debounced 500ms — not fired immediately.
    expect(showToastMock).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Saved', variant: 'success' }),
    );
  });

  it('does not fire a toast when the store has no modification', () => {
    const store = makeStore();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <UnitStoreContext.Provider value={store}>
        {children}
      </UnitStoreContext.Provider>
    );
    renderHook(() => useAutoSaveIndicator(), { wrapper });

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(showToastMock).not.toHaveBeenCalled();
  });
});
