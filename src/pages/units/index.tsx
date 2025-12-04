/**
 * Units Browser Page
 * Browse and search the canonical unit database with filtering.
 */
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';
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
  era: string;
}

const ITEMS_PER_PAGE = 50;

const TECH_BASE_OPTIONS = [
  { value: '', label: 'All Tech Bases' },
  ...Object.values(TechBase).map(tb => ({ value: tb, label: tb.replace(/_/g, ' ') })),
];

const WEIGHT_CLASS_OPTIONS = [
  { value: '', label: 'All Weight Classes' },
  ...Object.values(WeightClass).map(wc => ({ value: wc, label: wc })),
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
    era: '',
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

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(unit =>
        unit.name.toLowerCase().includes(searchLower) ||
        unit.chassis.toLowerCase().includes(searchLower) ||
        unit.variant.toLowerCase().includes(searchLower)
      );
    }

    if (filters.techBase) {
      result = result.filter(unit => unit.techBase === filters.techBase);
    }

    if (filters.weightClass) {
      result = result.filter(unit => unit.weightClass === filters.weightClass);
    }

    if (filters.era) {
      result = result.filter(unit => unit.era === filters.era);
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
  const displayedUnits = filteredUnits.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ search: '', techBase: '', weightClass: '', era: '' });
  };

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
    >
      {/* Filters */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2">
            <Input
              type="text"
              placeholder="Search by name, chassis, or variant..."
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

          <Button variant="secondary" onClick={clearFilters}>
            Clear Filters
          </Button>
        </div>

        <div className="mt-4 text-sm text-slate-400">
          Showing {displayedUnits.length} of {filteredUnits.length} results
          {filteredUnits.length !== units.length && (
            <span className="text-amber-400 ml-2">
              (filtered from {units.length} total)
            </span>
          )}
        </div>
      </Card>

      {/* Units Table - Compact */}
      <Card variant="dark" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800">
              <tr className="text-left text-slate-400 text-xs uppercase tracking-wide">
                <th className="px-3 py-2 font-medium">Unit</th>
                <th className="px-3 py-2 font-medium w-20">Tons</th>
                <th className="px-3 py-2 font-medium w-24">Class</th>
                <th className="px-3 py-2 font-medium w-28">Tech</th>
                <th className="px-3 py-2 font-medium w-28">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {displayedUnits.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
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
                      <Link href={`/units/${unit.id}`} className="group flex items-baseline gap-2">
                        <span className="font-medium text-sm text-white group-hover:text-amber-400 transition-colors whitespace-nowrap">
                          {unit.name}
                        </span>
                        <span className="text-xs text-slate-500 whitespace-nowrap">
                          {unit.chassis} {unit.variant}
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-slate-300 font-mono text-sm">
                      {unit.tonnage}t
                    </td>
                    <td className="px-3 py-2">
                      <WeightClassBadge weightClass={unit.weightClass} />
                    </td>
                    <td className="px-3 py-2">
                      <TechBaseBadge techBase={unit.techBase} />
                    </td>
                    <td className="px-3 py-2 text-slate-400 text-sm">
                      {unit.unitType}
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
