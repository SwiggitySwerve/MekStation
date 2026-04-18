/**
 * CategoryTabs — keyboard-navigable tab strip for SPA categories.
 *
 * The visible tab set is built dynamically from the catalog, plus a
 * synthetic "All" tab. Counts reflect the *currently filtered* SPA
 * list so users can see how many entries each category will yield
 * given the active search + source filters.
 *
 * Accessibility: ARIA `tablist` / `tab`, ArrowLeft/ArrowRight cycle,
 * Home/End jump to ends. Selected tab gets `aria-selected="true"`.
 */

import React, { useRef } from 'react';

import { SPA_CATEGORY_LABELS } from './types';

export type CategoryTabId = string | 'all';

interface CategoryTabsProps {
  /** Ordered list of category ids that exist in the catalog. */
  categories: readonly string[];
  /** Map of categoryId → count of currently filtered entries. */
  counts: Readonly<Record<CategoryTabId, number>>;
  /** Currently selected tab. */
  selected: CategoryTabId;
  /** Selection change handler. */
  onSelect: (tab: CategoryTabId) => void;
}

/**
 * Render the category tab strip. Tabs wrap to multiple rows on narrow
 * screens — Wave 2a may add horizontal scroll if needed.
 */
export function CategoryTabs({
  categories,
  counts,
  selected,
  onSelect,
}: CategoryTabsProps): React.ReactElement {
  // Tab ids in render order. "All" is always first.
  const tabIds: readonly CategoryTabId[] = ['all', ...categories];
  const tabRefs = useRef<Map<CategoryTabId, HTMLButtonElement | null>>(
    new Map(),
  );

  /**
   * Move focus + selection by `delta` along the tab list, wrapping at the ends.
   * Used by ArrowLeft / ArrowRight handlers.
   */
  const moveFocus = (currentId: CategoryTabId, delta: number): void => {
    const idx = tabIds.indexOf(currentId);
    if (idx === -1) return;
    const next = (idx + delta + tabIds.length) % tabIds.length;
    const nextId = tabIds[next];
    onSelect(nextId);
    queueMicrotask(() => {
      tabRefs.current.get(nextId)?.focus();
    });
  };

  /** ArrowLeft/Right cycle, Home/End jump to ends. */
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    tabId: CategoryTabId,
  ): void => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        moveFocus(tabId, -1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        moveFocus(tabId, 1);
        break;
      case 'Home':
        e.preventDefault();
        onSelect(tabIds[0]);
        queueMicrotask(() => tabRefs.current.get(tabIds[0])?.focus());
        break;
      case 'End': {
        e.preventDefault();
        const last = tabIds[tabIds.length - 1];
        onSelect(last);
        queueMicrotask(() => tabRefs.current.get(last)?.focus());
        break;
      }
    }
  };

  /** Human label for a tab id (handles the synthetic "all"). */
  const labelFor = (id: CategoryTabId): string =>
    id === 'all' ? 'All' : (SPA_CATEGORY_LABELS[id] ?? id);

  return (
    <div
      role="tablist"
      aria-label="SPA categories"
      className="border-border-theme-subtle flex flex-wrap items-center gap-1 border-b pb-2"
    >
      {tabIds.map((tabId) => {
        const isSelected = selected === tabId;
        const count = counts[tabId] ?? 0;
        return (
          <button
            key={tabId}
            ref={(el) => {
              tabRefs.current.set(tabId, el);
            }}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-controls="spa-picker-list"
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onSelect(tabId)}
            onKeyDown={(e) => handleKeyDown(e, tabId)}
            className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              isSelected
                ? 'border-accent/30 bg-accent/20 text-accent border'
                : 'border-border-theme-subtle bg-surface-raised text-text-theme-secondary hover:text-text-theme-primary border'
            }`}
          >
            <span>{labelFor(tabId)}</span>
            <span className="ml-2 tabular-nums opacity-70">{count}</span>
          </button>
        );
      })}
    </div>
  );
}

export default CategoryTabs;
