import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import type { ViewMode } from '@/components/ui';
import type { FilterState, UnitEntry } from '@/pages-modules/units/list.types';

import {
  Button,
  EmptyState,
  Input,
  PageError,
  PageLayout,
  PageLoading,
  PaginationButtons,
  Select,
  ViewModeToggle,
} from '@/components/ui';
import {
  ITEMS_PER_PAGE,
  UNIT_TYPE_CONFIG,
  WEIGHT_CLASS_CONFIG,
} from '@/pages-modules/units/list.constants';
import {
  UnitCardListView,
  UnitGridView,
  UnitTableView,
} from '@/pages-modules/units/list.views';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

export default function CustomUnitsListPage(): React.ReactElement {
  const [units, setUnits] = useState<UnitEntry[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<UnitEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    unitType: '',
    techBase: '',
    rulesLevel: '',
    weightClass: '',
  });

  const hasActiveFilters =
    filters.unitType ||
    filters.techBase ||
    filters.rulesLevel ||
    filters.weightClass;

  const activeFilterCount = [
    filters.unitType,
    filters.techBase,
    filters.rulesLevel,
    filters.weightClass,
  ].filter(Boolean).length;

  const unitTypeOptions = Object.values(UnitType).map((ut) => ({
    value: ut,
    label: UNIT_TYPE_CONFIG[ut]?.label ?? ut,
  }));

  const techBaseOptions = Object.values(TechBase).map((tb) => ({
    value: tb,
    label: tb,
  }));

  const rulesLevelOptions = Object.values(RulesLevel).map((rl) => ({
    value: rl,
    label: rl,
  }));

  const weightClassOptions = Object.values(WeightClass).map((wc) => ({
    value: wc,
    label: WEIGHT_CLASS_CONFIG[wc]?.label ?? wc,
  }));

  useEffect(() => {
    async function fetchUnits() {
      try {
        const response = await fetch('/api/units/custom');
        const data = (await response.json()) as {
          units?: UnitEntry[];
          error?: string;
        };

        if (data.units) {
          setUnits(data.units);
          setFilteredUnits(data.units);
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

  const applyFilters = useCallback(() => {
    let result = [...units];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (unit) =>
          unit.chassis.toLowerCase().includes(searchLower) ||
          unit.variant.toLowerCase().includes(searchLower) ||
          `${unit.chassis} ${unit.variant}`.toLowerCase().includes(searchLower),
      );
    }

    if (filters.unitType) {
      result = result.filter((unit) => unit.unitType === filters.unitType);
    }

    if (filters.techBase) {
      result = result.filter((unit) => unit.techBase === filters.techBase);
    }

    if (filters.rulesLevel) {
      result = result.filter((unit) => unit.rulesLevel === filters.rulesLevel);
    }

    if (filters.weightClass) {
      result = result.filter(
        (unit) => unit.weightClass === filters.weightClass,
      );
    }

    setFilteredUnits(result);
    setCurrentPage(1);
  }, [units, filters]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const totalPages = Math.ceil(filteredUnits.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const displayedUnits = filteredUnits.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  const handleFilterChange = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K],
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      unitType: '',
      techBase: '',
      rulesLevel: '',
      weightClass: '',
    });
  };

  if (loading) {
    return <PageLoading message="Loading custom units..." />;
  }

  if (error) {
    return <PageError title="Error Loading Units" message={error} />;
  }

  return (
    <PageLayout
      title="Custom Units"
      subtitle={`${filteredUnits.length} custom units`}
      maxWidth="wide"
    >
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ViewModeToggle mode={viewMode} onChange={setViewMode} />

          <div className="w-64">
            <Input
              type="text"
              placeholder="Search units..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              accent="emerald"
              aria-label="Search units"
              className="!py-1.5 text-sm"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              showFilters || hasActiveFilters
                ? 'bg-accent text-text-theme-primary'
                : 'bg-surface-raised/50 text-text-theme-primary/80 hover:bg-surface-raised'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
              />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-xs">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        <Link href="/customizer">
          <Button variant="primary">Create Unit</Button>
        </Link>
      </div>

      {showFilters && (
        <div className="bg-surface-base/40 border-border-theme-subtle/50 animate-fadeIn mb-4 rounded-lg border p-3">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={filters.unitType}
              onChange={(e) => handleFilterChange('unitType', e.target.value)}
              options={unitTypeOptions}
              placeholder="Unit Type"
              accent="emerald"
              aria-label="Filter by unit type"
              className="w-40"
            />
            <Select
              value={filters.techBase}
              onChange={(e) =>
                handleFilterChange('techBase', e.target.value as TechBase | '')
              }
              options={techBaseOptions}
              placeholder="Tech Base"
              accent="emerald"
              aria-label="Filter by tech base"
              className="w-36"
            />
            <Select
              value={filters.rulesLevel}
              onChange={(e) =>
                handleFilterChange(
                  'rulesLevel',
                  e.target.value as RulesLevel | '',
                )
              }
              options={rulesLevelOptions}
              placeholder="Rules Level"
              accent="emerald"
              aria-label="Filter by rules level"
              className="w-36"
            />
            <Select
              value={filters.weightClass}
              onChange={(e) =>
                handleFilterChange(
                  'weightClass',
                  e.target.value as WeightClass | '',
                )
              }
              options={weightClassOptions}
              placeholder="Weight Class"
              accent="emerald"
              aria-label="Filter by weight class"
              className="w-36"
            />
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-text-theme-secondary hover:text-text-theme-primary"
              >
                Clear All
              </Button>
            )}
          </div>
        </div>
      )}

      {units.length === 0 ? (
        <EmptyState
          title="No custom units yet"
          message="Create custom units using the unit builder or import existing units."
          action={
            <div className="flex gap-3">
              <Link href="/customizer">
                <Button variant="primary">Create Unit</Button>
              </Link>
            </div>
          }
        />
      ) : displayedUnits.length === 0 ? (
        <EmptyState
          title="No units found"
          message="Try adjusting your filters or search terms."
          action={
            <Button variant="secondary" onClick={clearFilters}>
              Clear Filters
            </Button>
          }
        />
      ) : (
        <>
          {viewMode === 'grid' && <UnitGridView units={displayedUnits} />}
          {viewMode === 'list' && <UnitCardListView units={displayedUnits} />}
          {viewMode === 'table' && <UnitTableView units={displayedUnits} />}
        </>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-text-theme-muted text-xs">
            Page {currentPage} of {totalPages}
          </span>
          <PaginationButtons
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </PageLayout>
  );
}
