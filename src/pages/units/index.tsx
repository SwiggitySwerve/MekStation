/**
 * Units Browser Page
 * Browse and search the canonical unit database with filtering and sorting.
 */
import Link from 'next/link';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';
import { RulesLevel, ALL_RULES_LEVELS } from '@/types/enums/RulesLevel';
import { IUnitEntry } from '@/types/pages';
import {
  PageLayout,
  PageLoading,
  PageError,
  Card,
  Input,
  Select,
  Button,
  PaginationButtons,
  TechBaseBadge,
  WeightClassBadge,
} from '@/components/ui';

interface FilterState {
  search: string;
  techBase: string;
  weightClass: string;
  rulesLevel: string;
  yearMin: string;
  yearMax: string;
  tonnageMin: string;
  tonnageMax: string;
  bvMin: string;
  bvMax: string;
}

type SortColumn = 'chassis' | 'variant' | 'tonnage' | 'year' | 'weightClass' | 'techBase' | 'unitType' | 'rulesLevel' | 'cost' | 'bv';
type SortDirection = 'asc' | 'desc';

interface SortState {
  column: SortColumn;
  direction: SortDirection;
}

const ITEMS_PER_PAGE = 50;

// Weight class sort order
const WEIGHT_CLASS_ORDER: Record<string, number> = {
  [WeightClass.ULTRALIGHT]: 0,
  [WeightClass.LIGHT]: 1,
  [WeightClass.MEDIUM]: 2,
  [WeightClass.HEAVY]: 3,
  [WeightClass.ASSAULT]: 4,
  [WeightClass.SUPERHEAVY]: 5,
};

// Rules level sort order (ascending complexity)
const RULES_LEVEL_ORDER: Record<string, number> = {
  [RulesLevel.INTRODUCTORY]: 0,
  [RulesLevel.STANDARD]: 1,
  [RulesLevel.ADVANCED]: 2,
  [RulesLevel.EXPERIMENTAL]: 3,
};

// Rules level display labels
const RULES_LEVEL_LABELS: Record<string, string> = {
  [RulesLevel.INTRODUCTORY]: 'Intro',
  [RulesLevel.STANDARD]: 'Std',
  [RulesLevel.ADVANCED]: 'Adv',
  [RulesLevel.EXPERIMENTAL]: 'Exp',
};

const TECH_BASE_OPTIONS = [
  { value: '', label: 'All Tech' },
  { value: TechBase.INNER_SPHERE, label: 'Inner Sphere' },
  { value: TechBase.CLAN, label: 'Clan' },
];

const WEIGHT_CLASS_OPTIONS = [
  { value: '', label: 'All Classes' },
  ...Object.values(WeightClass).map(wc => ({ value: wc, label: wc })),
];

const RULES_LEVEL_OPTIONS = [
  { value: '', label: 'All Levels' },
  ...ALL_RULES_LEVELS.map(rl => ({ value: rl, label: rl })),
];

export default function UnitsListPage() {
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
        const data = await response.json();
        
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
      result = result.filter(unit =>
        unit.name.toLowerCase().includes(searchLower) ||
        unit.chassis.toLowerCase().includes(searchLower) ||
        unit.variant.toLowerCase().includes(searchLower)
      );
    }

    // Tech base filter
    if (filters.techBase) {
      result = result.filter(unit => unit.techBase === filters.techBase);
    }

    // Weight class filter
    if (filters.weightClass) {
      result = result.filter(unit => unit.weightClass === filters.weightClass);
    }

    // Rules level filter
    if (filters.rulesLevel) {
      result = result.filter(unit => unit.rulesLevel === filters.rulesLevel);
    }

    // Year range filter
    if (filters.yearMin) {
      const minYear = parseInt(filters.yearMin, 10);
      if (!isNaN(minYear)) {
        result = result.filter(unit => (unit.year ?? 0) >= minYear);
      }
    }
    if (filters.yearMax) {
      const maxYear = parseInt(filters.yearMax, 10);
      if (!isNaN(maxYear)) {
        result = result.filter(unit => (unit.year ?? 9999) <= maxYear);
      }
    }

    // Tonnage range filter
    if (filters.tonnageMin) {
      const minTon = parseInt(filters.tonnageMin, 10);
      if (!isNaN(minTon)) {
        result = result.filter(unit => unit.tonnage >= minTon);
      }
    }
    if (filters.tonnageMax) {
      const maxTon = parseInt(filters.tonnageMax, 10);
      if (!isNaN(maxTon)) {
        result = result.filter(unit => unit.tonnage <= maxTon);
      }
    }

    // BV range filter
    if (filters.bvMin) {
      const minBV = parseInt(filters.bvMin, 10);
      if (!isNaN(minBV)) {
        result = result.filter(unit => (unit.bv ?? 0) >= minBV);
      }
    }
    if (filters.bvMax) {
      const maxBV = parseInt(filters.bvMax, 10);
      if (!isNaN(maxBV)) {
        result = result.filter(unit => (unit.bv ?? 99999) <= maxBV);
      }
    }

    setFilteredUnits(result);
    setCurrentPage(1);
  }, [units, filters]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Sort filtered units
  const sortedUnits = useMemo(() => {
    const sorted = [...filteredUnits];
    const { column, direction } = sort;
    const multiplier = direction === 'asc' ? 1 : -1;

    sorted.sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (column) {
        case 'chassis':
          aVal = a.chassis.toLowerCase();
          bVal = b.chassis.toLowerCase();
          break;
        case 'variant':
          aVal = a.variant.toLowerCase();
          bVal = b.variant.toLowerCase();
          break;
        case 'tonnage':
          aVal = a.tonnage;
          bVal = b.tonnage;
          break;
        case 'year':
          aVal = a.year ?? 9999;
          bVal = b.year ?? 9999;
          break;
        case 'weightClass':
          aVal = WEIGHT_CLASS_ORDER[a.weightClass] ?? 99;
          bVal = WEIGHT_CLASS_ORDER[b.weightClass] ?? 99;
          break;
        case 'techBase':
          aVal = a.techBase;
          bVal = b.techBase;
          break;
        case 'unitType':
          aVal = a.unitType;
          bVal = b.unitType;
          break;
        case 'rulesLevel':
          aVal = RULES_LEVEL_ORDER[a.rulesLevel ?? ''] ?? 99;
          bVal = RULES_LEVEL_ORDER[b.rulesLevel ?? ''] ?? 99;
          break;
        case 'cost':
          aVal = a.cost ?? 0;
          bVal = b.cost ?? 0;
          break;
        case 'bv':
          aVal = a.bv ?? 0;
          bVal = b.bv ?? 0;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return -1 * multiplier;
      if (aVal > bVal) return 1 * multiplier;
      return 0;
    });

    return sorted;
  }, [filteredUnits, sort]);

  // Handle sort column click
  const handleSort = (column: SortColumn) => {
    setSort(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
    setCurrentPage(1);
  };

  // Pagination
  const totalPages = Math.ceil(sortedUnits.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const displayedUnits = sortedUnits.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
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
    filters.yearMin || filters.yearMax ||
    filters.tonnageMin || filters.tonnageMax ||
    filters.bvMin || filters.bvMax
  );

  if (loading) {
    return <PageLoading message="Loading unit database..." />;
  }

  if (error) {
    return <PageError title="Error Loading Units" message={error} />;
  }

  return (
    <PageLayout
      title="Unit Database"
      subtitle={`Browse ${units.length.toLocaleString()} canonical units from all eras`}
      maxWidth="full"
    >
      {/* Filters */}
      <Card className="mb-6">
        {/* Primary Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2">
            <Input
              type="text"
              placeholder="Search chassis, model, or variant..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              aria-label="Search units"
            />
          </div>

          <Select
            value={filters.techBase}
            onChange={(e) => handleFilterChange('techBase', e.target.value)}
            options={TECH_BASE_OPTIONS}
            aria-label="Filter by tech base"
          />

          <Select
            value={filters.weightClass}
            onChange={(e) => handleFilterChange('weightClass', e.target.value)}
            options={WEIGHT_CLASS_OPTIONS}
            aria-label="Filter by weight class"
          />

          <Select
            value={filters.rulesLevel}
            onChange={(e) => handleFilterChange('rulesLevel', e.target.value)}
            options={RULES_LEVEL_OPTIONS}
            aria-label="Filter by rules level"
          />

          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex-1 text-xs ${hasAdvancedFilters ? 'text-amber-400' : ''}`}
            >
              {showAdvancedFilters ? '▼' : '▶'} Filters
              {hasAdvancedFilters && ' •'}
            </Button>
            <Button variant="secondary" onClick={clearFilters} className="text-xs px-3">
              Clear
            </Button>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Year Range */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wide">
                  Design Year
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.yearMin}
                    onChange={(e) => handleFilterChange('yearMin', e.target.value)}
                    className="text-center text-sm"
                    min={2000}
                    max={3150}
                  />
                  <span className="text-slate-500">–</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.yearMax}
                    onChange={(e) => handleFilterChange('yearMax', e.target.value)}
                    className="text-center text-sm"
                    min={2000}
                    max={3150}
                  />
                </div>
              </div>

              {/* Tonnage Range */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wide">
                  Tonnage
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.tonnageMin}
                    onChange={(e) => handleFilterChange('tonnageMin', e.target.value)}
                    className="text-center text-sm"
                    min={10}
                    max={200}
                    step={5}
                  />
                  <span className="text-slate-500">–</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.tonnageMax}
                    onChange={(e) => handleFilterChange('tonnageMax', e.target.value)}
                    className="text-center text-sm"
                    min={10}
                    max={200}
                    step={5}
                  />
                </div>
              </div>

              {/* BV Range */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wide">
                  Battle Value
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.bvMin}
                    onChange={(e) => handleFilterChange('bvMin', e.target.value)}
                    className="text-center text-sm"
                    min={0}
                    max={5000}
                    step={50}
                  />
                  <span className="text-slate-500">–</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.bvMax}
                    onChange={(e) => handleFilterChange('bvMax', e.target.value)}
                    className="text-center text-sm"
                    min={0}
                    max={5000}
                    step={50}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Count */}
        <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
          <div>
            Showing {displayedUnits.length} of {filteredUnits.length} results
            {filteredUnits.length !== units.length && (
              <span className="text-amber-400 ml-2">
                (filtered from {units.length.toLocaleString()} total)
              </span>
            )}
          </div>
          {hasAdvancedFilters && (
            <div className="text-xs text-amber-400/70">
              Advanced filters active
            </div>
          )}
        </div>
      </Card>

      {/* Units Table - Compact */}
      <Card variant="dark" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-slate-800">
              <tr className="text-left text-slate-400 text-xs uppercase tracking-wide">
                <SortableHeader
                  label="Chassis"
                  column="chassis"
                  currentColumn={sort.column}
                  direction={sort.direction}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Model"
                  column="variant"
                  currentColumn={sort.column}
                  direction={sort.direction}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Weight"
                  column="tonnage"
                  currentColumn={sort.column}
                  direction={sort.direction}
                  onSort={handleSort}
                  className="w-20 text-right"
                />
                <SortableHeader
                  label="Year"
                  column="year"
                  currentColumn={sort.column}
                  direction={sort.direction}
                  onSort={handleSort}
                  className="w-16 text-right"
                />
                <SortableHeader
                  label="Class"
                  column="weightClass"
                  currentColumn={sort.column}
                  direction={sort.direction}
                  onSort={handleSort}
                  className="w-24"
                />
                <SortableHeader
                  label="Tech"
                  column="techBase"
                  currentColumn={sort.column}
                  direction={sort.direction}
                  onSort={handleSort}
                  className="w-28"
                />
                <SortableHeader
                  label="Type"
                  column="unitType"
                  currentColumn={sort.column}
                  direction={sort.direction}
                  onSort={handleSort}
                  className="w-28"
                />
                <SortableHeader
                  label="Level"
                  column="rulesLevel"
                  currentColumn={sort.column}
                  direction={sort.direction}
                  onSort={handleSort}
                  className="w-16"
                />
                <SortableHeader
                  label="Price"
                  column="cost"
                  currentColumn={sort.column}
                  direction={sort.direction}
                  onSort={handleSort}
                  className="w-24 text-right"
                />
                <SortableHeader
                  label="BV"
                  column="bv"
                  currentColumn={sort.column}
                  direction={sort.direction}
                  onSort={handleSort}
                  className="w-16 text-right"
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {displayedUnits.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center text-slate-400">
                    No units found matching your filters
                  </td>
                </tr>
              ) : (
                displayedUnits.map((unit) => (
                  <tr
                    key={unit.id}
                    className="hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="px-3 py-2">
                      <Link href={`/units/${unit.id}`} className="group">
                        <span className="font-medium text-sm text-white group-hover:text-amber-400 transition-colors whitespace-nowrap">
                          {unit.chassis}
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-slate-300 text-sm whitespace-nowrap">
                      {unit.variant}
                    </td>
                    <td className="px-3 py-2 text-slate-300 font-mono text-sm text-right">
                      {unit.tonnage} t
                    </td>
                    <td className="px-3 py-2 text-slate-400 font-mono text-sm text-right">
                      {unit.year ?? '—'}
                    </td>
                    <td className="px-3 py-2">
                      <WeightClassBadge weightClass={unit.weightClass} />
                    </td>
                    <td className="px-3 py-2">
                      <TechBaseBadge techBase={unit.techBase} />
                    </td>
                    <td className="px-3 py-2 text-slate-400 text-sm whitespace-nowrap">
                      {unit.unitType === 'BattleMech' ? 'Mek' : unit.unitType}
                    </td>
                    <td className="px-3 py-2 text-slate-400 text-xs font-mono whitespace-nowrap">
                      {RULES_LEVEL_LABELS[unit.rulesLevel ?? ''] ?? unit.rulesLevel ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-slate-300 text-xs font-mono text-right whitespace-nowrap">
                      {unit.cost ? `${(unit.cost / 1000000).toPrecision(3)}M` : '—'}
                    </td>
                    <td className="px-3 py-2 text-amber-400 text-xs font-mono text-right whitespace-nowrap font-medium">
                      {unit.bv?.toLocaleString() ?? '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
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

// Sortable table header component
interface SortableHeaderProps {
  label: string;
  column: SortColumn;
  currentColumn: SortColumn;
  direction: SortDirection;
  onSort: (column: SortColumn) => void;
  className?: string;
}

function SortableHeader({
  label,
  column,
  currentColumn,
  direction,
  onSort,
  className = '',
}: SortableHeaderProps) {
  const isActive = column === currentColumn;
  const isRightAligned = className.includes('text-right');

  return (
    <th
      className={`px-3 py-2 font-medium cursor-pointer hover:text-white transition-colors select-none ${className}`}
      onClick={() => onSort(column)}
    >
      <span className={`flex items-center gap-1 ${isRightAligned ? 'justify-end' : ''}`}>
        {label}
        {isActive && (
          <span className="text-amber-400 text-[10px]">
            {direction === 'asc' ? '▲' : '▼'}
          </span>
        )}
      </span>
    </th>
  );
}
