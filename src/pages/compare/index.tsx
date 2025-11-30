/**
 * Unit Comparison Page
 * Compare multiple units side-by-side.
 */
import { useEffect, useState, useCallback } from 'react';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';

interface UnitEntry {
  id: string;
  name: string;
  chassis: string;
  variant: string;
  tonnage: number;
  techBase: TechBase;
  weightClass: WeightClass;
  unitType: string;
}

interface UnitDetails {
  id: string;
  name?: string;
  chassis?: string;
  model?: string;
  tonnage: number;
  techBase?: string;
  movement?: {
    walk: number;
    jump: number;
  };
  engine?: {
    type: string;
    rating: number;
  };
  armor?: {
    type: string;
    allocation: Record<string, number | { front: number; rear: number }>;
  };
  heatSinks?: {
    type: string;
    count: number;
  };
}

const MAX_COMPARE = 4;

export default function ComparePage() {
  const [catalog, setCatalog] = useState<UnitEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnits, setSelectedUnits] = useState<UnitDetails[]>([]);
  const [loadingUnits, setLoadingUnits] = useState<Set<string>>(new Set());
  const [catalogLoading, setCatalogLoading] = useState(true);

  // Fetch catalog
  useEffect(() => {
    async function fetchCatalog() {
      try {
        const response = await fetch('/api/catalog');
        const data = await response.json();
        if (data.success) {
          setCatalog(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch catalog:', err);
      } finally {
        setCatalogLoading(false);
      }
    }
    fetchCatalog();
  }, []);

  // Filter catalog by search
  const filteredCatalog = catalog.filter(unit => {
    if (!searchTerm) return false; // Only show results when searching
    const search = searchTerm.toLowerCase();
    return (
      unit.name.toLowerCase().includes(search) ||
      unit.chassis.toLowerCase().includes(search)
    );
  }).slice(0, 10);

  // Add unit to comparison
  const addUnit = useCallback(async (entry: UnitEntry) => {
    if (selectedUnits.length >= MAX_COMPARE) return;
    if (selectedUnits.some(u => u.id === entry.id)) return;

    setLoadingUnits(prev => new Set(prev).add(entry.id));

    try {
      const response = await fetch(`/api/units?id=${encodeURIComponent(entry.id)}`);
      const data = await response.json();
      
      if (data.success) {
        setSelectedUnits(prev => [...prev, data.data]);
      }
    } catch (err) {
      console.error('Failed to load unit:', err);
    } finally {
      setLoadingUnits(prev => {
        const next = new Set(prev);
        next.delete(entry.id);
        return next;
      });
    }

    setSearchTerm('');
  }, [selectedUnits]);

  // Remove unit from comparison
  const removeUnit = (id: string) => {
    setSelectedUnits(prev => prev.filter(u => u.id !== id));
  };

  // Calculate total armor
  const getTotalArmor = (armor: UnitDetails['armor']): number => {
    if (!armor?.allocation) return 0;
    return Object.values(armor.allocation).reduce((sum: number, val) => {
      if (typeof val === 'number') return sum + val;
      if (val && typeof val === 'object' && 'front' in val && 'rear' in val) {
        return sum + val.front + val.rear;
      }
      return sum;
    }, 0);
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Unit Comparison</h1>
          <p className="text-slate-400">
            Compare up to {MAX_COMPARE} units side-by-side
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <input
            type="text"
            placeholder="Search for a unit to add..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={selectedUnits.length >= MAX_COMPARE}
            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-5 py-3 text-white placeholder-slate-400 focus:border-violet-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
          
          {/* Search Results Dropdown */}
          {searchTerm && filteredCatalog.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl z-10">
              <ul className="divide-y divide-slate-700/50">
                {filteredCatalog.map((unit) => {
                  const isLoading = loadingUnits.has(unit.id);
                  const isAdded = selectedUnits.some(u => u.id === unit.id);
                  
                  return (
                    <li key={unit.id}>
                      <button
                        onClick={() => addUnit(unit)}
                        disabled={isLoading || isAdded}
                        className="w-full px-4 py-3 text-left hover:bg-slate-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-white">{unit.name}</div>
                            <div className="text-sm text-slate-400">
                              {unit.tonnage}t • {unit.techBase.replace(/_/g, ' ')}
                            </div>
                          </div>
                          {isLoading ? (
                            <div className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                          ) : isAdded ? (
                            <span className="text-emerald-400 text-sm">Added</span>
                          ) : (
                            <span className="text-violet-400 text-sm">+ Add</span>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {searchTerm && filteredCatalog.length === 0 && !catalogLoading && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl p-4 text-center text-slate-400">
              No units found matching &quot;{searchTerm}&quot;
            </div>
          )}
        </div>

        {/* Comparison Grid */}
        {selectedUnits.length === 0 ? (
          <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-12 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto mb-4 text-slate-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
            <h2 className="text-xl font-semibold text-white mb-2">No Units Selected</h2>
            <p className="text-slate-400">
              Use the search bar above to add units to compare
            </p>
          </div>
        ) : (
          <div className="bg-slate-800/30 border border-slate-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-slate-400 font-medium w-40">Stat</th>
                    {selectedUnits.map((unit) => (
                      <th key={unit.id} className="px-4 py-3 text-left min-w-[200px]">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-semibold text-white">
                              {unit.name || `${unit.chassis} ${unit.model}`}
                            </div>
                            <div className="text-sm text-slate-400">
                              {unit.tonnage}t • {unit.techBase?.replace(/_/g, ' ')}
                            </div>
                          </div>
                          <button
                            onClick={() => removeUnit(unit.id)}
                            className="text-slate-500 hover:text-red-400 transition-colors ml-2"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {/* Tonnage */}
                  <tr className="hover:bg-slate-700/20">
                    <td className="px-4 py-3 text-slate-400">Tonnage</td>
                    {selectedUnits.map((unit) => (
                      <td key={unit.id} className="px-4 py-3 text-white font-mono">{unit.tonnage}t</td>
                    ))}
                  </tr>

                  {/* Walk MP */}
                  <tr className="hover:bg-slate-700/20">
                    <td className="px-4 py-3 text-slate-400">Walk MP</td>
                    {selectedUnits.map((unit) => (
                      <td key={unit.id} className="px-4 py-3 text-white font-mono">{unit.movement?.walk || '—'}</td>
                    ))}
                  </tr>

                  {/* Run MP */}
                  <tr className="hover:bg-slate-700/20">
                    <td className="px-4 py-3 text-slate-400">Run MP</td>
                    {selectedUnits.map((unit) => (
                      <td key={unit.id} className="px-4 py-3 text-white font-mono">
                        {unit.movement?.walk ? Math.ceil(unit.movement.walk * 1.5) : '—'}
                      </td>
                    ))}
                  </tr>

                  {/* Jump MP */}
                  <tr className="hover:bg-slate-700/20">
                    <td className="px-4 py-3 text-slate-400">Jump MP</td>
                    {selectedUnits.map((unit) => (
                      <td key={unit.id} className="px-4 py-3 text-white font-mono">{unit.movement?.jump || 0}</td>
                    ))}
                  </tr>

                  {/* Engine */}
                  <tr className="hover:bg-slate-700/20">
                    <td className="px-4 py-3 text-slate-400">Engine</td>
                    {selectedUnits.map((unit) => (
                      <td key={unit.id} className="px-4 py-3 text-white">
                        {unit.engine ? `${unit.engine.type} ${unit.engine.rating}` : '—'}
                      </td>
                    ))}
                  </tr>

                  {/* Heat Sinks */}
                  <tr className="hover:bg-slate-700/20">
                    <td className="px-4 py-3 text-slate-400">Heat Sinks</td>
                    {selectedUnits.map((unit) => (
                      <td key={unit.id} className="px-4 py-3 text-white">
                        {unit.heatSinks ? `${unit.heatSinks.count} ${unit.heatSinks.type}` : '—'}
                      </td>
                    ))}
                  </tr>

                  {/* Armor Type */}
                  <tr className="hover:bg-slate-700/20">
                    <td className="px-4 py-3 text-slate-400">Armor Type</td>
                    {selectedUnits.map((unit) => (
                      <td key={unit.id} className="px-4 py-3 text-white">{unit.armor?.type || '—'}</td>
                    ))}
                  </tr>

                  {/* Total Armor */}
                  <tr className="hover:bg-slate-700/20">
                    <td className="px-4 py-3 text-slate-400">Total Armor</td>
                    {selectedUnits.map((unit) => (
                      <td key={unit.id} className="px-4 py-3 text-white font-mono">
                        {unit.armor ? `${getTotalArmor(unit.armor)} pts` : '—'}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add more slots indicator */}
        {selectedUnits.length > 0 && selectedUnits.length < MAX_COMPARE && (
          <div className="mt-4 text-center text-slate-400 text-sm">
            You can add {MAX_COMPARE - selectedUnits.length} more unit{MAX_COMPARE - selectedUnits.length > 1 ? 's' : ''} to compare
          </div>
        )}
      </div>
    </div>
  );
}
