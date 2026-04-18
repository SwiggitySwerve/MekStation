/**
 * useCustomizerTabs — navigation-confirm behavior tests
 *
 * Covers:
 *   Spec § Requirement: Tab Dirty Tracking
 *     – Scenario: Dirty marker appears on edit
 *     – Scenario: Navigation warning: leaving a dirty tab prompts confirm
 *
 * @spec openspec/changes/add-per-type-customizer-tabs/specs/multi-unit-tabs/spec.md
 */

import { act, renderHook } from '@testing-library/react';

import { TabSpec } from '@/components/customizer/shared/TabSpec';

import { useCustomizerTabs } from '../useCustomizerTabs';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// Minimal stub components — the hook only cares about ids, not components
const STUB = () => null;

const SPECS: TabSpec[] = [
  { id: 'overview', label: 'Overview', component: STUB },
  { id: 'armor', label: 'Armor', component: STUB },
  { id: 'equipment', label: 'Equipment', component: STUB },
];

function renderTabsHook(initialTabId = 'overview') {
  return renderHook(() =>
    useCustomizerTabs({ specs: SPECS, state: {}, initialTabId }),
  );
}

// ---------------------------------------------------------------------------
// Basic state
// ---------------------------------------------------------------------------

describe('useCustomizerTabs — initial state', () => {
  it('returns the initial active tab', () => {
    const { result } = renderTabsHook('armor');
    expect(result.current.activeTab).toBe('armor');
  });

  it('starts with empty dirtyTabs', () => {
    const { result } = renderTabsHook();
    expect(result.current.dirtyTabs.size).toBe(0);
  });

  it('starts with empty errorTabs', () => {
    const { result } = renderTabsHook();
    expect(result.current.errorTabs.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// markDirty / clearDirty / clearAllDirty
// ---------------------------------------------------------------------------

describe('useCustomizerTabs — dirty tracking', () => {
  it('markDirty adds a tab id to dirtyTabs', () => {
    const { result } = renderTabsHook();
    act(() => result.current.markDirty('armor'));
    expect(result.current.dirtyTabs.has('armor')).toBe(true);
  });

  it('markDirty is idempotent for the same tab', () => {
    const { result } = renderTabsHook();
    act(() => {
      result.current.markDirty('armor');
      result.current.markDirty('armor');
    });
    expect(result.current.dirtyTabs.size).toBe(1);
  });

  it('clearDirty removes a tab id from dirtyTabs', () => {
    const { result } = renderTabsHook();
    act(() => result.current.markDirty('armor'));
    act(() => result.current.clearDirty('armor'));
    expect(result.current.dirtyTabs.has('armor')).toBe(false);
  });

  it('clearAllDirty empties the entire set', () => {
    const { result } = renderTabsHook();
    act(() => {
      result.current.markDirty('armor');
      result.current.markDirty('equipment');
    });
    act(() => result.current.clearAllDirty());
    expect(result.current.dirtyTabs.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// setErrorTabs
// ---------------------------------------------------------------------------

describe('useCustomizerTabs — error tracking', () => {
  it('setErrorTabs replaces the error set', () => {
    const { result } = renderTabsHook();
    act(() => result.current.setErrorTabs(new Set(['armor', 'equipment'])));
    expect(result.current.errorTabs.has('armor')).toBe(true);
    expect(result.current.errorTabs.has('equipment')).toBe(true);
  });

  it('setErrorTabs with empty set clears all errors', () => {
    const { result } = renderTabsHook();
    act(() => result.current.setErrorTabs(new Set(['armor'])));
    act(() => result.current.setErrorTabs(new Set()));
    expect(result.current.errorTabs.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Navigation confirm — Task 9.2
// ---------------------------------------------------------------------------

describe('useCustomizerTabs — navigation confirm (Task 9.2)', () => {
  beforeEach(() => {
    // Provide a clean window.confirm stub for each test
    jest.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('navigates without confirm when the current tab is clean', () => {
    const { result } = renderTabsHook('overview');
    act(() => result.current.setActiveTab('armor'));
    expect(window.confirm).not.toHaveBeenCalled();
    expect(result.current.activeTab).toBe('armor');
  });

  it('shows confirm when navigating away from a dirty tab', () => {
    const { result } = renderTabsHook('overview');
    act(() => result.current.markDirty('overview'));
    act(() => result.current.setActiveTab('armor'));
    expect(window.confirm).toHaveBeenCalledTimes(1);
  });

  it('confirm message mentions unsaved changes', () => {
    const { result } = renderTabsHook('overview');
    act(() => result.current.markDirty('overview'));
    act(() => result.current.setActiveTab('armor'));
    const [message] = (window.confirm as jest.Mock).mock.calls[0];
    expect(message).toMatch(/unsaved changes/i);
  });

  it('proceeds to the new tab when user confirms', () => {
    (window.confirm as jest.Mock).mockReturnValue(true);
    const { result } = renderTabsHook('overview');
    act(() => result.current.markDirty('overview'));
    act(() => result.current.setActiveTab('armor'));
    expect(result.current.activeTab).toBe('armor');
  });

  it('stays on the current tab when user cancels confirm', () => {
    (window.confirm as jest.Mock).mockReturnValue(false);
    const { result } = renderTabsHook('overview');
    act(() => result.current.markDirty('overview'));
    act(() => result.current.setActiveTab('armor'));
    expect(result.current.activeTab).toBe('overview');
  });

  it('does not show confirm when setActiveTab is called with the current tab id', () => {
    const { result } = renderTabsHook('overview');
    act(() => result.current.markDirty('overview'));
    act(() => result.current.setActiveTab('overview'));
    expect(window.confirm).not.toHaveBeenCalled();
    expect(result.current.activeTab).toBe('overview');
  });

  it('does not show confirm when navigating to a non-visible tab id', () => {
    const { result } = renderTabsHook('overview');
    act(() => result.current.markDirty('overview'));
    act(() => result.current.setActiveTab('nonexistent'));
    expect(window.confirm).not.toHaveBeenCalled();
    expect(result.current.activeTab).toBe('overview');
  });
});

// ---------------------------------------------------------------------------
// activeTabIsHidden
// ---------------------------------------------------------------------------

describe('useCustomizerTabs — activeTabIsHidden', () => {
  it('is false when the active tab is visible', () => {
    const { result } = renderTabsHook('overview');
    expect(result.current.activeTabIsHidden).toBe(false);
  });
});
