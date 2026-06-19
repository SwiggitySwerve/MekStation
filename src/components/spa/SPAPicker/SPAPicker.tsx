/**
 * SPAPicker - reusable browser for the SPA catalog.
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

interface IBaseFilterInput {
  readonly allSpas: readonly ISPADefinition[];
  readonly allowedSources: readonly SPASource[] | undefined;
  readonly activeSources: ReadonlySet<SPASource>;
  readonly search: string;
  readonly mode: SPAPickerProps['mode'];
  readonly availableXP: number | undefined;
}

function deriveCategories(allSpas: readonly ISPADefinition[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const spa of allSpas) {
    if (seen.has(spa.category)) continue;
    seen.add(spa.category);
    ordered.push(spa.category);
  }

  return ordered;
}

function deriveVisibleSources(
  allowedSources: readonly SPASource[] | undefined,
): readonly SPASource[] {
  if (!allowedSources) return SPA_ALL_SOURCES;
  const allow = new Set(allowedSources);
  return SPA_ALL_SOURCES.filter((source) => allow.has(source));
}

function matchesAllowedSources(
  spa: ISPADefinition,
  allowedSources: readonly SPASource[] | undefined,
): boolean {
  return !allowedSources || allowedSources.includes(spa.source);
}

function matchesActiveSources(
  spa: ISPADefinition,
  activeSources: ReadonlySet<SPASource>,
): boolean {
  return activeSources.size === 0 || activeSources.has(spa.source);
}

function matchesSearch(spa: ISPADefinition, loweredSearch: string): boolean {
  if (loweredSearch.length === 0) return true;
  const haystack =
    `${spa.displayName} ${spa.description} ${spa.source}`.toLowerCase();
  return haystack.includes(loweredSearch);
}

function isVisibleForPurchaseMode(
  spa: ISPADefinition,
  mode: SPAPickerProps['mode'],
  availableXP: number | undefined,
): boolean {
  if (mode !== 'purchase' || availableXP === undefined) return true;
  return spa.xpCost !== null && spa.xpCost <= availableXP;
}

function filterBaseSpas({
  allSpas,
  allowedSources,
  activeSources,
  search,
  mode,
  availableXP,
}: IBaseFilterInput): readonly ISPADefinition[] {
  const loweredSearch = search.trim().toLowerCase();

  return allSpas.filter(
    (spa) =>
      matchesAllowedSources(spa, allowedSources) &&
      matchesActiveSources(spa, activeSources) &&
      matchesSearch(spa, loweredSearch) &&
      isVisibleForPurchaseMode(spa, mode, availableXP),
  );
}

function countSpasByCategory(
  baseFiltered: readonly ISPADefinition[],
  categories: readonly string[],
): Record<CategoryTabId, number> {
  const next: Record<string, number> = { all: baseFiltered.length };

  for (const category of categories) next[category] = 0;
  for (const spa of baseFiltered) {
    next[spa.category] = (next[spa.category] ?? 0) + 1;
  }

  return next;
}

function filterVisibleSpas(
  baseFiltered: readonly ISPADefinition[],
  activeCategory: CategoryTabId,
): readonly ISPADefinition[] {
  if (activeCategory === 'all') return baseFiltered;
  return baseFiltered.filter((spa) => spa.category === activeCategory);
}

function isUnaffordable(
  spa: ISPADefinition,
  availableXP: number | undefined,
): boolean {
  return (
    availableXP !== undefined && spa.xpCost !== null && spa.xpCost > availableXP
  );
}

function handlePickerEscape({
  event,
  search,
  clearSearch,
  onCancel,
}: {
  readonly event: React.KeyboardEvent<HTMLDivElement>;
  readonly search: string;
  readonly clearSearch: () => void;
  readonly onCancel: (() => void) | undefined;
}): void {
  if (event.key !== 'Escape') return;

  event.preventDefault();
  if (search.length > 0) {
    clearSearch();
    return;
  }

  onCancel?.();
}

function EmptySPAList(): React.ReactElement {
  return (
    <div
      role="status"
      className="border-border-theme-subtle text-text-theme-secondary rounded border border-dashed p-6 text-center text-sm"
    >
      No abilities match these filters.
    </div>
  );
}

function SPAList({
  visible,
  mode,
  excludedSet,
  availableXP,
  onSelect,
}: {
  readonly visible: readonly ISPADefinition[];
  readonly mode: SPAPickerProps['mode'];
  readonly excludedSet: ReadonlySet<string>;
  readonly availableXP: number | undefined;
  readonly onSelect: (
    spa: ISPADefinition,
    designation?: SPADesignation,
  ) => void;
}): React.ReactElement {
  return (
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
          mode={mode ?? 'browse'}
          excluded={excludedSet.has(spa.id)}
          unaffordable={isUnaffordable(spa, availableXP)}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
}

export function SPAPicker({
  onSelect,
  onCancel,
  excludedIds,
  availableXP,
  allowedSources,
  mode = 'browse',
}: SPAPickerProps): React.ReactElement {
  const allSpas = useMemo(() => getAllSPAs(), []);
  const categories = useMemo(() => deriveCategories(allSpas), [allSpas]);
  const visibleSources = useMemo(
    () => deriveVisibleSources(allowedSources),
    [allowedSources],
  );
  const excludedSet = useMemo(
    () => new Set<string>(excludedIds ?? []),
    [excludedIds],
  );

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryTabId>('all');
  const [activeSources, setActiveSources] = useState<ReadonlySet<SPASource>>(
    () => new Set(),
  );

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

  const baseFiltered = useMemo(
    () =>
      filterBaseSpas({
        allSpas,
        allowedSources,
        activeSources,
        search,
        mode,
        availableXP,
      }),
    [allSpas, allowedSources, activeSources, search, mode, availableXP],
  );
  const counts = useMemo(
    () => countSpasByCategory(baseFiltered, categories),
    [baseFiltered, categories],
  );
  const visible = useMemo(
    () => filterVisibleSpas(baseFiltered, activeCategory),
    [baseFiltered, activeCategory],
  );

  const handleRootKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    handlePickerEscape({
      event,
      search,
      clearSearch: () => setSearch(''),
      onCancel,
    });
  };

  const handleItemSelect = useCallback(
    (spa: ISPADefinition, designation?: SPADesignation) => {
      onSelect(spa, designation);
    },
    [onSelect],
  );

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
        <EmptySPAList />
      ) : (
        <SPAList
          visible={visible}
          mode={mode}
          excludedSet={excludedSet}
          availableXP={availableXP}
          onSelect={handleItemSelect}
        />
      )}
    </div>
  );
}

export default SPAPicker;
