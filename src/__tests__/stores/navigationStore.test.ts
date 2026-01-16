import { renderHook, act } from '@testing-library/react';
import { useNavigationStore, useMobileSidebarStore } from '../../stores/navigationStore';

// =============================================================================
// Mobile Sidebar Store Tests
// =============================================================================

describe('useMobileSidebarStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useMobileSidebarStore.setState({ isOpen: false });
  });

  describe('initial state', () => {
    it('should start with sidebar closed', () => {
      const { result } = renderHook(() => useMobileSidebarStore());
      expect(result.current.isOpen).toBe(false);
    });
  });

  describe('open', () => {
    it('should open the mobile sidebar', () => {
      const { result } = renderHook(() => useMobileSidebarStore());

      act(() => {
        result.current.open();
      });

      expect(result.current.isOpen).toBe(true);
    });

    it('should stay open when called multiple times', () => {
      const { result } = renderHook(() => useMobileSidebarStore());

      act(() => {
        result.current.open();
        result.current.open();
        result.current.open();
      });

      expect(result.current.isOpen).toBe(true);
    });
  });

  describe('close', () => {
    it('should close the mobile sidebar', () => {
      const { result } = renderHook(() => useMobileSidebarStore());

      act(() => {
        result.current.open();
      });

      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.close();
      });

      expect(result.current.isOpen).toBe(false);
    });

    it('should stay closed when called while already closed', () => {
      const { result } = renderHook(() => useMobileSidebarStore());

      act(() => {
        result.current.close();
        result.current.close();
      });

      expect(result.current.isOpen).toBe(false);
    });
  });

  describe('toggle', () => {
    it('should open sidebar when closed', () => {
      const { result } = renderHook(() => useMobileSidebarStore());

      expect(result.current.isOpen).toBe(false);

      act(() => {
        result.current.toggle();
      });

      expect(result.current.isOpen).toBe(true);
    });

    it('should close sidebar when open', () => {
      const { result } = renderHook(() => useMobileSidebarStore());

      act(() => {
        result.current.open();
      });

      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.toggle();
      });

      expect(result.current.isOpen).toBe(false);
    });

    it('should alternate between open and closed', () => {
      const { result } = renderHook(() => useMobileSidebarStore());

      // Start closed
      expect(result.current.isOpen).toBe(false);

      // Toggle 1: closed -> open
      act(() => {
        result.current.toggle();
      });
      expect(result.current.isOpen).toBe(true);

      // Toggle 2: open -> closed
      act(() => {
        result.current.toggle();
      });
      expect(result.current.isOpen).toBe(false);

      // Toggle 3: closed -> open
      act(() => {
        result.current.toggle();
      });
      expect(result.current.isOpen).toBe(true);
    });
  });

  describe('reactivity', () => {
    it('should share state across multiple hook instances', () => {
      const { result: result1 } = renderHook(() => useMobileSidebarStore());
      const { result: result2 } = renderHook(() => useMobileSidebarStore());

      // Both start closed
      expect(result1.current.isOpen).toBe(false);
      expect(result2.current.isOpen).toBe(false);

      // Open via first hook
      act(() => {
        result1.current.open();
      });

      // Both should now be open
      expect(result1.current.isOpen).toBe(true);
      expect(result2.current.isOpen).toBe(true);

      // Close via second hook
      act(() => {
        result2.current.close();
      });

      // Both should now be closed
      expect(result1.current.isOpen).toBe(false);
      expect(result2.current.isOpen).toBe(false);
    });
  });
});

// =============================================================================
// Panel Navigation Store Tests
// =============================================================================

describe('useNavigationStore', () => {
  beforeEach(() => {
    // Reset store before each test
    const { resetNavigation } = useNavigationStore.getState();
    resetNavigation();
  });

  describe('initial state', () => {
    it('should start with catalog as default panel', () => {
      const { result } = renderHook(() => useNavigationStore());

      expect(result.current.currentPanel).toBe('catalog');
      expect(result.current.history).toHaveLength(1);
      expect(result.current.history[0].id).toBe('catalog');
    });

    it('should have back navigation disabled initially', () => {
      const { result } = renderHook(() => useNavigationStore());

      expect(result.current.canGoBack).toBe(false);
    });

    it('should have forward navigation disabled initially', () => {
      const { result } = renderHook(() => useNavigationStore());

      expect(result.current.canGoForward).toBe(false);
    });

    it('should have current index at 0', () => {
      const { result } = renderHook(() => useNavigationStore());

      expect(result.current.currentIndex).toBe(0);
    });
  });

  describe('pushPanel', () => {
    it('should add panel to history', () => {
      const { result } = renderHook(() => useNavigationStore());

      act(() => {
        result.current.pushPanel('unit-detail');
      });

      expect(result.current.history).toHaveLength(2);
      expect(result.current.currentPanel).toBe('unit-detail');
      expect(result.current.currentIndex).toBe(1);
    });

    it('should enable back navigation after push', () => {
      const { result } = renderHook(() => useNavigationStore());

      act(() => {
        result.current.pushPanel('editor');
      });

      expect(result.current.canGoBack).toBe(true);
    });

    it('should preserve panel state', () => {
      const { result } = renderHook(() => useNavigationStore());

      act(() => {
        result.current.pushPanel('unit-detail', { unitId: '123', scrollPos: 100 });
      });

      expect(result.current.history[1].state).toEqual({
        unitId: '123',
        scrollPos: 100,
      });
    });

    it('should disable forward navigation after push', () => {
      const { result } = renderHook(() => useNavigationStore());

      // First push
      act(() => {
        result.current.pushPanel('unit-detail');
      });

      // Go back
      act(() => {
        result.current.goBack();
      });

      expect(result.current.canGoForward).toBe(true);

      // Push new panel - should truncate forward history
      act(() => {
        result.current.pushPanel('editor');
      });

      expect(result.current.canGoForward).toBe(false);
    });

    it('should truncate forward history when pushing from middle', () => {
      const { result } = renderHook(() => useNavigationStore());

      // Create history: catalog -> unit-detail -> editor -> equipment
      act(() => {
        result.current.pushPanel('unit-detail');
        result.current.pushPanel('editor');
        result.current.pushPanel('equipment-browser');
      });

      expect(result.current.history).toHaveLength(4);

      // Go back twice: catalog -> unit-detail -> editor -> equipment
      //                                  ^当前位置
      act(() => {
        result.current.goBack();
        result.current.goBack();
      });

      expect(result.current.currentIndex).toBe(1);
      expect(result.current.canGoForward).toBe(true);

      // Push new panel - should truncate equipment-browser
      act(() => {
        result.current.pushPanel('sidebar');
      });

      expect(result.current.history).toHaveLength(3);
      expect(result.current.history[2].id).toBe('sidebar');
      expect(result.current.canGoForward).toBe(false);
    });
  });

  describe('goBack', () => {
    it('should navigate to previous panel', () => {
      const { result } = renderHook(() => useNavigationStore());

      act(() => {
        result.current.pushPanel('unit-detail');
        result.current.pushPanel('editor');
      });

      expect(result.current.currentPanel).toBe('editor');

      act(() => {
        result.current.goBack();
      });

      expect(result.current.currentPanel).toBe('unit-detail');
      expect(result.current.currentIndex).toBe(1);
    });

    it('should enable forward navigation after going back', () => {
      const { result } = renderHook(() => useNavigationStore());

      act(() => {
        result.current.pushPanel('unit-detail');
        result.current.pushPanel('editor');
      });

      act(() => {
        result.current.goBack();
      });

      expect(result.current.canGoForward).toBe(true);
    });

    it('should disable back navigation when at first panel', () => {
      const { result } = renderHook(() => useNavigationStore());

      act(() => {
        result.current.pushPanel('unit-detail');
      });

      act(() => {
        result.current.goBack();
      });

      expect(result.current.canGoBack).toBe(false);
      expect(result.current.currentPanel).toBe('catalog');
    });

    it('should not go back when already at first panel', () => {
      const { result } = renderHook(() => useNavigationStore());

      const initialIndex = result.current.currentIndex;

      act(() => {
        result.current.goBack();
      });

      expect(result.current.currentIndex).toBe(initialIndex);
      expect(result.current.currentPanel).toBe('catalog');
    });
  });

  describe('goForward', () => {
    it('should navigate to next panel in history', () => {
      const { result } = renderHook(() => useNavigationStore());

      // Create history
      act(() => {
        result.current.pushPanel('unit-detail');
        result.current.pushPanel('editor');
      });

      // Go back
      act(() => {
        result.current.goBack();
      });

      expect(result.current.currentPanel).toBe('unit-detail');

      // Go forward
      act(() => {
        result.current.goForward();
      });

      expect(result.current.currentPanel).toBe('editor');
      expect(result.current.currentIndex).toBe(2);
    });

    it('should enable back navigation after going forward', () => {
      const { result } = renderHook(() => useNavigationStore());

      act(() => {
        result.current.pushPanel('unit-detail');
        result.current.pushPanel('editor');
      });

      act(() => {
        result.current.goBack();
        result.current.goForward();
      });

      expect(result.current.canGoBack).toBe(true);
    });

    it('should not go forward when at end of history', () => {
      const { result } = renderHook(() => useNavigationStore());

      act(() => {
        result.current.pushPanel('unit-detail');
      });

      const initialIndex = result.current.currentIndex;

      act(() => {
        result.current.goForward();
      });

      expect(result.current.currentIndex).toBe(initialIndex);
      expect(result.current.canGoForward).toBe(false);
    });
  });

  describe('resetNavigation', () => {
    it('should clear all history and return to catalog', () => {
      const { result } = renderHook(() => useNavigationStore());

      act(() => {
        result.current.pushPanel('unit-detail');
        result.current.pushPanel('editor');
        result.current.pushPanel('equipment-browser');
      });

      expect(result.current.history).toHaveLength(4);

      act(() => {
        result.current.resetNavigation();
      });

      expect(result.current.history).toHaveLength(1);
      expect(result.current.currentPanel).toBe('catalog');
      expect(result.current.currentIndex).toBe(0);
    });

    it('should disable back and forward navigation', () => {
      const { result } = renderHook(() => useNavigationStore());

      act(() => {
        result.current.pushPanel('unit-detail');
        result.current.pushPanel('editor');
      });

      // After going back once, we should be able to go both ways
      act(() => {
        result.current.goBack();
      });

      expect(result.current.canGoBack).toBe(true);
      expect(result.current.canGoForward).toBe(true);

      act(() => {
        result.current.resetNavigation();
      });

      expect(result.current.canGoBack).toBe(false);
      expect(result.current.canGoForward).toBe(false);
    });
  });

  describe('replacePanel', () => {
    it('should replace current panel in history', () => {
      const { result } = renderHook(() => useNavigationStore());

      act(() => {
        result.current.pushPanel('unit-detail');
      });

      expect(result.current.history[1].id).toBe('unit-detail');

      act(() => {
        result.current.replacePanel('editor', { someData: 'test' });
      });

      expect(result.current.history).toHaveLength(2);
      expect(result.current.history[1].id).toBe('editor');
      expect(result.current.history[1].state).toEqual({ someData: 'test' });
      expect(result.current.currentPanel).toBe('editor');
    });

    it('should not change history length', () => {
      const { result } = renderHook(() => useNavigationStore());

      act(() => {
        result.current.pushPanel('unit-detail');
      });

      const initialLength = result.current.history.length;

      act(() => {
        result.current.replacePanel('editor');
      });

      expect(result.current.history.length).toBe(initialLength);
    });

    it('should not change current index', () => {
      const { result } = renderHook(() => useNavigationStore());

      act(() => {
        result.current.pushPanel('unit-detail');
      });

      const initialIndex = result.current.currentIndex;

      act(() => {
        result.current.replacePanel('editor');
      });

      expect(result.current.currentIndex).toBe(initialIndex);
    });
  });

  describe('complex navigation scenarios', () => {
    it('should handle deep navigation stack', () => {
      const { result } = renderHook(() => useNavigationStore());

      // Deep navigation
      act(() => {
        result.current.pushPanel('unit-detail');
        result.current.pushPanel('editor');
        result.current.pushPanel('equipment-browser');
        result.current.pushPanel('sidebar');
      });

      expect(result.current.history).toHaveLength(5);
      expect(result.current.currentIndex).toBe(4);
      expect(result.current.currentPanel).toBe('sidebar');
      expect(result.current.canGoBack).toBe(true);
    });

    it('should preserve state when navigating back and forward', () => {
      const { result } = renderHook(() => useNavigationStore());

      // Navigate with state
      act(() => {
        result.current.pushPanel('unit-detail', { unitId: '123' });
        result.current.pushPanel('editor', { tab: 'structure' });
      });

      // Go back
      act(() => {
        result.current.goBack();
      });

      expect(result.current.history[1].state).toEqual({ unitId: '123' });

      // Go forward
      act(() => {
        result.current.goForward();
      });

      expect(result.current.history[2].state).toEqual({ tab: 'structure' });
    });

    it('should handle back-forward-push sequence correctly', () => {
      const { result } = renderHook(() => useNavigationStore());

      // catalog -> unit-detail -> editor
      act(() => {
        result.current.pushPanel('unit-detail');
        result.current.pushPanel('editor');
      });

      // back to unit-detail
      act(() => {
        result.current.goBack();
      });

      expect(result.current.currentPanel).toBe('unit-detail');
      expect(result.current.canGoForward).toBe(true);

      // push equipment-browser (should truncate editor)
      act(() => {
        result.current.pushPanel('equipment-browser');
      });

      expect(result.current.history).toHaveLength(3);
      expect(result.current.history[2].id).toBe('equipment-browser');
      expect(result.current.canGoForward).toBe(false);

      // back to unit-detail
      act(() => {
        result.current.goBack();
      });

      expect(result.current.currentPanel).toBe('unit-detail');
    });
  });

  describe('reactivity', () => {
    it('should trigger re-renders when state changes', () => {
      const { result } = renderHook(() => useNavigationStore());

      const initialPanel = result.current.currentPanel;

      act(() => {
        result.current.pushPanel('editor');
      });

      expect(result.current.currentPanel).toBe('editor');
      expect(result.current.currentPanel).not.toBe(initialPanel);
    });

    it('should maintain single instance across multiple hooks', () => {
      const { result: result1 } = renderHook(() => useNavigationStore());
      const { result: result2 } = renderHook(() => useNavigationStore());

      act(() => {
        result1.current.pushPanel('editor');
      });

      expect(result2.current.currentPanel).toBe('editor');
      expect(result2.current.history).toHaveLength(2);
    });
  });

  describe('edge cases', () => {
    it('should handle pushing same panel consecutively', () => {
      const { result } = renderHook(() => useNavigationStore());

      act(() => {
        result.current.pushPanel('editor');
        result.current.pushPanel('editor');
        result.current.pushPanel('editor');
      });

      expect(result.current.history).toHaveLength(4);
      // First entry is catalog, rest are editor
      expect(result.current.history[0].id).toBe('catalog');
      expect(result.current.history.slice(1).every((entry) => entry.id === 'editor')).toBe(
        true
      );
    });

    it('should handle rapid back/forward calls', () => {
      const { result } = renderHook(() => useNavigationStore());

      act(() => {
        result.current.pushPanel('unit-detail');
        result.current.pushPanel('editor');
        result.current.pushPanel('equipment-browser');
      });

      act(() => {
        result.current.goBack();
        result.current.goBack();
        result.current.goForward();
      });

      expect(result.current.currentPanel).toBe('editor');
      expect(result.current.currentIndex).toBe(2);
    });

    it('should handle stateless panels', () => {
      const { result } = renderHook(() => useNavigationStore());

      act(() => {
        result.current.pushPanel('sidebar');
      });

      expect(result.current.history[1].state).toBeUndefined();
    });

    it('should handle empty state object', () => {
      const { result } = renderHook(() => useNavigationStore());

      act(() => {
        result.current.pushPanel('editor', {});
      });

      expect(result.current.history[1].state).toEqual({});
    });
  });
});
