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

export default function CanonicalUnitsListPage(): React.ReactElement {
  const [units, setUnits] = useState<IUnitEntry[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<IUnitEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<FilterState>({
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
  });
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
    let result = [...units];

    // Text search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (unit) =>
          unit.name.toLowerCase().includes(searchLower) ||
          unit.chassis.toLowerCase().includes(searchLower) ||
          unit.variant.toLowerCase().includes(searchLower),
      );
    }

    // Tech base filter
    if (filters.techBase) {
      result = result.filter((unit) => unit.techBase === filters.techBase);
    }

    // Weight class filter
    if (filters.weightClass) {
      result = result.filter(
        (unit) => unit.weightClass === filters.weightClass,
      );
    }

    // Rules level filter
    if (filters.rulesLevel) {
      result = result.filter((unit) => unit.rulesLevel === filters.rulesLevel);
    }

    // Year range filter
    if (filters.yearMin) {
      const minYear = parseInt(filters.yearMin, 10);
      if (!isNaN(minYear)) {
        result = result.filter((unit) => (unit.year ?? 0) >= minYear);
      }
    }
    if (filters.yearMax) {
      const maxYear = parseInt(filters.yearMax, 10);
      if (!isNaN(maxYear)) {
        result = result.filter((unit) => (unit.year ?? 9999) <= maxYear);
      }
    }

    // Tonnage range filter
    if (filters.tonnageMin) {
      const minTon = parseInt(filters.tonnageMin, 10);
      if (!isNaN(minTon)) {
        result = result.filter((unit) => unit.tonnage >= minTon);
      }
    }
    if (filters.tonnageMax) {
      const maxTon = parseInt(filters.tonnageMax, 10);
      if (!isNaN(maxTon)) {
        result = result.filter((unit) => unit.tonnage <= maxTon);
      }
    }

    // BV range filter
    if (filters.bvMin) {
      const minBV = parseInt(filters.bvMin, 10);
      if (!isNaN(minBV)) {
        result = result.filter((unit) => (unit.bv ?? 0) >= minBV);
      }
    }
    if (filters.bvMax) {
      const maxBV = parseInt(filters.bvMax, 10);
      if (!isNaN(maxBV)) {
        result = result.filter((unit) => (unit.bv ?? 99999) <= maxBV);
      }
    }

    setFilteredUnits(result);
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
    setSort((prev) => ({
      column,
      direction:
        prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
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
    setFilters({
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
    });
  };

  // Check if any advanced filters are active
  const hasAdvancedFilters = Boolean(
    filters.yearMin ||
    filters.yearMax ||
    filters.tonnageMin ||
    filters.tonnageMax ||
    filters.bvMin ||
    filters.bvMax,
  );

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
