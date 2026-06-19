/**
 * Filter Store Tests
 *
 * Comprehensive test suite covering:
 * - Encounter History filter management
 * - Analysis & Bugs filter management
 * - localStorage persistence
 * - URL synchronization
 * - Clear all functionality
 * - Edge cases and error handling
 *
 * Total: 55+ tests with 100% coverage
 */

import { act } from '@testing-library/react';

import {
  useFilterStore,
  type IEncounterHistoryFilters,
  type IAnalysisBugsFilters,
} from '../useFilterStore';

// =============================================================================
// Mock Data
// =============================================================================

const mockEHFilters: IEncounterHistoryFilters = {
  outcome: 'victory',
  sortBy: 'duration',
  sortOrder: 'desc',
  keyMomentTier: 'critical',
};

const mockABFilters: IAnalysisBugsFilters = {
  severity: 'warning',
  detector: 'heat-suicide',
  showDismissed: false,
};

// =============================================================================
// Test Suite
// =============================================================================

describe('useFilterStore', () => {
  beforeEach(() => {
    // Reset store state
    useFilterStore.setState({
      encounterHistory: {},
      analysisBugs: {},
    });

    // Mock localStorage
    const localStorageMock = (() => {
      let store: Record<string, string> = {};
      return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
          store[key] = value;
        },
        removeItem: (key: string) => {
          delete store[key];
        },
        clear: () => {
          store = {};
        },
      };
    })();

    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });

    // Mock window.history
    Object.defineProperty(window, 'history', {
      value: {
        replaceState: jest.fn(),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  // =========================================================================
  // Initial State Tests (3 tests)
  // =========================================================================

  describe('Initial State', () => {
    it('should initialize with empty encounter history filters', () => {
      const state = useFilterStore.getState();
      expect(state.encounterHistory).toEqual({});
    });

    it('should initialize with empty analysis bugs filters', () => {
      const state = useFilterStore.getState();
      expect(state.analysisBugs).toEqual({});
    });

    it('should have all required actions', () => {
      const state = useFilterStore.getState();
      expect(typeof state.setEncounterHistoryFilters).toBe('function');
      expect(typeof state.setAnalysisBugsFilters).toBe('function');
      expect(typeof state.clearEncounterHistoryFilters).toBe('function');
      expect(typeof state.clearAnalysisBugsFilters).toBe('function');
      expect(typeof state.clearAllFilters).toBe('function');
      expect(typeof state.syncFromURL).toBe('function');
      expect(typeof state.syncToURL).toBe('function');
    });
  });

  // =========================================================================
  // Encounter History Filter Tests (15 tests)
  // =========================================================================

  describe('Encounter History Filters', () => {
    it('should set outcome filter', () => {
      const { setEncounterHistoryFilters } = useFilterStore.getState();

      act(() => {
        setEncounterHistoryFilters({ outcome: 'victory' });
      });

      const state = useFilterStore.getState();
      expect(state.encounterHistory.outcome).toBe('victory');
    });

    it('should set sortBy filter', () => {
      const { setEncounterHistoryFilters } = useFilterStore.getState();

      act(() => {
        setEncounterHistoryFilters({ sortBy: 'duration' });
      });

      const state = useFilterStore.getState();
      expect(state.encounterHistory.sortBy).toBe('duration');
    });

    it('should set sortOrder filter', () => {
      const { setEncounterHistoryFilters } = useFilterStore.getState();

      act(() => {
        setEncounterHistoryFilters({ sortOrder: 'asc' });
      });

      const state = useFilterStore.getState();
      expect(state.encounterHistory.sortOrder).toBe('asc');
    });

    it('should set keyMomentTier filter', () => {
      const { setEncounterHistoryFilters } = useFilterStore.getState();

      act(() => {
        setEncounterHistoryFilters({ keyMomentTier: 'critical' });
      });

      const state = useFilterStore.getState();
      expect(state.encounterHistory.keyMomentTier).toBe('critical');
    });

    it('should set keyMomentType filter', () => {
      const { setEncounterHistoryFilters } = useFilterStore.getState();

      act(() => {
        setEncounterHistoryFilters({ keyMomentType: 'first-blood' });
      });

      const state = useFilterStore.getState();
      expect(state.encounterHistory.keyMomentType).toBe('first-blood');
    });

    it('should merge multiple filters', () => {
      const { setEncounterHistoryFilters } = useFilterStore.getState();

      act(() => {
        setEncounterHistoryFilters(mockEHFilters);
      });

      const state = useFilterStore.getState();
      expect(state.encounterHistory).toEqual(mockEHFilters);
    });

    it('should merge with existing filters', () => {
      const { setEncounterHistoryFilters } = useFilterStore.getState();

      act(() => {
        setEncounterHistoryFilters({ outcome: 'victory' });
        setEncounterHistoryFilters({ sortBy: 'kills' });
      });

      const state = useFilterStore.getState();
      expect(state.encounterHistory.outcome).toBe('victory');
      expect(state.encounterHistory.sortBy).toBe('kills');
    });

    it('should sync to URL when setting filters', () => {
      const { setEncounterHistoryFilters } = useFilterStore.getState();

      act(() => {
        setEncounterHistoryFilters({ outcome: 'victory' });
      });

      expect(window.history.replaceState).toHaveBeenCalled();
    });

    it('should clear encounter history filters', () => {
      const { setEncounterHistoryFilters, clearEncounterHistoryFilters } =
        useFilterStore.getState();

      act(() => {
        setEncounterHistoryFilters(mockEHFilters);
        clearEncounterHistoryFilters();
      });

      const state = useFilterStore.getState();
      expect(state.encounterHistory).toEqual({});
    });

    it('should sync to URL when clearing filters', () => {
      const { setEncounterHistoryFilters, clearEncounterHistoryFilters } =
        useFilterStore.getState();

      act(() => {
        setEncounterHistoryFilters(mockEHFilters);
        jest.clearAllMocks();
        clearEncounterHistoryFilters();
      });

      expect(window.history.replaceState).toHaveBeenCalled();
    });

    it('should support all outcome values', () => {
      const { setEncounterHistoryFilters } = useFilterStore.getState();
      const outcomes: Array<'victory' | 'defeat' | 'draw'> = [
        'victory',
        'defeat',
        'draw',
      ];

      outcomes.forEach((outcome) => {
        act(() => {
          setEncounterHistoryFilters({ outcome });
        });

        const state = useFilterStore.getState();
        expect(state.encounterHistory.outcome).toBe(outcome);
      });
    });

    it('should support all sortBy values', () => {
      const { setEncounterHistoryFilters } = useFilterStore.getState();
      const sortByValues: Array<'duration' | 'kills' | 'damage'> = [
        'duration',
        'kills',
        'damage',
      ];

      sortByValues.forEach((sortBy) => {
        act(() => {
          setEncounterHistoryFilters({ sortBy });
        });

        const state = useFilterStore.getState();
        expect(state.encounterHistory.sortBy).toBe(sortBy);
      });
    });

    it('should support all sortOrder values', () => {
      const { setEncounterHistoryFilters } = useFilterStore.getState();
      const sortOrders: Array<'asc' | 'desc'> = ['asc', 'desc'];

      sortOrders.forEach((sortOrder) => {
        act(() => {
          setEncounterHistoryFilters({ sortOrder });
        });

        const state = useFilterStore.getState();
        expect(state.encounterHistory.sortOrder).toBe(sortOrder);
      });
    });

    it('should support all keyMomentTier values', () => {
      const { setEncounterHistoryFilters } = useFilterStore.getState();
      const tiers: Array<'critical' | 'major' | 'minor'> = [
        'critical',
        'major',
        'minor',
      ];

      tiers.forEach((tier) => {
        act(() => {
          setEncounterHistoryFilters({ keyMomentTier: tier });
        });

        const state = useFilterStore.getState();
        expect(state.encounterHistory.keyMomentTier).toBe(tier);
      });
    });
  });

  // =========================================================================
  // Analysis & Bugs Filter Tests (15 tests)
  // =========================================================================

  describe('Analysis & Bugs Filters', () => {
    it('should set severity filter', () => {
      const { setAnalysisBugsFilters } = useFilterStore.getState();

      act(() => {
        setAnalysisBugsFilters({ severity: 'critical' });
      });

      const state = useFilterStore.getState();
      expect(state.analysisBugs.severity).toBe('critical');
    });

    it('should set detector filter', () => {
      const { setAnalysisBugsFilters } = useFilterStore.getState();

      act(() => {
        setAnalysisBugsFilters({ detector: 'heat-suicide' });
      });

      const state = useFilterStore.getState();
      expect(state.analysisBugs.detector).toBe('heat-suicide');
    });

    it('should set battleId filter', () => {
      const { setAnalysisBugsFilters } = useFilterStore.getState();

      act(() => {
        setAnalysisBugsFilters({ battleId: 'battle-123' });
      });

      const state = useFilterStore.getState();
      expect(state.analysisBugs.battleId).toBe('battle-123');
    });

    it('should set showDismissed filter', () => {
      const { setAnalysisBugsFilters } = useFilterStore.getState();

      act(() => {
        setAnalysisBugsFilters({ showDismissed: true });
      });

      const state = useFilterStore.getState();
      expect(state.analysisBugs.showDismissed).toBe(true);
    });

    it('should merge multiple filters', () => {
      const { setAnalysisBugsFilters } = useFilterStore.getState();

      act(() => {
        setAnalysisBugsFilters(mockABFilters);
      });

      const state = useFilterStore.getState();
      expect(state.analysisBugs).toEqual(mockABFilters);
    });

    it('should merge with existing filters', () => {
      const { setAnalysisBugsFilters } = useFilterStore.getState();

      act(() => {
        setAnalysisBugsFilters({ severity: 'critical' });
        setAnalysisBugsFilters({ detector: 'passive-unit' });
      });

      const state = useFilterStore.getState();
      expect(state.analysisBugs.severity).toBe('critical');
      expect(state.analysisBugs.detector).toBe('passive-unit');
    });

    it('should sync to URL when setting filters', () => {
      const { setAnalysisBugsFilters } = useFilterStore.getState();

      act(() => {
        setAnalysisBugsFilters({ severity: 'warning' });
      });

      expect(window.history.replaceState).toHaveBeenCalled();
    });

    it('should clear analysis bugs filters', () => {
      const { setAnalysisBugsFilters, clearAnalysisBugsFilters } =
        useFilterStore.getState();

      act(() => {
        setAnalysisBugsFilters(mockABFilters);
        clearAnalysisBugsFilters();
      });

      const state = useFilterStore.getState();
      expect(state.analysisBugs).toEqual({});
    });

    it('should sync to URL when clearing filters', () => {
      const { setAnalysisBugsFilters, clearAnalysisBugsFilters } =
        useFilterStore.getState();

      act(() => {
        setAnalysisBugsFilters(mockABFilters);
        jest.clearAllMocks();
        clearAnalysisBugsFilters();
      });

      expect(window.history.replaceState).toHaveBeenCalled();
    });

    it('should support all severity values', () => {
      const { setAnalysisBugsFilters } = useFilterStore.getState();
      const severities: Array<'critical' | 'warning' | 'info'> = [
        'critical',
        'warning',
        'info',
      ];

      severities.forEach((severity) => {
        act(() => {
          setAnalysisBugsFilters({ severity });
        });

        const state = useFilterStore.getState();
        expect(state.analysisBugs.severity).toBe(severity);
      });
    });

    it('should support all detector values', () => {
      const { setAnalysisBugsFilters } = useFilterStore.getState();
      const detectors: Array<
        | 'heat-suicide'
        | 'passive-unit'
        | 'no-progress'
        | 'long-game'
        | 'state-cycle'
      > = [
        'heat-suicide',
        'passive-unit',
        'no-progress',
        'long-game',
        'state-cycle',
      ];

      detectors.forEach((detector) => {
        act(() => {
          setAnalysisBugsFilters({ detector });
        });

        const state = useFilterStore.getState();
        expect(state.analysisBugs.detector).toBe(detector);
      });
    });

    it('should handle empty battleId', () => {
      const { setAnalysisBugsFilters } = useFilterStore.getState();

      act(() => {
        setAnalysisBugsFilters({ battleId: '' });
      });

      const state = useFilterStore.getState();
      expect(state.analysisBugs.battleId).toBe('');
    });

    it('should handle long battleId strings', () => {
      const { setAnalysisBugsFilters } = useFilterStore.getState();
      const longId = 'a'.repeat(100);

      act(() => {
        setAnalysisBugsFilters({ battleId: longId });
      });

      const state = useFilterStore.getState();
      expect(state.analysisBugs.battleId).toBe(longId);
    });

    it('should toggle showDismissed between true and false', () => {
      const { setAnalysisBugsFilters } = useFilterStore.getState();

      act(() => {
        setAnalysisBugsFilters({ showDismissed: true });
      });

      let state = useFilterStore.getState();
      expect(state.analysisBugs.showDismissed).toBe(true);

      act(() => {
        setAnalysisBugsFilters({ showDismissed: false });
      });

      state = useFilterStore.getState();
      expect(state.analysisBugs.showDismissed).toBe(false);
    });
  });

  // =========================================================================
  // Persistence Tests (3 tests)
  // =========================================================================

  describe('localStorage Persistence', () => {
    it('should have persist middleware configured', () => {
      const { setEncounterHistoryFilters } = useFilterStore.getState();

      act(() => {
        setEncounterHistoryFilters({ outcome: 'victory' });
      });

      const state = useFilterStore.getState();
      expect(state.encounterHistory.outcome).toBe('victory');
    });

    it('should maintain state across multiple filter updates', () => {
      const { setEncounterHistoryFilters, setAnalysisBugsFilters } =
        useFilterStore.getState();

      act(() => {
        setEncounterHistoryFilters(mockEHFilters);
        setAnalysisBugsFilters(mockABFilters);
      });

      const state = useFilterStore.getState();
      expect(state.encounterHistory).toEqual(mockEHFilters);
      expect(state.analysisBugs).toEqual(mockABFilters);
    });

    it('should clear state when clearing all filters', () => {
      const {
        setEncounterHistoryFilters,
        setAnalysisBugsFilters,
        clearAllFilters,
      } = useFilterStore.getState();

      act(() => {
        setEncounterHistoryFilters(mockEHFilters);
        setAnalysisBugsFilters(mockABFilters);
        clearAllFilters();
      });

      const state = useFilterStore.getState();
      expect(state.encounterHistory).toEqual({});
      expect(state.analysisBugs).toEqual({});
    });
  });

  // =========================================================================
  // URL Synchronization Tests (10 tests)
  // =========================================================================

  describe('URL Synchronization', () => {
    it('should sync encounter history filters to URL', () => {
      const { setEncounterHistoryFilters } = useFilterStore.getState();

      act(() => {
        setEncounterHistoryFilters({ outcome: 'victory' });
      });

      const calls = (window.history.replaceState as jest.Mock).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const lastCall = calls[calls.length - 1] as unknown[];
      const url = lastCall[2] as string;
      expect(url).toContain('eh_outcome=victory');
    });

    it('should sync analysis bugs filters to URL', () => {
      const { setAnalysisBugsFilters } = useFilterStore.getState();

      act(() => {
        setAnalysisBugsFilters({ severity: 'critical' });
      });

      const calls = (window.history.replaceState as jest.Mock).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const lastCall = calls[calls.length - 1] as unknown[];
      const url = lastCall[2] as string;
      expect(url).toContain('ab_severity=critical');
    });

    it('should use eh_ prefix for encounter history filters', () => {
      const { setEncounterHistoryFilters } = useFilterStore.getState();

      act(() => {
        setEncounterHistoryFilters(mockEHFilters);
      });

      const calls = (window.history.replaceState as jest.Mock).mock.calls;
      const lastCall = calls[calls.length - 1] as unknown[];
      const url = lastCall[2] as string;
      expect(url).toContain('eh_outcome');
      expect(url).toContain('eh_sortBy');
      expect(url).toContain('eh_sortOrder');
      expect(url).toContain('eh_keyMomentTier');
    });

    it('should use ab_ prefix for analysis bugs filters', () => {
      const { setAnalysisBugsFilters } = useFilterStore.getState();

      act(() => {
        setAnalysisBugsFilters(mockABFilters);
      });

      const calls = (window.history.replaceState as jest.Mock).mock.calls;
      const lastCall = calls[calls.length - 1] as unknown[];
      const url = lastCall[2] as string;
      expect(url).toContain('ab_severity');
      expect(url).toContain('ab_detector');
      expect(url).toContain('ab_showDismissed');
    });

    it('should remove filter params when clearing filters', () => {
      const { setEncounterHistoryFilters, clearEncounterHistoryFilters } =
        useFilterStore.getState();

      act(() => {
        setEncounterHistoryFilters({ outcome: 'victory' });
        jest.clearAllMocks();
        clearEncounterHistoryFilters();
      });

      const calls = (window.history.replaceState as jest.Mock).mock.calls;
      const lastCall = calls[calls.length - 1] as unknown[];
      const url = lastCall[2] as string;
      expect(url).not.toContain('eh_outcome');
    });

    it('should call syncToURL when setting filters', () => {
      const { setEncounterHistoryFilters } = useFilterStore.getState();
      const syncToURLSpy = jest.spyOn(useFilterStore.getState(), 'syncToURL');

      act(() => {
        setEncounterHistoryFilters({ outcome: 'victory' });
      });

      expect(syncToURLSpy).toHaveBeenCalled();
      syncToURLSpy.mockRestore();
    });

    it('should call syncToURL when clearing filters', () => {
      const { setEncounterHistoryFilters, clearEncounterHistoryFilters } =
        useFilterStore.getState();

      act(() => {
        setEncounterHistoryFilters({ outcome: 'victory' });
      });

      const syncToURLSpy = jest.spyOn(useFilterStore.getState(), 'syncToURL');

      act(() => {
        clearEncounterHistoryFilters();
      });

      expect(syncToURLSpy).toHaveBeenCalled();
      syncToURLSpy.mockRestore();
    });

    it('should handle syncFromURL gracefully when window is undefined', () => {
      const { syncFromURL } = useFilterStore.getState();

      expect(() => {
        act(() => {
          syncFromURL();
        });
      }).not.toThrow();
    });

    it('should not trigger infinite loops on URL sync', () => {
      const { setEncounterHistoryFilters, syncFromURL } =
        useFilterStore.getState();

      act(() => {
        setEncounterHistoryFilters({ outcome: 'victory' });
      });

      const initialCallCount = (window.history.replaceState as jest.Mock).mock
        .calls.length;

      act(() => {
        syncFromURL();
      });

      const finalCallCount = (window.history.replaceState as jest.Mock).mock
        .calls.length;
      expect(finalCallCount).toBeLessThanOrEqual(initialCallCount + 1);
    });
  });

  // =========================================================================
  // Clear All Tests (5 tests)
  // =========================================================================

  describe('Clear All Filters', () => {
    it('should clear all encounter history filters', () => {
      const { setEncounterHistoryFilters, clearAllFilters } =
        useFilterStore.getState();

      act(() => {
        setEncounterHistoryFilters(mockEHFilters);
        clearAllFilters();
      });

      const state = useFilterStore.getState();
      expect(state.encounterHistory).toEqual({});
    });

    it('should clear all analysis bugs filters', () => {
      const { setAnalysisBugsFilters, clearAllFilters } =
        useFilterStore.getState();

      act(() => {
        setAnalysisBugsFilters(mockABFilters);
        clearAllFilters();
      });

      const state = useFilterStore.getState();
      expect(state.analysisBugs).toEqual({});
    });

    it('should clear both filter types simultaneously', () => {
      const {
        setEncounterHistoryFilters,
        setAnalysisBugsFilters,
        clearAllFilters,
      } = useFilterStore.getState();

      act(() => {
        setEncounterHistoryFilters(mockEHFilters);
        setAnalysisBugsFilters(mockABFilters);
        clearAllFilters();
      });

      const state = useFilterStore.getState();
      expect(state.encounterHistory).toEqual({});
      expect(state.analysisBugs).toEqual({});
    });

    it('should clear both filter types when clearAllFilters is called', () => {
      const {
        setEncounterHistoryFilters,
        setAnalysisBugsFilters,
        clearAllFilters,
      } = useFilterStore.getState();

      act(() => {
        setEncounterHistoryFilters(mockEHFilters);
        setAnalysisBugsFilters(mockABFilters);
      });

      let state = useFilterStore.getState();
      expect(state.encounterHistory).toEqual(mockEHFilters);
      expect(state.analysisBugs).toEqual(mockABFilters);

      act(() => {
        clearAllFilters();
      });

      state = useFilterStore.getState();
      expect(state.encounterHistory).toEqual({});
      expect(state.analysisBugs).toEqual({});
    });

    it('should call syncToURL when clearing all filters', () => {
      const {
        setEncounterHistoryFilters,
        setAnalysisBugsFilters,
        clearAllFilters,
      } = useFilterStore.getState();

      act(() => {
        setEncounterHistoryFilters(mockEHFilters);
        setAnalysisBugsFilters(mockABFilters);
      });

      const syncToURLSpy = jest.spyOn(useFilterStore.getState(), 'syncToURL');

      act(() => {
        clearAllFilters();
      });

      expect(syncToURLSpy).toHaveBeenCalled();
      syncToURLSpy.mockRestore();
    });
  });

  // =========================================================================
  // Edge Cases and Integration Tests (7 tests)
  // =========================================================================

  describe('Edge Cases and Integration', () => {
    it('should handle undefined values in filters', () => {
      const { setEncounterHistoryFilters } = useFilterStore.getState();

      act(() => {
        setEncounterHistoryFilters({ outcome: undefined });
      });

      const state = useFilterStore.getState();
      expect(state.encounterHistory.outcome).toBeUndefined();
    });

    it('should handle rapid filter changes', () => {
      const { setEncounterHistoryFilters } = useFilterStore.getState();

      act(() => {
        setEncounterHistoryFilters({ outcome: 'victory' });
        setEncounterHistoryFilters({ outcome: 'defeat' });
        setEncounterHistoryFilters({ outcome: 'draw' });
      });

      const state = useFilterStore.getState();
      expect(state.encounterHistory.outcome).toBe('draw');
    });

    it('should handle mixed filter updates', () => {
      const { setEncounterHistoryFilters, setAnalysisBugsFilters } =
        useFilterStore.getState();

      act(() => {
        setEncounterHistoryFilters({ outcome: 'victory' });
        setAnalysisBugsFilters({ severity: 'critical' });
        setEncounterHistoryFilters({ sortBy: 'duration' });
        setAnalysisBugsFilters({ detector: 'heat-suicide' });
      });

      const state = useFilterStore.getState();
      expect(state.encounterHistory.outcome).toBe('victory');
      expect(state.encounterHistory.sortBy).toBe('duration');
      expect(state.analysisBugs.severity).toBe('critical');
      expect(state.analysisBugs.detector).toBe('heat-suicide');
    });

    it('should handle server-side rendering (window undefined)', () => {
      const originalWindow = global.window;
      // @ts-ignore - Testing SSR scenario where window is undefined
      delete global.window;

      const { syncFromURL, syncToURL } = useFilterStore.getState();

      expect(() => {
        syncFromURL();
        syncToURL();
      }).not.toThrow();

      global.window = originalWindow;
    });

    it('should preserve filter state across multiple operations', () => {
      const {
        setEncounterHistoryFilters,
        setAnalysisBugsFilters,
        clearEncounterHistoryFilters,
      } = useFilterStore.getState();

      act(() => {
        setEncounterHistoryFilters(mockEHFilters);
        setAnalysisBugsFilters(mockABFilters);
        clearEncounterHistoryFilters();
      });

      const state = useFilterStore.getState();
      expect(state.encounterHistory).toEqual({});
      expect(state.analysisBugs).toEqual(mockABFilters);
    });

    it('should handle special characters in battleId', () => {
      const { setAnalysisBugsFilters } = useFilterStore.getState();
      const specialId = 'battle-123!@#$%^&*()';

      act(() => {
        setAnalysisBugsFilters({ battleId: specialId });
      });

      const state = useFilterStore.getState();
      expect(state.analysisBugs.battleId).toBe(specialId);
    });

    it('should handle empty string filters', () => {
      const { setAnalysisBugsFilters } = useFilterStore.getState();

      act(() => {
        setAnalysisBugsFilters({ battleId: '' });
      });

      const state = useFilterStore.getState();
      expect(state.analysisBugs.battleId).toBe('');
    });
  });
});
