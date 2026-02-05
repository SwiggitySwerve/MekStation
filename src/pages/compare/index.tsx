/**
 * Unit Comparison Page
 * Compare multiple units side-by-side.
 */
import { useEffect, useState, useCallback } from 'react';

import { PageLayout, Card, Input, EmptyState } from '@/components/ui';
import { IUnitEntry, IUnitDetails, calculateTotalArmor } from '@/types/pages';

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
        const data = (await response.json()) as {
          success: boolean;
          data?: IUnitEntry[];
        };
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
  const filteredCatalog = catalog
    .filter((unit) => {
      if (!searchTerm) return false; // Only show results when searching
      const search = searchTerm.toLowerCase();
      return (
        unit.name.toLowerCase().includes(search) ||
        unit.chassis.toLowerCase().includes(search)
      );
    })
    .slice(0, 10);

  // Add unit to comparison
  const addUnit = useCallback(
    async (entry: IUnitEntry) => {
      if (selectedUnits.length >= MAX_COMPARE) return;
      if (selectedUnits.some((u) => u.id === entry.id)) return;

      setLoadingUnits((prev) => new Set(prev).add(entry.id));

      try {
        const response = await fetch(
          `/api/units?id=${encodeURIComponent(entry.id)}`,
        );
        const data = (await response.json()) as {
          success: boolean;
          data?: IUnitDetails;
        };

        if (data.success && data.data) {
          const unitData = data.data;
          setSelectedUnits((prev) => [...prev, unitData]);
        }
      } catch (err) {
        console.error('Failed to load unit:', err);
      } finally {
        setLoadingUnits((prev) => {
          const next = new Set(prev);
          next.delete(entry.id);
          return next;
        });
      }

      setSearchTerm('');
    },
    [selectedUnits],
  );

  // Remove unit from comparison
  const removeUnit = (id: string) => {
    setSelectedUnits((prev) => prev.filter((u) => u.id !== id));
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
          <div className="bg-surface-base border-border-theme absolute top-full right-0 left-0 z-10 mt-2 overflow-hidden rounded-xl border shadow-xl">
            <ul className="divide-border-theme/50 divide-y">
              {filteredCatalog.map((unit) => {
                const isLoading = loadingUnits.has(unit.id);
                const isAdded = selectedUnits.some((u) => u.id === unit.id);

                return (
                  <li key={unit.id}>
                    <button
                      onClick={() => addUnit(unit)}
                      disabled={isLoading || isAdded}
                      className="hover:bg-surface-raised/50 active:bg-surface-raised min-h-[44px] w-full px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={`Add ${unit.name} to comparison`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-white">
                            {unit.name}
                          </div>
                          <div className="text-text-theme-secondary text-sm">
                            {unit.tonnage}t • {unit.techBase.replace(/_/g, ' ')}
                          </div>
                        </div>
                        {isLoading ? (
                          <div className="loading-spinner loading-spinner-sm" />
                        ) : isAdded ? (
                          <span className="text-sm text-emerald-400">
                            Added
                          </span>
                        ) : (
                          <span className="text-sm text-violet-400">+ Add</span>
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
          <div className="bg-surface-base border-border-theme text-text-theme-secondary absolute top-full right-0 left-0 mt-2 rounded-xl border p-4 text-center">
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
        <>
          <div className="space-y-4 md:hidden">
            {selectedUnits.map((unit) => (
              <Card key={unit.id} variant="dark" className="overflow-hidden">
                <div className="bg-surface-base border-border-theme/50 flex items-start justify-between border-b p-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {unit.name || `${unit.chassis} ${unit.model}`}
                    </h3>
                    <p className="text-text-theme-secondary text-sm">
                      {unit.tonnage}t • {unit.techBase?.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <button
                    onClick={() => removeUnit(unit.id)}
                    className="-mt-2 -mr-2 flex min-h-[44px] min-w-[44px] items-center justify-center text-slate-500 transition-colors hover:text-red-400 active:text-red-500"
                    aria-label={`Remove ${unit.name || unit.chassis} from comparison`}
                  >
                    <CloseIcon />
                  </button>
                </div>
                <div className="divide-border-theme/30 divide-y">
                  <MobileStatRow
                    label="Tonnage"
                    value={`${unit.tonnage}t`}
                    mono
                  />
                  <MobileStatRow
                    label="Walk MP"
                    value={unit.movement?.walk || '—'}
                    mono
                  />
                  <MobileStatRow
                    label="Run MP"
                    value={
                      unit.movement?.walk
                        ? Math.ceil(unit.movement.walk * 1.5)
                        : '—'
                    }
                    mono
                  />
                  <MobileStatRow
                    label="Jump MP"
                    value={unit.movement?.jump || 0}
                    mono
                  />
                  <MobileStatRow
                    label="Engine"
                    value={
                      unit.engine
                        ? `${unit.engine.type} ${unit.engine.rating}`
                        : '—'
                    }
                  />
                  <MobileStatRow
                    label="Heat Sinks"
                    value={
                      unit.heatSinks
                        ? `${unit.heatSinks.count} ${unit.heatSinks.type}`
                        : '—'
                    }
                  />
                  <MobileStatRow
                    label="Armor Type"
                    value={unit.armor?.type || '—'}
                  />
                  <MobileStatRow
                    label="Total Armor"
                    value={
                      unit.armor
                        ? `${calculateTotalArmor(unit.armor)} pts`
                        : '—'
                    }
                    mono
                  />
                </div>
              </Card>
            ))}
          </div>

          <Card variant="dark" className="hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-base">
                  <tr>
                    <th className="text-text-theme-secondary w-40 px-4 py-3 text-left font-medium">
                      Stat
                    </th>
                    {selectedUnits.map((unit) => (
                      <th
                        key={unit.id}
                        className="min-w-[200px] px-4 py-3 text-left"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-semibold text-white">
                              {unit.name || `${unit.chassis} ${unit.model}`}
                            </div>
                            <div className="text-text-theme-secondary text-sm">
                              {unit.tonnage}t •{' '}
                              {unit.techBase?.replace(/_/g, ' ')}
                            </div>
                          </div>
                          <button
                            onClick={() => removeUnit(unit.id)}
                            className="-mt-1 -mr-2 flex min-h-[44px] min-w-[44px] items-center justify-center text-slate-500 transition-colors hover:text-red-400"
                            aria-label={`Remove ${unit.name || unit.chassis} from comparison`}
                          >
                            <CloseIcon />
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-border-theme/50 divide-y">
                  <CompareRow
                    label="Tonnage"
                    units={selectedUnits}
                    getValue={(u) => `${u.tonnage}t`}
                    mono
                  />
                  <CompareRow
                    label="Walk MP"
                    units={selectedUnits}
                    getValue={(u) => u.movement?.walk || '—'}
                    mono
                  />
                  <CompareRow
                    label="Run MP"
                    units={selectedUnits}
                    getValue={(u) =>
                      u.movement?.walk ? Math.ceil(u.movement.walk * 1.5) : '—'
                    }
                    mono
                  />
                  <CompareRow
                    label="Jump MP"
                    units={selectedUnits}
                    getValue={(u) => u.movement?.jump || 0}
                    mono
                  />
                  <CompareRow
                    label="Engine"
                    units={selectedUnits}
                    getValue={(u) =>
                      u.engine ? `${u.engine.type} ${u.engine.rating}` : '—'
                    }
                  />
                  <CompareRow
                    label="Heat Sinks"
                    units={selectedUnits}
                    getValue={(u) =>
                      u.heatSinks
                        ? `${u.heatSinks.count} ${u.heatSinks.type}`
                        : '—'
                    }
                  />
                  <CompareRow
                    label="Armor Type"
                    units={selectedUnits}
                    getValue={(u) => u.armor?.type || '—'}
                  />
                  <CompareRow
                    label="Total Armor"
                    units={selectedUnits}
                    getValue={(u) =>
                      u.armor ? `${calculateTotalArmor(u.armor)} pts` : '—'
                    }
                    mono
                  />
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Add more slots indicator */}
      {selectedUnits.length > 0 && selectedUnits.length < MAX_COMPARE && (
        <div className="text-text-theme-secondary mt-4 text-center text-sm">
          You can add {MAX_COMPARE - selectedUnits.length} more unit
          {MAX_COMPARE - selectedUnits.length > 1 ? 's' : ''} to compare
        </div>
      )}
    </PageLayout>
  );
}

interface CompareRowProps {
  label: string;
  units: IUnitDetails[];
  getValue: (unit: IUnitDetails) => string | number;
  mono?: boolean;
}

function CompareRow({ label, units, getValue, mono }: CompareRowProps) {
  return (
    <tr className="hover:bg-surface-raised/20">
      <td className="text-text-theme-secondary px-4 py-3">{label}</td>
      {units.map((unit) => (
        <td
          key={unit.id}
          className={`px-4 py-3 text-white ${mono ? 'font-mono' : ''}`}
        >
          {getValue(unit)}
        </td>
      ))}
    </tr>
  );
}

interface MobileStatRowProps {
  label: string;
  value: string | number;
  mono?: boolean;
}

function MobileStatRow({ label, value, mono }: MobileStatRowProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-text-theme-secondary">{label}</span>
      <span className={`text-white ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

// Icons
function CompareIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-16 w-16"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}
