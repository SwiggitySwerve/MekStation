import { useEffect, useState } from 'react';

import type { IUnitIndexEntry } from '@/services/common/types';
import type { ISkirmishUnitSelection } from '@/utils/gameplay/preBattleSessionBuilder';

import { getCanonicalUnitService } from '@/services/units/CanonicalUnitService';

export type TonnageFilter = 'all' | 'light' | 'medium' | 'heavy' | 'assault';

interface UnitCatalogState {
  readonly catalog: readonly IUnitIndexEntry[];
  readonly isLoading: boolean;
  readonly loadError: string | null;
}

const TONNAGE_FILTERS: Record<TonnageFilter, (tonnage: number) => boolean> = {
  all: () => true,
  light: (tonnage) => tonnage <= 35,
  medium: (tonnage) => tonnage > 35 && tonnage <= 55,
  heavy: (tonnage) => tonnage > 55 && tonnage <= 75,
  assault: (tonnage) => tonnage > 75,
};

export function useCanonicalUnitCatalog(): UnitCatalogState {
  const [catalog, setCatalog] = useState<readonly IUnitIndexEntry[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    getCanonicalUnitService()
      .getIndex()
      .then((index) => {
        if (cancelled) {
          return;
        }
        setCatalog(index);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        setLoadError(
          err instanceof Error ? err.message : 'Failed to load unit catalog',
        );
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return (): void => {
      cancelled = true;
    };
  }, []);

  return { catalog, isLoading, loadError };
}

export function toSelection(entry: IUnitIndexEntry): ISkirmishUnitSelection {
  return {
    unitId: entry.id,
    designation: `${entry.chassis} ${entry.variant}`.trim(),
    tonnage: entry.tonnage,
    bv: entry.bv ?? 0,
    pilot: null,
  };
}

export function filterCatalog({
  catalog,
  selectedUnits,
  searchQuery,
  tonnageFilter,
}: {
  readonly catalog: readonly IUnitIndexEntry[];
  readonly selectedUnits: readonly ISkirmishUnitSelection[];
  readonly searchQuery: string;
  readonly tonnageFilter: TonnageFilter;
}): readonly IUnitIndexEntry[] {
  const selectedIds = new Set(selectedUnits.map((unit) => unit.unitId));
  const query = searchQuery.trim().toLowerCase();

  return catalog
    .filter((entry) => !selectedIds.has(entry.id))
    .filter((entry) => matchesSearch(entry, query))
    .filter((entry) => TONNAGE_FILTERS[tonnageFilter](entry.tonnage))
    .slice(0, 50);
}

export function CatalogPicker({
  side,
  title,
  searchQuery,
  tonnageFilter,
  isLoading,
  loadError,
  filteredCatalog,
  remainingSlots,
  isFull,
  maxUnits,
  setSearchQuery,
  setTonnageFilter,
  onAdd,
}: {
  readonly side: 'player' | 'opponent';
  readonly title: string;
  readonly searchQuery: string;
  readonly tonnageFilter: TonnageFilter;
  readonly isLoading: boolean;
  readonly loadError: string | null;
  readonly filteredCatalog: readonly IUnitIndexEntry[];
  readonly remainingSlots: number;
  readonly isFull: boolean;
  readonly maxUnits: number;
  readonly setSearchQuery: (value: string) => void;
  readonly setTonnageFilter: (value: TonnageFilter) => void;
  readonly onAdd: (selection: ISkirmishUnitSelection) => void;
}): React.ReactElement {
  if (isFull) {
    return <RosterFullMessage side={side} maxUnits={maxUnits} />;
  }

  return (
    <div className="border-border-theme-subtle border-t pt-4">
      <CatalogControls
        side={side}
        title={title}
        searchQuery={searchQuery}
        tonnageFilter={tonnageFilter}
        setSearchQuery={setSearchQuery}
        setTonnageFilter={setTonnageFilter}
      />
      <CatalogResults
        side={side}
        title={title}
        isLoading={isLoading}
        loadError={loadError}
        filteredCatalog={filteredCatalog}
        remainingSlots={remainingSlots}
        onAdd={onAdd}
      />
    </div>
  );
}

function CatalogControls({
  side,
  title,
  searchQuery,
  tonnageFilter,
  setSearchQuery,
  setTonnageFilter,
}: {
  readonly side: 'player' | 'opponent';
  readonly title: string;
  readonly searchQuery: string;
  readonly tonnageFilter: TonnageFilter;
  readonly setSearchQuery: (value: string) => void;
  readonly setTonnageFilter: (value: TonnageFilter) => void;
}): React.ReactElement {
  return (
    <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-2">
      <input
        type="text"
        placeholder="Search by chassis or variant"
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        className="bg-surface-theme text-text-theme-primary border-border-theme rounded border px-2 py-1 text-sm"
        data-testid={`${side}-search-input`}
        aria-label={`Search units for ${title}`}
      />
      <select
        value={tonnageFilter}
        onChange={(event) =>
          setTonnageFilter(event.target.value as TonnageFilter)
        }
        className="bg-surface-theme text-text-theme-primary border-border-theme rounded border px-2 py-1 text-sm"
        data-testid={`${side}-tonnage-filter`}
        aria-label={`Filter by weight class for ${title}`}
      >
        <option value="all">All weights</option>
        <option value="light">Light (≤35T)</option>
        <option value="medium">Medium (36–55T)</option>
        <option value="heavy">Heavy (56–75T)</option>
        <option value="assault">Assault (76T+)</option>
      </select>
    </div>
  );
}

function CatalogResults({
  side,
  title,
  isLoading,
  loadError,
  filteredCatalog,
  remainingSlots,
  onAdd,
}: {
  readonly side: 'player' | 'opponent';
  readonly title: string;
  readonly isLoading: boolean;
  readonly loadError: string | null;
  readonly filteredCatalog: readonly IUnitIndexEntry[];
  readonly remainingSlots: number;
  readonly onAdd: (selection: ISkirmishUnitSelection) => void;
}): React.ReactElement {
  if (isLoading) {
    return <p className="text-text-theme-muted text-sm">Loading catalog…</p>;
  }

  if (loadError) {
    return (
      <p
        className="text-sm text-amber-400"
        data-testid={`${side}-catalog-error`}
      >
        Catalog error: {loadError}
      </p>
    );
  }

  if (filteredCatalog.length === 0) {
    return (
      <p
        className="text-text-theme-muted text-sm"
        data-testid={`${side}-no-results`}
      >
        No units match the current filter.
      </p>
    );
  }

  return (
    <ul
      className="max-h-64 space-y-1 overflow-y-auto"
      data-testid={`${side}-catalog-list`}
      aria-label={`${title} available units (${remainingSlots} slot(s) open)`}
    >
      {filteredCatalog.map((entry) => (
        <CatalogUnitRow
          key={entry.id}
          side={side}
          entry={entry}
          onAdd={onAdd}
        />
      ))}
    </ul>
  );
}

function CatalogUnitRow({
  side,
  entry,
  onAdd,
}: {
  readonly side: 'player' | 'opponent';
  readonly entry: IUnitIndexEntry;
  readonly onAdd: (selection: ISkirmishUnitSelection) => void;
}): React.ReactElement {
  return (
    <li>
      <button
        type="button"
        onClick={() => onAdd(toSelection(entry))}
        className="bg-surface-theme hover:bg-surface-raised border-border-theme-subtle flex w-full items-center justify-between rounded border px-3 py-2 text-left text-sm transition-colors"
        data-testid={`${side}-catalog-${entry.id}`}
        aria-label={`Add ${entry.chassis} ${entry.variant}`}
      >
        <span>
          <span className="text-text-theme-primary font-medium">
            {entry.chassis} {entry.variant}
          </span>
          <span className="text-text-theme-muted ml-2 text-xs">
            {entry.tonnage}T
            {entry.bv ? ` · ${entry.bv.toLocaleString()} BV` : ''}
          </span>
        </span>
        <span className="text-text-theme-muted text-xs">Add</span>
      </button>
    </li>
  );
}

function RosterFullMessage({
  side,
  maxUnits,
}: {
  readonly side: 'player' | 'opponent';
  readonly maxUnits: number;
}): React.ReactElement {
  return (
    <p
      className="text-text-theme-muted mt-2 text-xs"
      data-testid={`${side}-roster-full-msg`}
    >
      Roster full ({maxUnits} of {maxUnits}). Remove a unit to swap.
    </p>
  );
}

function matchesSearch(entry: IUnitIndexEntry, query: string): boolean {
  if (!query) return true;
  return (
    entry.name.toLowerCase().includes(query) ||
    entry.chassis.toLowerCase().includes(query) ||
    entry.variant.toLowerCase().includes(query)
  );
}
