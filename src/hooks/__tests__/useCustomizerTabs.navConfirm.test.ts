/**
 * useCustomizerTabs — navigation-confirm behavior tests
 *
 * Covers:
 *   Spec § Requirement: Tab Dirty Tracking
 *     – Scenario: Dirty marker appears on edit
 *     – Scenario: Navigation warning: leaving a dirty tab prompts confirm
 *
 * @spec openspec/specs/multi-unit-tabs/spec.md
 */

import {
  act,
  cleanup,
  fireEvent,
  renderHook,
  screen,
} from '@testing-library/react';
import React from 'react';

import { CustomizerConfirmationProvider } from '@/components/customizer/dialogs/CustomizerConfirmationProvider';
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

function ConfirmationWrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(CustomizerConfirmationProvider, {
    scope: { unitId: 'unit-a', unitType: 'BattleMech' },
    children,
  });
}

const originalShow = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  'showModal',
);
const originalClose = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  'close',
);
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    },
  });
});
afterAll(() => {
  for (const [key, descriptor] of [
    ['showModal', originalShow],
    ['close', originalClose],
  ] as const) {
    if (descriptor)
      Object.defineProperty(HTMLDialogElement.prototype, key, descriptor);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, key);
  }
});
afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});

function renderTabsHook(initialTabId = 'overview') {
  return renderHook(
    () => useCustomizerTabs({ specs: SPECS, state: {}, initialTabId }),
    { wrapper: ConfirmationWrapper },
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
  it('setErrorTabs replaces the error map and exposes rule codes per tab', () => {
    const { result } = renderTabsHook();
    act(() =>
      result.current.setErrorTabs(
        new Map([
          ['armor', 'VAL-MECH-ARMOR-MAX'],
          ['equipment', 'VAL-MECH-EQUIP-WEIGHT'],
        ]),
      ),
    );
    expect(result.current.errorTabs.has('armor')).toBe(true);
    expect(result.current.errorTabs.has('equipment')).toBe(true);
    // The value for each entry is the rule code — this is the data the tab
    // bar renders as an ARIA label.
    expect(result.current.errorTabs.get('armor')).toBe('VAL-MECH-ARMOR-MAX');
    expect(result.current.errorTabs.get('equipment')).toBe(
      'VAL-MECH-EQUIP-WEIGHT',
    );
  });

  it('setErrorTabs with an empty map clears all errors', () => {
    const { result } = renderTabsHook();
    act(() =>
      result.current.setErrorTabs(new Map([['armor', 'VAL-MECH-ARMOR-MAX']])),
    );
    act(() => result.current.setErrorTabs(new Map()));
    expect(result.current.errorTabs.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Navigation confirm — Task 9.2
// ---------------------------------------------------------------------------

describe('useCustomizerTabs — navigation confirm (Task 9.2)', () => {
  beforeEach(() => {
    jest.spyOn(window, 'confirm').mockImplementation(() => {
      throw new Error('Native confirmation is inaccessible');
    });
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

  it('opens an app dialog without switching when navigating away from a dirty tab', () => {
    const { result } = renderTabsHook('overview');
    act(() => result.current.markDirty('overview'));
    act(() => result.current.setActiveTab('armor'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(result.current.activeTab).toBe('overview');
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it('keeps the dirty marker after a canceled request', () => {
    const { result } = renderTabsHook('overview');
    act(() => result.current.markDirty('overview'));
    act(() => result.current.setActiveTab('armor'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(result.current.dirtyTabs.has('overview')).toBe(true);
    expect(result.current.activeTab).toBe('overview');
  });

  it('proceeds to the new tab when user confirms', () => {
    const { result } = renderTabsHook('overview');
    act(() => result.current.markDirty('overview'));
    act(() => result.current.setActiveTab('armor'));
    fireEvent.click(screen.getByRole('button', { name: 'Leave tab' }));
    expect(result.current.activeTab).toBe('armor');
  });

  it('stays on the current tab when user cancels confirm', () => {
    const { result } = renderTabsHook('overview');
    act(() => result.current.markDirty('overview'));
    act(() => result.current.setActiveTab('armor'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
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

  it('refuses pending approval when a successful save clears source dirty state', () => {
    const { result } = renderTabsHook();
    act(() => result.current.markDirty('overview'));
    act(() => result.current.setActiveTab('armor'));
    act(() => result.current.clearDirty('overview'));
    fireEvent.click(screen.getByRole('button', { name: 'Leave tab' }));
    expect(result.current.activeTab).toBe('overview');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('refuses an old approval after accepted navigation changes the active source', () => {
    const { result } = renderTabsHook();
    act(() => result.current.markDirty('overview'));
    act(() => result.current.setActiveTab('armor'));
    act(() => result.current.clearDirty('overview'));
    act(() => result.current.setActiveTab('equipment'));
    fireEvent.click(screen.getByRole('button', { name: 'Leave tab' }));
    expect(result.current.activeTab).toBe('equipment');
  });

  it('rejects a second pending destination while preserving the first request', () => {
    const { result } = renderTabsHook();
    act(() => result.current.markDirty('overview'));
    act(() => result.current.setActiveTab('armor'));
    act(() => result.current.setActiveTab('equipment'));
    fireEvent.click(screen.getByRole('button', { name: 'Leave tab' }));
    expect(result.current.activeTab).toBe('armor');
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
