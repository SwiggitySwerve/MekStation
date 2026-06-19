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

interface NavigationIndexState {
  readonly currentIndex: number;
  readonly itemCount: number;
  readonly wrap: boolean;
  readonly horizontal: boolean;
  readonly columns: number | undefined;
}

type TabIndexResolver = (currentIndex: number, tabCount: number) => number;

const NAVIGATION_DIRECTION_BY_KEY: Readonly<Record<string, NavDirection>> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  Home: 'first',
  End: 'last',
};

const TAB_INDEX_BY_KEY: Readonly<Record<string, TabIndexResolver>> = {
  ArrowLeft: (currentIndex, tabCount) =>
    currentIndex > 0 ? currentIndex - 1 : tabCount - 1,
  ArrowRight: (currentIndex, tabCount) =>
    currentIndex < tabCount - 1 ? currentIndex + 1 : 0,
  Home: () => 0,
  End: (_currentIndex, tabCount) => tabCount - 1,
};

function previousIndex(
  currentIndex: number,
  itemCount: number,
  wrap: boolean,
): number {
  if (currentIndex > 0) return currentIndex - 1;
  return wrap ? itemCount - 1 : 0;
}

function nextIndex(
  currentIndex: number,
  itemCount: number,
  wrap: boolean,
): number {
  if (currentIndex < itemCount - 1) return currentIndex + 1;
  return wrap ? 0 : itemCount - 1;
}

function gridUpIndex({
  currentIndex,
  itemCount,
  wrap,
  columns,
}: NavigationIndexState): number {
  const columnCount = columns ?? 1;
  const newIndex = currentIndex - columnCount;
  return newIndex < 0 ? (wrap ? itemCount + newIndex : currentIndex) : newIndex;
}

function gridDownIndex({
  currentIndex,
  itemCount,
  wrap,
  columns,
}: NavigationIndexState): number {
  const columnCount = columns ?? 1;
  const newIndex = currentIndex + columnCount;
  return newIndex >= itemCount
    ? wrap
      ? newIndex % itemCount
      : currentIndex
    : newIndex;
}

function verticalNavigationIndex(
  direction: Extract<NavDirection, 'up' | 'down'>,
  state: NavigationIndexState,
): number | null {
  if (state.columns) {
    return direction === 'up' ? gridUpIndex(state) : gridDownIndex(state);
  }
  if (state.horizontal) return null;

  return direction === 'up'
    ? previousIndex(state.currentIndex, state.itemCount, state.wrap)
    : nextIndex(state.currentIndex, state.itemCount, state.wrap);
}

function horizontalNavigationIndex(
  direction: Extract<NavDirection, 'left' | 'right'>,
  state: NavigationIndexState,
): number | null {
  if (!state.horizontal && !state.columns) return null;

  return direction === 'left'
    ? previousIndex(state.currentIndex, state.itemCount, state.wrap)
    : nextIndex(state.currentIndex, state.itemCount, state.wrap);
}

function navigationIndexForDirection(
  direction: NavDirection,
  state: NavigationIndexState,
): number | null {
  switch (direction) {
    case 'first':
      return 0;
    case 'last':
      return state.itemCount - 1;
    case 'up':
    case 'down':
      return verticalNavigationIndex(direction, state);
    case 'left':
    case 'right':
      return horizontalNavigationIndex(direction, state);
    default:
      return null;
  }
}

function shouldSelectNavigationIndex(
  nextIndex: number | null,
  currentIndex: number,
  itemCount: number,
): nextIndex is number {
  return (
    nextIndex !== null &&
    nextIndex >= 0 &&
    nextIndex < itemCount &&
    nextIndex !== currentIndex
  );
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
    ? items.findIndex((item) => getKey(item) === getKey(selectedItem))
    : -1;

  const navigate = useCallback(
    (direction: NavDirection) => {
      if (!enabled || items.length === 0) return;

      const newIndex = navigationIndexForDirection(direction, {
        currentIndex,
        itemCount: items.length,
        wrap,
        horizontal,
        columns,
      });

      if (shouldSelectNavigationIndex(newIndex, currentIndex, items.length)) {
        onSelect(items[newIndex]);
      }
    },
    [items, currentIndex, onSelect, wrap, horizontal, columns, enabled],
  );

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      const direction = NAVIGATION_DIRECTION_BY_KEY[e.key];
      if (direction) {
        e.preventDefault();
        navigate(direction);
        return;
      }

      if ((e.key === 'Enter' || e.key === ' ') && selectedItem && onActivate) {
        e.preventDefault();
        onActivate(selectedItem);
      }
    },
    [enabled, navigate, selectedItem, onActivate],
  );

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
  onTabChange: (tabId: string) => void,
): (e: React.KeyboardEvent) => void {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const currentIndex = tabs.findIndex((t) => t.id === activeTabId);
      if (currentIndex === -1) return;

      const resolveIndex = TAB_INDEX_BY_KEY[e.key];
      if (!resolveIndex) return;

      e.preventDefault();
      onTabChange(tabs[resolveIndex(currentIndex, tabs.length)].id);
    },
    [tabs, activeTabId, onTabChange],
  );

  return handleKeyDown;
}

/**
 * Hook to focus an element when it becomes selected
 */
export function useFocusOnSelect(
  ref: React.RefObject<HTMLElement>,
  isSelected: boolean,
): void {
  useEffect(() => {
    if (isSelected && ref.current) {
      ref.current.focus();
    }
  }, [isSelected, ref]);
}
