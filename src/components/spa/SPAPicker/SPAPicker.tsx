/**
 * SPAPicker — reusable browser for the 91-entry SPA catalog.
 *
 * Wave 1 deliverable for Phase 5 (Pilot SPA UI). This component is the
 * single shared surface every later Phase 5 change consumes:
 *   - pilot editor (Wave 2a) wraps it in a modal + purchase flow,
 *   - pilot sheet display (Wave 2c) reuses the row layout in read-only mode,
 *   - designation persistence (Wave 2b) replaces the stub
 *     `getDesignationOptions()` with the real registry.
 *
 * Architectural notes:
 *   - Catalog comes from `@/lib/spa.getAllSPAs()` — never duplicated.
 *   - Categories tab list is built dynamically from the data so adding
 *     a new SPA category is zero-touch here.
 *   - Empty source-filter set means "no filter" (chip with no chips
 *     pressed = show all rulebooks). Picking a chip narrows the list.
 *   - `availableXP` filters the visible rows in `purchase` mode (hides
 *     anything the pilot can't afford) and dims them in `browse` mode.
 *
 * Accessibility: tablist with arrow-key cycling, labelled search input,
 * `aria-pressed` chips, and Esc to cancel.
 */

import React, { useCallback, useMemo, useState } from 'react';

import type { ISPADefinition, SPASource } from '@/types/spa/SPADefinition';

import { getAllSPAs } from '@/lib/spa';

import { CategoryTabs, type CategoryTabId } from './CategoryTabs';
import { SearchInput } from './SearchInput';
import { SourceFilters } from './SourceFilters';
import { SPAItem } from './SPAItem';
import {
  SPA_ALL_SOURCES,
  type SPADesignation,
  type SPAPickerProps,
} from './types';

/**
 * Composes the picker chrome (tabs + search + source chips) above the
 * filtered SPA list. The list is rendered as a `<ul>` with a unique
 * `id` so the tab list can wire `aria-controls`.
 */
export function SPAPicker({
  onSelect,
  onCancel,
  excludedIds,
  availableXP,
  allowedSources,
  mode = 'browse',
}: SPAPickerProps): React.ReactElement {
  // --- Derived input data ----------------------------------------------------

  // Catalog is module-level constant — `useMemo` keeps a stable reference
  // for the filter pipeline below.
  const allSpas = useMemo(() => getAllSPAs(), []);

  // Categories come from the data; keeps the tab list in sync with the catalog.
  const categories = useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const spa of allSpas) {
      if (!seen.has(spa.category)) {
        seen.add(spa.category);
        ordered.push(spa.category);
      }
    }
    return ordered;
  }, [allSpas]);

  // Source chip list = allowed-sources whitelist intersected with the
  // canonical display order. Defaults to every source.
  const visibleSources = useMemo<readonly SPASource[]>(() => {
    if (!allowedSources) return SPA_ALL_SOURCES;
    const allow = new Set(allowedSources);
    return SPA_ALL_SOURCES.filter((s) => allow.has(s));
  }, [allowedSources]);

  // Excluded id set for O(1) lookup in the row renderer.
  const excludedSet = useMemo(
    () => new Set<string>(excludedIds ?? []),
    [excludedIds],
  );

  // --- Filter state ----------------------------------------------------------

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryTabId>('all');
  const [activeSources, setActiveSources] = useState<ReadonlySet<SPASource>>(
    () => new Set(),
  );

  /** Toggle a single source on/off in the chip filter state. */
  const handleSourceToggle = useCallback((source: SPASource) => {
    setActiveSources((prev) => {
      const next = new Set(prev);
      if (next.has(source)) {
        next.delete(source);
      } else {
        next.add(source);
      }
      return next;
    });
  }, []);

  // --- Filter pipeline -------------------------------------------------------

  /**
   * Applies search + source + affordability filters but NOT the category
   * filter — we need the cross-category counts for the tab strip.
   */
  const baseFiltered = useMemo(() => {
    const lowered = search.trim().toLowerCase();
    return allSpas.filter((spa) => {
      // Source whitelist (when allowedSources is set).
      if (allowedSources && !allowedSources.includes(spa.source)) return false;
      // Active source chips (empty set = no filter).
      if (activeSources.size > 0 && !activeSources.has(spa.source))
        return false;
      // Search across name + description + source, case-insensitive.
      if (lowered.length > 0) {
        const haystack =
          `${spa.displayName} ${spa.description} ${spa.source}`.toLowerCase();
        if (!haystack.includes(lowered)) return false;
      }
      // In purchase mode, hide rows the pilot can't afford. `null` xpCost
      // (bioware / origin-only) is hidden in purchase mode too — the
      // editor will surface those through a separate path in Wave 2a.
      if (mode === 'purchase' && availableXP !== undefined) {
        if (spa.xpCost === null) return false;
        if (spa.xpCost > availableXP) return false;
      }
      return true;
    });
  }, [allSpas, allowedSources, activeSources, search, mode, availableXP]);

  /** Per-category counts based on `baseFiltered` (drives tab badges). */
  const counts = useMemo<Record<CategoryTabId, number>>(() => {
    const next: Record<string, number> = { all: baseFiltered.length };
    for (const cat of categories) next[cat] = 0;
    for (const spa of baseFiltered) {
      next[spa.category] = (next[spa.category] ?? 0) + 1;
    }
    return next;
  }, [baseFiltered, categories]);

  /** Final visible list — applies the category tab on top of base filters. */
  const visible = useMemo(() => {
    if (activeCategory === 'all') return baseFiltered;
    return baseFiltered.filter((spa) => spa.category === activeCategory);
  }, [baseFiltered, activeCategory]);

  // --- Keyboard handling -----------------------------------------------------

  /**
   * Esc cancels the picker WHEN search is empty — otherwise Esc clears
   * the search input first (handled by SearchInput's clear button click).
   * This avoids accidental dismissals while a user is typing.
   */
  const handleRootKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'Escape') {
      if (search.length > 0) {
        e.preventDefault();
        setSearch('');
        return;
      }
      if (onCancel) {
        e.preventDefault();
        onCancel();
      }
    }
  };

  /** Forwarded selection emitter (preserves stable identity for SPAItem). */
  const handleItemSelect = useCallback(
    (spa: ISPADefinition, designation?: SPADesignation) => {
      onSelect(spa, designation);
    },
    [onSelect],
  );

  // --- Render ----------------------------------------------------------------

  return (
    <div
      className="flex flex-col gap-3"
      onKeyDown={handleRootKeyDown}
      data-testid="spa-picker"
    >
      <CategoryTabs
        categories={categories}
        counts={counts}
        selected={activeCategory}
        onSelect={setActiveCategory}
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SearchInput value={search} onChange={setSearch} />
        <SourceFilters
          sources={visibleSources}
          active={activeSources}
          onToggle={handleSourceToggle}
        />
      </div>

      {visible.length === 0 ? (
        <div
          role="status"
          className="border-border-theme-subtle text-text-theme-secondary rounded border border-dashed p-6 text-center text-sm"
        >
          No abilities match these filters.
        </div>
      ) : (
        <ul
          id="spa-picker-list"
          role="tabpanel"
          className="flex flex-col gap-2"
          aria-label="Special pilot abilities"
        >
          {visible.map((spa) => (
            <SPAItem
              key={spa.id}
              spa={spa}
              mode={mode}
              excluded={excludedSet.has(spa.id)}
              unaffordable={
                availableXP !== undefined &&
                spa.xpCost !== null &&
                spa.xpCost > availableXP
              }
              onSelect={handleItemSelect}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

export default SPAPicker;
