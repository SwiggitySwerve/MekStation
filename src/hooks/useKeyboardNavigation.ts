/**
 * Keyboard Navigation Hook
 * 
 * Provides keyboard navigation support for lists and grids.
 * 
 * @spec openspec/specs/confirmation-dialogs/spec.md
 */

import { useCallback, useEffect } from 'react';

/**
 * Navigation direction
 */
export type NavDirection = 'up' | 'down' | 'left' | 'right' | 'first' | 'last';

/**
 * Keyboard navigation options
 */
export interface KeyboardNavOptions<T> {
  /** Items to navigate */
  items: readonly T[];
  /** Current selected item */
  selectedItem: T | null;
  /** Called when selection changes */
  onSelect: (item: T) => void;
  /** Called when item is activated (Enter key) */
  onActivate?: (item: T) => void;
  /** Get unique key for item */
  getKey: (item: T) => string;
  /** Enable wrap-around navigation */
  wrap?: boolean;
  /** Enable horizontal navigation */
  horizontal?: boolean;
  /** Grid columns (for 2D navigation) */
  columns?: number;
  /** Is navigation enabled */
  enabled?: boolean;
}

/**
 * Hook for keyboard navigation in lists and grids
 */
export function useKeyboardNavigation<T>({
  items,
  selectedItem,
  onSelect,
  onActivate,
  getKey,
  wrap = true,
  horizontal = false,
  columns,
  enabled = true,
}: KeyboardNavOptions<T>): {
  navigate: (direction: NavDirection) => void;
  handleKeyDown: (e: KeyboardEvent) => void;
  currentIndex: number;
} {
  // Find current index
  const currentIndex = selectedItem 
    ? items.findIndex(item => getKey(item) === getKey(selectedItem))
    : -1;

  const navigate = useCallback((direction: NavDirection) => {
    if (!enabled || items.length === 0) return;

    let newIndex: number;

    switch (direction) {
      case 'first':
        newIndex = 0;
        break;
      case 'last':
        newIndex = items.length - 1;
        break;
      case 'up':
        if (columns) {
          // Grid navigation
          newIndex = currentIndex - columns;
          if (newIndex < 0) {
            newIndex = wrap ? items.length + newIndex : currentIndex;
          }
        } else if (!horizontal) {
          // List navigation
          newIndex = currentIndex <= 0 
            ? (wrap ? items.length - 1 : 0) 
            : currentIndex - 1;
        } else {
          return;
        }
        break;
      case 'down':
        if (columns) {
          newIndex = currentIndex + columns;
          if (newIndex >= items.length) {
            newIndex = wrap ? newIndex % items.length : currentIndex;
          }
        } else if (!horizontal) {
          newIndex = currentIndex >= items.length - 1 
            ? (wrap ? 0 : items.length - 1) 
            : currentIndex + 1;
        } else {
          return;
        }
        break;
      case 'left':
        if (horizontal || columns) {
          newIndex = currentIndex <= 0 
            ? (wrap ? items.length - 1 : 0) 
            : currentIndex - 1;
        } else {
          return;
        }
        break;
      case 'right':
        if (horizontal || columns) {
          newIndex = currentIndex >= items.length - 1 
            ? (wrap ? 0 : items.length - 1) 
            : currentIndex + 1;
        } else {
          return;
        }
        break;
      default:
        return;
    }

    if (newIndex >= 0 && newIndex < items.length && newIndex !== currentIndex) {
      onSelect(items[newIndex]);
    }
  }, [items, currentIndex, onSelect, wrap, horizontal, columns, enabled, getKey]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        navigate('up');
        break;
      case 'ArrowDown':
        e.preventDefault();
        navigate('down');
        break;
      case 'ArrowLeft':
        e.preventDefault();
        navigate('left');
        break;
      case 'ArrowRight':
        e.preventDefault();
        navigate('right');
        break;
      case 'Home':
        e.preventDefault();
        navigate('first');
        break;
      case 'End':
        e.preventDefault();
        navigate('last');
        break;
      case 'Enter':
      case ' ':
        if (selectedItem && onActivate) {
          e.preventDefault();
          onActivate(selectedItem);
        }
        break;
    }
  }, [enabled, navigate, selectedItem, onActivate]);

  return {
    navigate,
    handleKeyDown,
    currentIndex,
  };
}

/**
 * Hook for tab keyboard navigation
 */
export function useTabKeyboardNavigation(
  tabs: readonly { id: string }[],
  activeTabId: string,
  onTabChange: (tabId: string) => void
) {
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const currentIndex = tabs.findIndex(t => t.id === activeTabId);
    if (currentIndex === -1) return;

    let newIndex: number | null = null;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        break;
      case 'ArrowRight':
        e.preventDefault();
        newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = tabs.length - 1;
        break;
    }

    if (newIndex !== null) {
      onTabChange(tabs[newIndex].id);
    }
  }, [tabs, activeTabId, onTabChange]);

  return handleKeyDown;
}

/**
 * Hook to focus an element when it becomes selected
 */
export function useFocusOnSelect(
  ref: React.RefObject<HTMLElement>,
  isSelected: boolean
) {
  useEffect(() => {
    if (isSelected && ref.current) {
      ref.current.focus();
    }
  }, [isSelected, ref]);
}

