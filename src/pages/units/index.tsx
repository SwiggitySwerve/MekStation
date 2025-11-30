/**
 * Units Browser Page
 * Browse and search the canonical unit database with filtering.
 */
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';
import { Era } from '@/types/enums/Era';

interface UnitEntry {
  id: string;
  name: string;
  chassis: string;
  variant: string;
  tonnage: number;
  techBase: TechBase;
  era: Era;
  weightClass: WeightClass;
  unitType: string;
}

interface FilterState {
  search: string;
  techBase: string;
  weightClass: string;
  era: string;
}

const ITEMS_PER_PAGE = 25;

export default function UnitsListPage() {
  const [units, setUnits] = useState<UnitEntry[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<UnitEntry[]>([]);
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
      } catch (err) {
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

  const getWeightClassColor = (wc: WeightClass): string => {
    switch (wc) {
      case WeightClass.LIGHT: return 'text-emerald-400';
      case WeightClass.MEDIUM: return 'text-amber-400';
      case WeightClass.HEAVY: return 'text-orange-400';
      case WeightClass.ASSAULT: return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const getTechBaseColor = (tb: TechBase): string => {
    switch (tb) {
      case TechBase.INNER_SPHERE: return 'bg-blue-600/20 text-blue-400 border-blue-600/30';
      case TechBase.CLAN: return 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30';
      case TechBase.MIXED:
      case TechBase.MIXED_IS_CHASSIS:
      case TechBase.MIXED_CLAN_CHASSIS: return 'bg-purple-600/20 text-purple-400 border-purple-600/30';
      default: return 'bg-slate-600/20 text-slate-400 border-slate-600/30';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading unit database...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8">
        <div className="bg-red-900/20 border border-red-600/30 rounded-xl p-6 max-w-md text-center">
          <h2 className="text-xl font-semibold text-red-400 mb-2">Error Loading Units</h2>
          <p className="text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Unit Database</h1>
          <p className="text-slate-400">
            Browse {units.length.toLocaleString()} canonical units from all eras
          </p>
        </div>

        {/* Filters */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <input
                type="text"
                placeholder="Search by name, chassis, or variant..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Tech Base */}
            <select
              value={filters.techBase}
              onChange={(e) => handleFilterChange('techBase', e.target.value)}
              className="bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-amber-500 focus:outline-none"
            >
              <option value="">All Tech Bases</option>
              {Object.values(TechBase).map(tb => (
                <option key={tb} value={tb}>{tb.replace(/_/g, ' ')}</option>
              ))}
            </select>

            {/* Weight Class */}
            <select
              value={filters.weightClass}
              onChange={(e) => handleFilterChange('weightClass', e.target.value)}
              className="bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-amber-500 focus:outline-none"
            >
              <option value="">All Weight Classes</option>
              {Object.values(WeightClass).map(wc => (
                <option key={wc} value={wc}>{wc}</option>
              ))}
            </select>

            {/* Clear Filters */}
            <button
              onClick={clearFilters}
              className="bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg px-4 py-2 text-slate-300 transition-colors"
            >
              Clear Filters
            </button>
          </div>

          {/* Results count */}
          <div className="mt-4 text-sm text-slate-400">
            Showing {displayedUnits.length} of {filteredUnits.length} results
            {filteredUnits.length !== units.length && (
              <span className="text-amber-400 ml-2">
                (filtered from {units.length} total)
              </span>
            )}
          </div>
        </div>

        {/* Units Table */}
        <div className="bg-slate-800/30 border border-slate-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800">
                <tr className="text-left text-slate-400 text-sm uppercase tracking-wide">
                  <th className="px-6 py-4 font-medium">Unit</th>
                  <th className="px-6 py-4 font-medium">Tonnage</th>
                  <th className="px-6 py-4 font-medium">Class</th>
                  <th className="px-6 py-4 font-medium">Tech Base</th>
                  <th className="px-6 py-4 font-medium">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {displayedUnits.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      No units found matching your filters
                    </td>
                  </tr>
                ) : (
                  displayedUnits.map((unit) => (
                    <tr
                      key={unit.id}
                      className="hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <Link href={`/units/${unit.id}`} className="group">
                          <div className="font-medium text-white group-hover:text-amber-400 transition-colors">
                            {unit.name}
                          </div>
                          <div className="text-sm text-slate-500">
                            {unit.chassis} {unit.variant}
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-slate-300 font-mono">
                        {unit.tonnage}t
                      </td>
                      <td className={`px-6 py-4 font-medium ${getWeightClassColor(unit.weightClass)}`}>
                        {unit.weightClass}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${getTechBaseColor(unit.techBase)}`}>
                          {unit.techBase.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {unit.unitType}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white hover:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              First
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white hover:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Prev
            </button>
            <span className="px-4 py-2 text-slate-400">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white hover:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white hover:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Last
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
