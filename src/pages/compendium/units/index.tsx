/**
 * Canonical Units Browser Page (Compendium Section)
 * Browse and search the canonical unit database with filtering and sorting.
 */
import { useEffect, useState, useCallback, useMemo } from 'react';

import { CompendiumLayout } from '@/components/compendium';
import { ITEMS_PER_PAGE } from '@/components/compendium/units/units.constants';
import {
  sortUnits,
  type SortState,
} from '@/components/compendium/units/units.helpers';
import {
  UnitsFilters,
  type FilterState,
} from '@/components/compendium/units/UnitsFilters';
import { UnitsTable } from '@/components/compendium/units/UnitsTable';
import { PageLoading, PageError, PaginationButtons } from '@/components/ui';
import { IUnitEntry } from '@/types/pages';

const EMPTY_FILTERS: FilterState = {
  search: '',
  techBase: '',
  weightClass: '',
  rulesLevel: '',
  yearMin: '',
  yearMax: '',
  tonnageMin: '',
  tonnageMax: '',
  bvMin: '',
  bvMax: '',
};

function parseNumericFilter(value: string): number | null {
  if (!value) return null;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

interface NumericFilterValues {
  readonly minYear: number | null;
  readonly maxYear: number | null;
  readonly minTon: number | null;
  readonly maxTon: number | null;
  readonly minBV: number | null;
  readonly maxBV: number | null;
}

function numericFilterValues(filters: FilterState): NumericFilterValues {
  return {
    minYear: parseNumericFilter(filters.yearMin),
    maxYear: parseNumericFilter(filters.yearMax),
    minTon: parseNumericFilter(filters.tonnageMin),
    maxTon: parseNumericFilter(filters.tonnageMax),
    minBV: parseNumericFilter(filters.bvMin),
    maxBV: parseNumericFilter(filters.bvMax),
  };
}

function unitMatchesSearch(unit: IUnitEntry, searchLower: string): boolean {
  return (
    !searchLower ||
    unit.name.toLowerCase().includes(searchLower) ||
    unit.chassis.toLowerCase().includes(searchLower) ||
    unit.variant.toLowerCase().includes(searchLower)
  );
}

function unitMatchesSelectFilters(
  unit: IUnitEntry,
  filters: FilterState,
): boolean {
  if (filters.techBase && unit.techBase !== filters.techBase) return false;
  if (filters.weightClass && unit.weightClass !== filters.weightClass) {
    return false;
  }
  if (filters.rulesLevel && unit.rulesLevel !== filters.rulesLevel) {
    return false;
  }
  return true;
}

function unitMatchesNumericFilters(
  unit: IUnitEntry,
  values: NumericFilterValues,
): boolean {
  if (values.minYear !== null && (unit.year ?? 0) < values.minYear) {
    return false;
  }
  if (values.maxYear !== null && (unit.year ?? 9999) > values.maxYear) {
    return false;
  }
  if (values.minTon !== null && unit.tonnage < values.minTon) return false;
  if (values.maxTon !== null && unit.tonnage > values.maxTon) return false;
  if (values.minBV !== null && (unit.bv ?? 0) < values.minBV) return false;
  if (values.maxBV !== null && (unit.bv ?? 99999) > values.maxBV) {
    return false;
  }
  return true;
}

function filterUnits(
  units: readonly IUnitEntry[],
  filters: FilterState,
): IUnitEntry[] {
  const searchLower = filters.search.toLowerCase();
  const numericFilters = numericFilterValues(filters);

  return units.filter(
    (unit) =>
      unitMatchesSearch(unit, searchLower) &&
      unitMatchesSelectFilters(unit, filters) &&
      unitMatchesNumericFilters(unit, numericFilters),
  );
}

function hasAdvancedFilterValues(filters: FilterState): boolean {
  return Boolean(
    filters.yearMin ||
    filters.yearMax ||
    filters.tonnageMin ||
    filters.tonnageMax ||
    filters.bvMin ||
    filters.bvMax,
  );
}

function nextSortState(
  sort: SortState,
  column: SortState['column'],
): SortState {
  return {
    column,
    direction:
      sort.column === column && sort.direction === 'asc' ? 'desc' : 'asc',
  };
}

export default function CanonicalUnitsListPage(): React.ReactElement {
  const [units, setUnits] = useState<IUnitEntry[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<IUnitEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sort, setSort] = useState<SortState>({
    column: 'chassis',
    direction: 'asc',
  });

  // Fetch units on mount
  useEffect(() => {
    async function fetchUnits() {
      try {
        const response = await fetch('/api/catalog');
        const data = (await response.json()) as {
          success: boolean;
          data?: IUnitEntry[];
          error?: string;
        };

        if (data.success) {
          setUnits(data.data || []);
          setFilteredUnits(data.data || []);
        } else {
          setError(data.error || 'Failed to load units');
        }
      } catch {
        setError('Failed to connect to server');
      } finally {
        setLoading(false);
      }
    }

    fetchUnits();
  }, []);

  // Apply filters
  const applyFilters = useCallback(() => {
    setFilteredUnits(filterUnits(units, filters));
    setCurrentPage(1);
  }, [units, filters]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const sortedUnits = useMemo(
    () => sortUnits(filteredUnits, sort),
    [filteredUnits, sort],
  );

  const handleSort = (column: SortState['column']) => {
    setSort((prev) => nextSortState(prev, column));
    setCurrentPage(1);
  };

  // Pagination
  const totalPages = Math.ceil(sortedUnits.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const displayedUnits = sortedUnits.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
  };

  // Check if any advanced filters are active
  const hasAdvancedFilters = hasAdvancedFilterValues(filters);

  if (loading) {
    return <PageLoading message="Loading unit database..." />;
  }

  if (error) {
    return (
      <PageError
        title="Error Loading Units"
        message={error}
        backLink="/compendium"
        backLabel="Back to Compendium"
      />
    );
  }

  return (
    <CompendiumLayout
      title="Unit Database"
      subtitle={`Browse ${units.length.toLocaleString()} canonical units from all eras`}
      breadcrumbs={[{ label: 'Units' }]}
      maxWidth="full"
    >
      <UnitsFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={clearFilters}
        showAdvancedFilters={showAdvancedFilters}
        onToggleAdvancedFilters={() =>
          setShowAdvancedFilters(!showAdvancedFilters)
        }
        hasAdvancedFilters={hasAdvancedFilters}
        displayedCount={displayedUnits.length}
        filteredCount={filteredUnits.length}
        totalCount={units.length}
      />

      <UnitsTable units={displayedUnits} sort={sort} onSort={handleSort} />

      {totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <PaginationButtons
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </CompendiumLayout>
  );
}
