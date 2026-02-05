/**
 * Custom Units Browser Page
 * Browse and search user-created custom units with filtering.
 */
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState, useCallback } from 'react';

import type { ViewMode } from '@/components/ui';

import {
  PageLayout,
  PageLoading,
  PageError,
  Badge,
  TechBaseBadge,
  Button,
  PaginationButtons,
  Input,
  Select,
  EmptyState,
  ViewModeToggle,
} from '@/components/ui';
import { UnitCardCompact } from '@/components/unit-card';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

interface UnitEntry {
  id: string;
  chassis: string;
  variant: string;
  tonnage: number;
  techBase: TechBase;
  era: string;
  rulesLevel: RulesLevel;
  unitType: string;
  weightClass: WeightClass;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
}

interface FilterState {
  search: string;
  unitType: string;
  techBase: TechBase | '';
  rulesLevel: RulesLevel | '';
  weightClass: WeightClass | '';
}

const ITEMS_PER_PAGE = 36;

// Unit type display configuration
const UNIT_TYPE_CONFIG: Record<
  string,
  { label: string; badgeVariant: string; color: string }
> = {
  [UnitType.BATTLEMECH]: {
    label: 'BattleMech',
    badgeVariant: 'emerald',
    color: 'bg-emerald-500',
  },
  [UnitType.OMNIMECH]: {
    label: 'OmniMech',
    badgeVariant: 'teal',
    color: 'bg-teal-500',
  },
  [UnitType.INDUSTRIALMECH]: {
    label: 'IndustrialMech',
    badgeVariant: 'slate',
    color: 'bg-slate-500',
  },
  [UnitType.PROTOMECH]: {
    label: 'ProtoMech',
    badgeVariant: 'violet',
    color: 'bg-violet-500',
  },
  [UnitType.VEHICLE]: {
    label: 'Vehicle',
    badgeVariant: 'amber',
    color: 'bg-amber-500',
  },
  [UnitType.VTOL]: { label: 'VTOL', badgeVariant: 'sky', color: 'bg-sky-500' },
  [UnitType.SUPPORT_VEHICLE]: {
    label: 'Support Vehicle',
    badgeVariant: 'slate',
    color: 'bg-slate-400',
  },
  [UnitType.AEROSPACE]: {
    label: 'Aerospace',
    badgeVariant: 'cyan',
    color: 'bg-cyan-500',
  },
  [UnitType.CONVENTIONAL_FIGHTER]: {
    label: 'Conv. Fighter',
    badgeVariant: 'sky',
    color: 'bg-sky-400',
  },
  [UnitType.SMALL_CRAFT]: {
    label: 'Small Craft',
    badgeVariant: 'indigo',
    color: 'bg-indigo-500',
  },
  [UnitType.DROPSHIP]: {
    label: 'DropShip',
    badgeVariant: 'fuchsia',
    color: 'bg-fuchsia-500',
  },
  [UnitType.JUMPSHIP]: {
    label: 'JumpShip',
    badgeVariant: 'purple',
    color: 'bg-purple-500',
  },
  [UnitType.WARSHIP]: {
    label: 'WarShip',
    badgeVariant: 'rose',
    color: 'bg-rose-500',
  },
  [UnitType.SPACE_STATION]: {
    label: 'Space Station',
    badgeVariant: 'pink',
    color: 'bg-pink-500',
  },
  [UnitType.INFANTRY]: {
    label: 'Infantry',
    badgeVariant: 'lime',
    color: 'bg-lime-500',
  },
  [UnitType.BATTLE_ARMOR]: {
    label: 'Battle Armor',
    badgeVariant: 'yellow',
    color: 'bg-yellow-500',
  },
};

// Weight class display configuration
const WEIGHT_CLASS_CONFIG: Record<
  WeightClass,
  { label: string; color: string }
> = {
  [WeightClass.ULTRALIGHT]: { label: 'Ultralight', color: 'text-slate-400' },
  [WeightClass.LIGHT]: { label: 'Light', color: 'text-green-400' },
  [WeightClass.MEDIUM]: { label: 'Medium', color: 'text-yellow-400' },
  [WeightClass.HEAVY]: { label: 'Heavy', color: 'text-orange-400' },
  [WeightClass.ASSAULT]: { label: 'Assault', color: 'text-red-400' },
  [WeightClass.SUPERHEAVY]: { label: 'Superheavy', color: 'text-rose-500' },
};

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

  // Build select options
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

  // Fetch units on mount
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

  // Apply filters
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

  // Pagination
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
      {/* Header Actions */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <ViewModeToggle mode={viewMode} onChange={setViewMode} />

          {/* Search */}
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

          {/* Filter Toggle Button */}
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

      {/* Collapsible Filter Panel */}
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

      {/* Empty State for no units */}
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

      {/* Pagination - Compact */}
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

// ============================================================================
// View Components
// ============================================================================

interface ViewProps {
  units: UnitEntry[];
}

function getUnitTypeDisplay(unitType: string) {
  return (
    UNIT_TYPE_CONFIG[unitType] || {
      label: unitType,
      badgeVariant: 'slate',
      color: 'bg-slate-500',
    }
  );
}

function getWeightClassDisplay(weightClass: WeightClass) {
  return (
    WEIGHT_CLASS_CONFIG[weightClass] || {
      label: weightClass,
      color: 'text-slate-400',
    }
  );
}

// Grid View - Compact cards
function UnitGridView({ units }: ViewProps): React.ReactElement {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {units.map((unit) => {
        const typeDisplay = getUnitTypeDisplay(unit.unitType);
        const weightDisplay = getWeightClassDisplay(unit.weightClass);

        return (
          <Link key={unit.id} href={`/units/${encodeURIComponent(unit.id)}`}>
            <div className="group bg-surface-base/40 border-border-theme-subtle/50 hover:bg-surface-base/60 hover:border-accent/50 cursor-pointer rounded-lg border p-3 transition-all">
              {/* Header row */}
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="text-text-theme-primary group-hover:text-accent/90 line-clamp-1 text-sm leading-tight font-medium">
                    {unit.chassis}
                  </h3>
                  <p className="text-text-theme-secondary truncate text-xs">
                    {unit.variant}
                  </p>
                </div>
                <TechBaseBadge techBase={unit.techBase} />
              </div>

              {/* Stats row */}
              <div className="text-text-theme-secondary mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span className={`font-medium ${weightDisplay.color}`}>
                  {unit.tonnage}t
                </span>
                <span className={weightDisplay.color}>
                  {weightDisplay.label}
                </span>
              </div>

              {/* Type badge */}
              <Badge
                variant={
                  typeDisplay.badgeVariant as
                    | 'emerald'
                    | 'teal'
                    | 'slate'
                    | 'violet'
                    | 'amber'
                    | 'sky'
                    | 'cyan'
                    | 'fuchsia'
                    | 'rose'
                    | 'lime'
                    | 'yellow'
                }
                size="sm"
              >
                {typeDisplay.label}
              </Badge>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// Card List View - Uses UnitCardCompact components
function UnitCardListView({ units }: ViewProps): React.ReactElement {
  const router = useRouter();

  return (
    <div className="space-y-2">
      {units.map((unit) => {
        const weightDisplay = getWeightClassDisplay(unit.weightClass);
        // TODO: These fields are not in UnitEntry yet - would need API update
        // For now, use placeholder values
        const battleValue = 0;
        const walkMP = 0;
        const runMP = 0;
        const jumpMP = 0;

        return (
          <UnitCardCompact
            key={unit.id}
            id={unit.id}
            name={`${unit.chassis} ${unit.variant}`}
            chassis={unit.chassis}
            model={unit.variant}
            tonnage={unit.tonnage}
            weightClassName={weightDisplay.label}
            techBaseName={unit.techBase}
            battleValue={battleValue}
            rulesLevelName={unit.rulesLevel}
            walkMP={walkMP}
            runMP={runMP}
            jumpMP={jumpMP}
            onClick={() => router.push(`/units/${encodeURIComponent(unit.id)}`)}
          />
        );
      })}
    </div>
  );
}

// Table View - Compact data table
function UnitTableView({ units }: ViewProps): React.ReactElement {
  return (
    <div className="bg-surface-base/30 border-border-theme-subtle/50 overflow-hidden rounded-lg border">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-base/60 border-border-theme-subtle/50 border-b">
              <th className="text-text-theme-secondary px-3 py-2 text-left text-xs font-semibold tracking-wider uppercase">
                Unit
              </th>
              <th className="text-text-theme-secondary px-3 py-2 text-left text-xs font-semibold tracking-wider uppercase">
                Type
              </th>
              <th className="text-text-theme-secondary px-3 py-2 text-center text-xs font-semibold tracking-wider uppercase">
                Tech
              </th>
              <th className="text-text-theme-secondary px-3 py-2 text-right text-xs font-semibold tracking-wider uppercase">
                Tons
              </th>
              <th className="text-text-theme-secondary px-3 py-2 text-left text-xs font-semibold tracking-wider uppercase">
                Class
              </th>
              <th className="text-text-theme-secondary px-3 py-2 text-left text-xs font-semibold tracking-wider uppercase">
                Era
              </th>
            </tr>
          </thead>
          <tbody className="divide-border-theme-subtle/30 divide-y">
            {units.map((unit) => {
              const typeDisplay = getUnitTypeDisplay(unit.unitType);
              const weightDisplay = getWeightClassDisplay(unit.weightClass);

              return (
                <tr
                  key={unit.id}
                  className="hover:bg-surface-raised/20 cursor-pointer transition-colors"
                  onClick={() =>
                    (window.location.href = `/units/${encodeURIComponent(unit.id)}`)
                  }
                >
                  <td className="px-3 py-2">
                    <div>
                      <span className="text-text-theme-primary font-medium">
                        {unit.chassis}
                      </span>
                      <span className="text-text-theme-secondary ml-1">
                        {unit.variant}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <Badge
                      variant={
                        typeDisplay.badgeVariant as
                          | 'emerald'
                          | 'teal'
                          | 'slate'
                          | 'violet'
                          | 'amber'
                          | 'sky'
                          | 'cyan'
                          | 'fuchsia'
                          | 'rose'
                          | 'lime'
                          | 'yellow'
                      }
                      size="sm"
                    >
                      {typeDisplay.label}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <TechBaseBadge techBase={unit.techBase} />
                  </td>
                  <td className="text-text-theme-primary/80 px-3 py-2 text-right font-mono">
                    {unit.tonnage}
                  </td>
                  <td className={`px-3 py-2 ${weightDisplay.color}`}>
                    {weightDisplay.label}
                  </td>
                  <td className="text-text-theme-secondary px-3 py-2">
                    {unit.era}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
