/**
 * Unit Comparison Page
 * Compare multiple units side-by-side.
 */
import { useEffect, useState, useCallback } from 'react';
import { IUnitEntry, IUnitDetails, calculateTotalArmor } from '@/types/pages';
import {
  PageLayout,
  Card,
  Input,
  EmptyState,
} from '@/components/ui';

const MAX_COMPARE = 4;

export default function ComparePage(): React.ReactElement {
  const [catalog, setCatalog] = useState<IUnitEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnits, setSelectedUnits] = useState<IUnitDetails[]>([]);
  const [loadingUnits, setLoadingUnits] = useState<Set<string>>(new Set());
  const [catalogLoading, setCatalogLoading] = useState(true);

  // Fetch catalog
  useEffect(() => {
    async function fetchCatalog() {
      try {
        const response = await fetch('/api/catalog');
        const data = await response.json() as { success: boolean; data?: IUnitEntry[] };
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
  const addUnit = useCallback(async (entry: IUnitEntry) => {
    if (selectedUnits.length >= MAX_COMPARE) return;
    if (selectedUnits.some(u => u.id === entry.id)) return;

    setLoadingUnits(prev => new Set(prev).add(entry.id));

    try {
      const response = await fetch(`/api/units?id=${encodeURIComponent(entry.id)}`);
      const data = await response.json() as { success: boolean; data?: IUnitDetails };
      
      if (data.success && data.data) {
        const unitData = data.data;
        setSelectedUnits(prev => [...prev, unitData]);
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

  return (
    <PageLayout
      title="Unit Comparison"
      subtitle={`Compare up to ${MAX_COMPARE} units side-by-side`}
    >
      {/* Search Bar */}
      <div className="relative mb-6">
        <Input
          type="text"
          placeholder="Search for a unit to add..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={selectedUnits.length >= MAX_COMPARE}
          variant="large"
          aria-label="Search units to compare"
        />
        
        {/* Search Results Dropdown */}
        {searchTerm && filteredCatalog.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-surface-base border border-border-theme rounded-xl overflow-hidden shadow-xl z-10">
            <ul className="divide-y divide-border-theme/50">
              {filteredCatalog.map((unit) => {
                const isLoading = loadingUnits.has(unit.id);
                const isAdded = selectedUnits.some(u => u.id === unit.id);
                
                return (
                  <li key={unit.id}>
                    <button
                      onClick={() => addUnit(unit)}
                      disabled={isLoading || isAdded}
                      className="w-full px-4 py-3 text-left hover:bg-surface-raised/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={`Add ${unit.name} to comparison`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-white">{unit.name}</div>
                          <div className="text-sm text-text-theme-secondary">
                            {unit.tonnage}t • {unit.techBase.replace(/_/g, ' ')}
                          </div>
                        </div>
                        {isLoading ? (
                          <div className="loading-spinner loading-spinner-sm" />
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
          <div className="absolute top-full left-0 right-0 mt-2 bg-surface-base border border-border-theme rounded-xl p-4 text-center text-text-theme-secondary">
            No units found matching &quot;{searchTerm}&quot;
          </div>
        )}
      </div>

      {/* Comparison Grid */}
      {selectedUnits.length === 0 ? (
        <EmptyState
          icon={<CompareIcon />}
          title="No Units Selected"
          message="Use the search bar above to add units to compare"
        />
      ) : (
        <Card variant="dark" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-base">
                <tr>
                  <th className="px-4 py-3 text-left text-text-theme-secondary font-medium w-40">Stat</th>
                  {selectedUnits.map((unit) => (
                    <th key={unit.id} className="px-4 py-3 text-left min-w-[200px]">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-white">
                            {unit.name || `${unit.chassis} ${unit.model}`}
                          </div>
                          <div className="text-sm text-text-theme-secondary">
                            {unit.tonnage}t • {unit.techBase?.replace(/_/g, ' ')}
                          </div>
                        </div>
                        <button
                          onClick={() => removeUnit(unit.id)}
                          className="text-slate-500 hover:text-red-400 transition-colors ml-2"
                          aria-label={`Remove ${unit.name || unit.chassis} from comparison`}
                        >
                          <CloseIcon />
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-theme/50">
                <CompareRow label="Tonnage" units={selectedUnits} getValue={u => `${u.tonnage}t`} mono />
                <CompareRow label="Walk MP" units={selectedUnits} getValue={u => u.movement?.walk || '—'} mono />
                <CompareRow label="Run MP" units={selectedUnits} getValue={u => u.movement?.walk ? Math.ceil(u.movement.walk * 1.5) : '—'} mono />
                <CompareRow label="Jump MP" units={selectedUnits} getValue={u => u.movement?.jump || 0} mono />
                <CompareRow label="Engine" units={selectedUnits} getValue={u => u.engine ? `${u.engine.type} ${u.engine.rating}` : '—'} />
                <CompareRow label="Heat Sinks" units={selectedUnits} getValue={u => u.heatSinks ? `${u.heatSinks.count} ${u.heatSinks.type}` : '—'} />
                <CompareRow label="Armor Type" units={selectedUnits} getValue={u => u.armor?.type || '—'} />
                <CompareRow label="Total Armor" units={selectedUnits} getValue={u => u.armor ? `${calculateTotalArmor(u.armor)} pts` : '—'} mono />
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add more slots indicator */}
      {selectedUnits.length > 0 && selectedUnits.length < MAX_COMPARE && (
        <div className="mt-4 text-center text-text-theme-secondary text-sm">
          You can add {MAX_COMPARE - selectedUnits.length} more unit{MAX_COMPARE - selectedUnits.length > 1 ? 's' : ''} to compare
        </div>
      )}
    </PageLayout>
  );
}

// Reusable comparison row component
interface CompareRowProps {
  label: string;
  units: IUnitDetails[];
  getValue: (unit: IUnitDetails) => string | number;
  mono?: boolean;
}

function CompareRow({ label, units, getValue, mono }: CompareRowProps) {
  return (
    <tr className="hover:bg-surface-raised/20">
      <td className="px-4 py-3 text-text-theme-secondary">{label}</td>
      {units.map((unit) => (
        <td key={unit.id} className={`px-4 py-3 text-white ${mono ? 'font-mono' : ''}`}>
          {getValue(unit)}
        </td>
      ))}
    </tr>
  );
}

// Icons
function CompareIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
