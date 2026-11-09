import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

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
import { SvgIcon } from '@/components/ui/SvgIcon';
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
import { UnitImportDialog } from '@/pages-modules/units/UnitImportDialog';
import { customUnitApiService } from '@/services/units/CustomUnitApiService';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

const EMPTY_FILTERS: FilterState = {
  search: '',
  unitType: '',
  techBase: '',
  rulesLevel: '',
  weightClass: '',
};

interface FilterToolbarProps extends Omit<FilterPanelProps, 'onClearFilters'> {
  readonly onImport: () => void;
  readonly viewMode: ViewMode;
  readonly showFilters: boolean;
  readonly activeFilterCount: number;
  readonly onViewModeChange: (mode: ViewMode) => void;
  readonly onToggleFilters: () => void;
}

interface FilterPanelProps {
  readonly filters: FilterState;
  readonly hasActiveFilters: boolean;
  readonly onFilterChange: <K extends keyof FilterState>(
    key: K,
    value: FilterState[K],
  ) => void;
  readonly onClearFilters: () => void;
}

interface UnitResultsProps {
  readonly units: UnitEntry[];
  readonly displayedUnits: UnitEntry[];
  readonly viewMode: ViewMode;
  readonly onClearFilters: () => void;
}

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

function filterUnits(units: UnitEntry[], filters: FilterState): UnitEntry[] {
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
    result = result.filter((unit) => unit.weightClass === filters.weightClass);
  }

  return result;
}

function FilterToolbar({
  viewMode,
  filters,
  showFilters,
  hasActiveFilters,
  activeFilterCount,
  onViewModeChange,
  onFilterChange,
  onToggleFilters,
  onImport,
}: FilterToolbarProps): React.ReactElement {
  return (
    <div className="mb-6 flex min-w-0 flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <ViewModeToggle mode={viewMode} onChange={onViewModeChange} />

        <div className="w-64 max-w-full">
          <Input
            type="text"
            placeholder="Search units..."
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            accent="emerald"
            aria-label="Search units"
            className="!py-1.5 text-sm"
          />
        </div>

        <button
          onClick={onToggleFilters}
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            showFilters || hasActiveFilters
              ? 'bg-accent text-on-accent'
              : 'bg-surface-raised/50 text-text-theme-primary/80 hover:bg-surface-raised'
          }`}
        >
          <SvgIcon
            size="inline"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            className="h-4 w-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
            />
          </SvgIcon>
          Filters
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-xs">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      <div className="flex shrink-0 flex-wrap gap-2">
        <Button variant="secondary" onClick={onImport}>
          Import Unit
        </Button>
        <Link href="/customizer">
          <Button variant="primary">Create Unit</Button>
        </Link>
      </div>
    </div>
  );
}

function FilterPanel({
  filters,
  hasActiveFilters,
  onFilterChange,
  onClearFilters,
}: FilterPanelProps): React.ReactElement {
  return (
    <div className="bg-surface-base/40 border-border-theme-subtle/50 animate-fadeIn mb-4 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={filters.unitType}
          onChange={(e) => onFilterChange('unitType', e.target.value)}
          options={unitTypeOptions}
          placeholder="Unit Type"
          accent="emerald"
          aria-label="Filter by unit type"
          className="w-40"
        />
        <Select
          value={filters.techBase}
          onChange={(e) =>
            onFilterChange('techBase', e.target.value as TechBase | '')
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
            onFilterChange('rulesLevel', e.target.value as RulesLevel | '')
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
            onFilterChange('weightClass', e.target.value as WeightClass | '')
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
            onClick={onClearFilters}
            className="text-text-theme-secondary hover:text-text-theme-primary"
          >
            Clear All
          </Button>
        )}
      </div>
    </div>
  );
}

function UnitResults({
  units,
  displayedUnits,
  viewMode,
  onClearFilters,
}: UnitResultsProps): React.ReactElement {
  if (units.length === 0) {
    return (
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
    );
  }

  if (displayedUnits.length === 0) {
    return (
      <EmptyState
        title="No units found"
        message="Try adjusting your filters or search terms."
        action={
          <Button variant="secondary" onClick={onClearFilters}>
            Clear Filters
          </Button>
        }
      />
    );
  }

  return (
    <>
      {viewMode === 'grid' && <UnitGridView units={displayedUnits} />}
      {viewMode === 'list' && <UnitCardListView units={displayedUnits} />}
      {viewMode === 'table' && <UnitTableView units={displayedUnits} />}
    </>
  );
}

export default function CustomUnitsListPage(): React.ReactElement {
  const [importOpen, setImportOpen] = useState(false);
  const [units, setUnits] = useState<UnitEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);

  const activeFilterCount = [
    filters.unitType,
    filters.techBase,
    filters.rulesLevel,
    filters.weightClass,
  ].filter(Boolean).length;
  const hasActiveFilters = activeFilterCount > 0;

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

  const filteredUnits = useMemo(
    () => filterUnits(units, filters),
    [units, filters],
  );
  useEffect(() => {
    setCurrentPage(1);
  }, [units, filters]);

  const totalPages = Math.ceil(filteredUnits.length / ITEMS_PER_PAGE);
  const displayedUnits = filteredUnits.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handleFilterChange = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K],
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => setFilters(EMPTY_FILTERS);

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
      <FilterToolbar
        onImport={() => setImportOpen(true)}
        viewMode={viewMode}
        filters={filters}
        showFilters={showFilters}
        hasActiveFilters={hasActiveFilters}
        activeFilterCount={activeFilterCount}
        onViewModeChange={setViewMode}
        onFilterChange={handleFilterChange}
        onToggleFilters={() => setShowFilters(!showFilters)}
      />
      {importOpen && (
        <UnitImportDialog
          onClose={() => setImportOpen(false)}
          onImported={() => {
            void customUnitApiService
              .list()
              .then((entries) => setUnits([...entries]))
              .catch(() =>
                setError(
                  'Unit imported, but the library could not refresh. Reload to retry.',
                ),
              );
          }}
        />
      )}

      {showFilters && (
        <FilterPanel
          filters={filters}
          hasActiveFilters={hasActiveFilters}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
        />
      )}

      <UnitResults
        units={units}
        displayedUnits={displayedUnits}
        viewMode={viewMode}
        onClearFilters={clearFilters}
      />

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
