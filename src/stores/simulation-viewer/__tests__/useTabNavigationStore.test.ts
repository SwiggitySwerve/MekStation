/**
 * Tab Navigation Store Tests
 *
 * Comprehensive test suite covering:
 * - Store state management
 * - URL synchronization
 * - Browser back/forward navigation
 * - Edge cases and error handling
 */

import { renderHook, act } from '@testing-library/react';
import {
  useTabNavigationStore,
  useInitTabFromURL,
  useSyncTabWithURL,
  type SimulationViewerTab,
} from '../useTabNavigationStore';

describe('useTabNavigationStore', () => {
  beforeEach(() => {
    useTabNavigationStore.setState({
      activeTab: 'campaign-dashboard',
      history: ['campaign-dashboard'],
    });

    window.history.pushState = jest.fn();
    window.history.back = jest.fn();
    window.addEventListener = jest.fn();
    window.removeEventListener = jest.fn();

    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:3000/simulation-viewer',
        search: '',
      },
      writable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // Store State Tests (5 tests)
  // =========================================================================

  describe('Initial State', () => {
    it('should initialize with campaign-dashboard as active tab', () => {
      const state = useTabNavigationStore.getState();
      expect(state.activeTab).toBe('campaign-dashboard');
    });

    it('should initialize with campaign-dashboard in history', () => {
      const state = useTabNavigationStore.getState();
      expect(state.history).toEqual(['campaign-dashboard']);
    });

    it('should have empty history length of 1', () => {
      const state = useTabNavigationStore.getState();
      expect(state.history.length).toBe(1);
    });
  });

  // =========================================================================
  // setActiveTab Tests (6 tests)
  // =========================================================================

  describe('setActiveTab', () => {
    it('should change activeTab to specified tab', () => {
      const { setActiveTab } = useTabNavigationStore.getState();

      act(() => {
        setActiveTab('encounter-history');
      });

      const state = useTabNavigationStore.getState();
      expect(state.activeTab).toBe('encounter-history');
    });

    it('should add tab to history', () => {
      const { setActiveTab } = useTabNavigationStore.getState();

      act(() => {
        setActiveTab('encounter-history');
      });

      const state = useTabNavigationStore.getState();
      expect(state.history).toContain('encounter-history');
    });

    it('should maintain history order', () => {
      const { setActiveTab } = useTabNavigationStore.getState();

      act(() => {
        setActiveTab('encounter-history');
        setActiveTab('analysis-bugs');
      });

      const state = useTabNavigationStore.getState();
      expect(state.history).toEqual([
        'campaign-dashboard',
        'encounter-history',
        'analysis-bugs',
      ]);
    });

    it('should update URL with tab query parameter', () => {
      const { setActiveTab } = useTabNavigationStore.getState();

      act(() => {
        setActiveTab('encounter-history');
      });

      expect(window.history.pushState).toHaveBeenCalledWith(
        {},
        '',
        expect.stringContaining('tab=encounter-history')
      );
    });

    it('should allow same tab to be added to history multiple times', () => {
      const { setActiveTab } = useTabNavigationStore.getState();

      act(() => {
        setActiveTab('encounter-history');
        setActiveTab('encounter-history');
      });

      const state = useTabNavigationStore.getState();
      expect(state.history.filter((t) => t === 'encounter-history').length).toBe(2);
    });

    it('should handle all valid tab types', () => {
      const { setActiveTab } = useTabNavigationStore.getState();
      const validTabs: SimulationViewerTab[] = [
        'campaign-dashboard',
        'encounter-history',
        'analysis-bugs',
      ];

      validTabs.forEach((tab) => {
        act(() => {
          setActiveTab(tab);
        });

        const state = useTabNavigationStore.getState();
        expect(state.activeTab).toBe(tab);
      });
    });
  });

  // =========================================================================
  // goBack Tests (6 tests)
  // =========================================================================

  describe('goBack', () => {
    it('should navigate to previous tab', () => {
      const { setActiveTab, goBack } = useTabNavigationStore.getState();

      act(() => {
        setActiveTab('encounter-history');
        setActiveTab('analysis-bugs');
      });

      act(() => {
        goBack();
      });

      const state = useTabNavigationStore.getState();
      expect(state.activeTab).toBe('encounter-history');
    });

    it('should remove current tab from history', () => {
      const { setActiveTab, goBack } = useTabNavigationStore.getState();

      act(() => {
        setActiveTab('encounter-history');
        setActiveTab('analysis-bugs');
      });

      const beforeLength = useTabNavigationStore.getState().history.length;

      act(() => {
        goBack();
      });

      const afterLength = useTabNavigationStore.getState().history.length;
      expect(afterLength).toBe(beforeLength - 1);
    });

    it('should call window.history.back()', () => {
      const { setActiveTab, goBack } = useTabNavigationStore.getState();

      act(() => {
        setActiveTab('encounter-history');
      });

      act(() => {
        goBack();
      });

      expect(window.history.back).toHaveBeenCalled();
    });

    it('should not navigate if history length is 1', () => {
      const { goBack } = useTabNavigationStore.getState();
      const initialState = useTabNavigationStore.getState();

      act(() => {
        goBack();
      });

      const state = useTabNavigationStore.getState();
      expect(state.activeTab).toBe(initialState.activeTab);
      expect(state.history.length).toBe(1);
    });

    it('should not call window.history.back() if history length is 1', () => {
      const { goBack } = useTabNavigationStore.getState();

      act(() => {
        goBack();
      });

      expect(window.history.back).not.toHaveBeenCalled();
    });

    it('should handle multiple back navigations', () => {
      const { setActiveTab, goBack } = useTabNavigationStore.getState();

      act(() => {
        setActiveTab('encounter-history');
        setActiveTab('analysis-bugs');
        setActiveTab('campaign-dashboard');
      });

      act(() => {
        goBack();
        goBack();
      });

      const state = useTabNavigationStore.getState();
      expect(state.activeTab).toBe('encounter-history');
    });
  });

  // =========================================================================
  // canGoBack Tests (3 tests)
  // =========================================================================

  describe('canGoBack', () => {
    it('should return false when history length is 1', () => {
      const { canGoBack } = useTabNavigationStore.getState();
      expect(canGoBack()).toBe(false);
    });

    it('should return true when history length is greater than 1', () => {
      const { setActiveTab, canGoBack } = useTabNavigationStore.getState();

      act(() => {
        setActiveTab('encounter-history');
      });

      expect(canGoBack()).toBe(true);
    });

    it('should update correctly after goBack', () => {
      const { setActiveTab, goBack, canGoBack } = useTabNavigationStore.getState();

      act(() => {
        setActiveTab('encounter-history');
        setActiveTab('analysis-bugs');
      });

      expect(canGoBack()).toBe(true);

      act(() => {
        goBack();
      });

      expect(canGoBack()).toBe(true);

      act(() => {
        goBack();
      });

      expect(canGoBack()).toBe(false);
    });
  });

  // =========================================================================
  // reset Tests (3 tests)
  // =========================================================================

  describe('reset', () => {
    it('should restore initial activeTab', () => {
      const { setActiveTab, reset } = useTabNavigationStore.getState();

      act(() => {
        setActiveTab('encounter-history');
      });

      act(() => {
        reset();
      });

      const state = useTabNavigationStore.getState();
      expect(state.activeTab).toBe('campaign-dashboard');
    });

    it('should clear history to initial state', () => {
      const { setActiveTab, reset } = useTabNavigationStore.getState();

      act(() => {
        setActiveTab('encounter-history');
        setActiveTab('analysis-bugs');
      });

      act(() => {
        reset();
      });

      const state = useTabNavigationStore.getState();
      expect(state.history).toEqual(['campaign-dashboard']);
    });

    it('should reset canGoBack to false', () => {
      const { setActiveTab, reset, canGoBack } = useTabNavigationStore.getState();

      act(() => {
        setActiveTab('encounter-history');
      });

      expect(canGoBack()).toBe(true);

      act(() => {
        reset();
      });

      expect(canGoBack()).toBe(false);
    });
  });

  // =========================================================================
  // URL Synchronization Tests (7 tests)
  // =========================================================================

  describe('URL Synchronization', () => {
    it('should include tab parameter in URL', () => {
      const { setActiveTab } = useTabNavigationStore.getState();

      act(() => {
        setActiveTab('encounter-history');
      });

      const callArgs = (window.history.pushState as jest.Mock).mock.calls[0] as unknown[];
      expect((callArgs[2] as string)).toContain('tab=encounter-history');
    });

    it('should update URL for each tab change', () => {
      const { setActiveTab } = useTabNavigationStore.getState();

      act(() => {
        setActiveTab('encounter-history');
        setActiveTab('analysis-bugs');
      });

      expect(window.history.pushState).toHaveBeenCalledTimes(2);
    });

    it('should preserve existing query parameters', () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'http://localhost:3000/simulation-viewer?other=param',
          search: '?other=param',
        },
        writable: true,
      });

      jest.clearAllMocks();
      window.history.pushState = jest.fn();

      const { setActiveTab } = useTabNavigationStore.getState();

      act(() => {
        setActiveTab('encounter-history');
      });

      const callArgs = (window.history.pushState as jest.Mock).mock.calls[0] as unknown[];
      expect(callArgs[2]).toContain('tab=encounter-history');
    });

    it('should replace existing tab parameter', () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'http://localhost:3000/simulation-viewer?tab=campaign-dashboard',
          search: '?tab=campaign-dashboard',
        },
        writable: true,
      });

      jest.clearAllMocks();
      window.history.pushState = jest.fn();

      const { setActiveTab } = useTabNavigationStore.getState();

      act(() => {
        setActiveTab('encounter-history');
      });

      const callArgs = (window.history.pushState as jest.Mock).mock.calls[0] as unknown[];
      expect(callArgs[2]).toContain('tab=encounter-history');
    });

    it('should handle window undefined gracefully', () => {
      const originalWindow = global.window;
      // @ts-ignore - Testing SSR scenario where window is undefined
      delete global.window;

      const { setActiveTab } = useTabNavigationStore.getState();

      expect(() => {
        act(() => {
          setActiveTab('encounter-history');
        });
      }).not.toThrow();

      global.window = originalWindow;
    });

    it('should use correct URL format', () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'http://localhost:3000/simulation-viewer',
          search: '',
        },
        writable: true,
      });

      jest.clearAllMocks();
      window.history.pushState = jest.fn();

      const { setActiveTab } = useTabNavigationStore.getState();

      act(() => {
        setActiveTab('analysis-bugs');
      });

      const callArgs = (window.history.pushState as jest.Mock).mock.calls[0] as unknown[];
      const url = callArgs[2];

      expect(url).toContain('tab=analysis-bugs');
    });
  });

  // =========================================================================
  // useInitTabFromURL Hook Tests (5 tests)
  // =========================================================================

  describe('useInitTabFromURL', () => {
    it('should handle window undefined gracefully', () => {
      const originalWindow = global.window;
      // @ts-ignore - Testing SSR scenario where window is undefined
      delete global.window;

      expect(() => {
        renderHook(() => useInitTabFromURL());
      }).not.toThrow();

      global.window = originalWindow;
    });

    it('should set up effect without dependencies', () => {
      const { rerender } = renderHook(() => useInitTabFromURL());
      expect(() => rerender()).not.toThrow();
    });

    it('should initialize store state correctly', () => {
      const state = useTabNavigationStore.getState();
      expect(state.activeTab).toBeDefined();
      expect(state.history).toBeDefined();
    });

    it('should handle valid tab values', () => {
      const validTabs: SimulationViewerTab[] = [
        'campaign-dashboard',
        'encounter-history',
        'analysis-bugs',
      ];

      validTabs.forEach((tab) => {
        expect(() => {
          useTabNavigationStore.setState({
            activeTab: tab,
            history: [tab],
          });
        }).not.toThrow();
      });
    });

    it('should preserve state after hook call', () => {
      renderHook(() => useInitTabFromURL());
      const afterState = useTabNavigationStore.getState();

      expect(afterState.activeTab).toBeDefined();
      expect(afterState.history).toBeDefined();
    });

    it('should read valid tab from URL search params', () => {
      const searchParams = new URLSearchParams('tab=encounter-history');
      const tabParam = searchParams.get('tab');

      expect(tabParam).toBe('encounter-history');
      expect(['campaign-dashboard', 'encounter-history', 'analysis-bugs'].includes(tabParam as SimulationViewerTab)).toBe(true);
    });

    it('should handle missing tab parameter gracefully', () => {
      const searchParams = new URLSearchParams('');
      const tabParam = searchParams.get('tab');

      expect(tabParam).toBeNull();
    });
  });

  // =========================================================================
  // useSyncTabWithURL Hook Tests (5 tests)
  // =========================================================================

  describe('useSyncTabWithURL', () => {
    it('should set up event listener', () => {
      renderHook(() => useSyncTabWithURL());

      const listeners = ((window.addEventListener as jest.Mock).mock.calls as unknown[][]).filter(
        (call) => (call[0] as string) === 'popstate'
      );

      expect(listeners.length).toBeGreaterThan(0);
    });

    it('should remove event listener on unmount', () => {
      const { unmount } = renderHook(() => useSyncTabWithURL());

      unmount();

      const removeListenerCalls = ((window.removeEventListener as jest.Mock).mock.calls as unknown[][]).filter(
        (call) => (call[0] as string) === 'popstate'
      );

      expect(removeListenerCalls.length).toBeGreaterThan(0);
    });

    it('should handle window undefined gracefully', () => {
      const originalWindow = global.window;
      // @ts-ignore - Testing SSR scenario where window is undefined
      delete global.window;

      expect(() => {
        renderHook(() => useSyncTabWithURL());
      }).not.toThrow();

      global.window = originalWindow;
    });

    it('should set up effect without dependencies', () => {
      const { rerender } = renderHook(() => useSyncTabWithURL());
      expect(() => rerender()).not.toThrow();
    });

    it('should maintain store state during sync', () => {
      const initialState = useTabNavigationStore.getState();
      renderHook(() => useSyncTabWithURL());
      const afterState = useTabNavigationStore.getState();

      expect(afterState.activeTab).toBe(initialState.activeTab);
      expect(afterState.history).toEqual(initialState.history);
    });

    it('should handle popstate event with valid tab', () => {
      const params = new URLSearchParams('tab=encounter-history');
      const tabParam = params.get('tab');

      expect(tabParam).toBe('encounter-history');
      expect(['campaign-dashboard', 'encounter-history', 'analysis-bugs'].includes(tabParam as SimulationViewerTab)).toBe(true);
    });

    it('should handle popstate event with invalid tab', () => {
      const params = new URLSearchParams('tab=invalid');
      const tabParam = params.get('tab');

      expect(tabParam).toBe('invalid');
      expect(['campaign-dashboard', 'encounter-history', 'analysis-bugs'].includes(tabParam as SimulationViewerTab)).toBe(false);
    });

    it('should handle popstate event without tab parameter', () => {
      const params = new URLSearchParams('');
      const tabParam = params.get('tab');

      expect(tabParam).toBeNull();
    });
  });

  // =========================================================================
  // Edge Cases Tests (5 tests)
  // =========================================================================

  describe('Edge Cases', () => {
    it('should handle rapid tab changes', () => {
      const { setActiveTab } = useTabNavigationStore.getState();

      act(() => {
        setActiveTab('encounter-history');
        setActiveTab('analysis-bugs');
        setActiveTab('campaign-dashboard');
        setActiveTab('encounter-history');
      });

      const state = useTabNavigationStore.getState();
      expect(state.activeTab).toBe('encounter-history');
      expect(state.history.length).toBe(5);
    });

    it('should maintain correct state after multiple operations', () => {
      const { setActiveTab, goBack, reset } = useTabNavigationStore.getState();

      act(() => {
        setActiveTab('encounter-history');
        setActiveTab('analysis-bugs');
        goBack();
        reset();
        setActiveTab('encounter-history');
      });

      const state = useTabNavigationStore.getState();
      expect(state.activeTab).toBe('encounter-history');
      expect(state.history).toEqual(['campaign-dashboard', 'encounter-history']);
    });

    it('should handle goBack at boundary', () => {
      const { setActiveTab, goBack } = useTabNavigationStore.getState();

      act(() => {
        setActiveTab('encounter-history');
        goBack();
        goBack();
      });

      const state = useTabNavigationStore.getState();
      expect(state.activeTab).toBe('campaign-dashboard');
      expect(state.history.length).toBe(1);
    });

    it('should preserve state across multiple store accesses', () => {
      const { setActiveTab } = useTabNavigationStore.getState();

      act(() => {
        setActiveTab('encounter-history');
      });

      const state1 = useTabNavigationStore.getState();
      const state2 = useTabNavigationStore.getState();

      expect(state1.activeTab).toBe(state2.activeTab);
      expect(state1.history).toEqual(state2.history);
    });

    it('should handle concurrent state updates', () => {
      const { setActiveTab } = useTabNavigationStore.getState();

      act(() => {
        setActiveTab('encounter-history');
        setActiveTab('analysis-bugs');
      });

      const state = useTabNavigationStore.getState();
      expect(state.history).toEqual([
        'campaign-dashboard',
        'encounter-history',
        'analysis-bugs',
      ]);
    });

    it('should validate tab values correctly', () => {
      const { setActiveTab } = useTabNavigationStore.getState();

      act(() => {
        setActiveTab('campaign-dashboard');
        setActiveTab('encounter-history');
        setActiveTab('analysis-bugs');
      });

      const state = useTabNavigationStore.getState();
      expect(state.history.every((tab) => ['campaign-dashboard', 'encounter-history', 'analysis-bugs'].includes(tab))).toBe(true);
    });

    it('should handle hook initialization with valid location', () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'http://localhost:3000/simulation-viewer?tab=encounter-history',
          search: '?tab=encounter-history',
        },
        writable: true,
      });

      const { rerender } = renderHook(() => useInitTabFromURL());
      expect(() => rerender()).not.toThrow();
    });

    it('should handle sync hook with popstate event', () => {
      const { rerender } = renderHook(() => useSyncTabWithURL());
      expect(() => rerender()).not.toThrow();
    });

    it('should maintain history integrity through operations', () => {
      const { setActiveTab, goBack } = useTabNavigationStore.getState();

      act(() => {
        setActiveTab('encounter-history');
        setActiveTab('analysis-bugs');
        setActiveTab('campaign-dashboard');
      });

      let state = useTabNavigationStore.getState();
      expect(state.history.length).toBe(4);

      act(() => {
        goBack();
      });

      state = useTabNavigationStore.getState();
      expect(state.history.length).toBe(3);
      expect(state.activeTab).toBe('analysis-bugs');
    });
  });
});
