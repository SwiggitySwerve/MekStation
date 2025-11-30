/**
 * Unit Detail Page
 * Displays full details for a single unit.
 */
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface UnitData {
  id: string;
  name?: string;
  chassis?: string;
  model?: string;
  variant?: string;
  tonnage: number;
  unitType?: string;
  configuration?: string;
  techBase?: string;
  rulesLevel?: string;
  era?: string;
  year?: number;
  engine?: {
    type: string;
    rating: number;
  };
  gyro?: {
    type: string;
  };
  cockpit?: string;
  structure?: {
    type: string;
  };
  armor?: {
    type: string;
    allocation: Record<string, number | { front: number; rear: number }>;
  };
  heatSinks?: {
    type: string;
    count: number;
  };
  movement?: {
    walk: number;
    jump: number;
    jumpJetType?: string;
    enhancements?: string[];
  };
  equipment?: Array<{
    id: string;
    location: string;
    slots?: number[];
    isRearMounted?: boolean;
  }>;
  quirks?: string[];
  metadata?: {
    chassis?: string;
    model?: string;
    role?: string;
    manufacturer?: string;
    notes?: string;
  };
}

export default function UnitDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [unit, setUnit] = useState<UnitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    async function fetchUnit() {
      try {
        const response = await fetch(`/api/units?id=${encodeURIComponent(id as string)}`);
        const data = await response.json();
        
        if (data.success) {
          setUnit(data.data);
        } else {
          setError(data.error || 'Unit not found');
        }
      } catch (err) {
        setError('Failed to load unit');
      } finally {
        setLoading(false);
      }
    }

    fetchUnit();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading unit data...</p>
        </div>
      </div>
    );
  }

  if (error || !unit) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8">
        <div className="bg-red-900/20 border border-red-600/30 rounded-xl p-8 max-w-md text-center">
          <h2 className="text-xl font-semibold text-red-400 mb-2">Unit Not Found</h2>
          <p className="text-slate-400 mb-6">{error || 'The requested unit could not be found.'}</p>
          <Link
            href="/units"
            className="inline-block bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Back to Units
          </Link>
        </div>
      </div>
    );
  }

  const displayName = unit.name || `${unit.chassis || ''} ${unit.model || unit.variant || ''}`.trim();
  
  // Calculate total armor points
  const totalArmor = unit.armor?.allocation
    ? Object.values(unit.armor.allocation).reduce((sum: number, val) => {
        if (typeof val === 'number') return sum + val;
        if (val && typeof val === 'object' && 'front' in val && 'rear' in val) {
          return sum + val.front + val.rear;
        }
        return sum;
      }, 0)
    : 0;

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Back navigation */}
        <Link
          href="/units"
          className="inline-flex items-center text-slate-400 hover:text-amber-400 transition-colors mb-6"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 mr-2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Units
        </Link>

        {/* Header */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{displayName}</h1>
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="px-3 py-1 rounded-full bg-amber-600/20 text-amber-400 border border-amber-600/30">
                  {unit.tonnage} tons
                </span>
                {unit.techBase && (
                  <span className="px-3 py-1 rounded-full bg-blue-600/20 text-blue-400 border border-blue-600/30">
                    {unit.techBase.replace(/_/g, ' ')}
                  </span>
                )}
                {unit.unitType && (
                  <span className="px-3 py-1 rounded-full bg-slate-600/50 text-slate-300 border border-slate-500/30">
                    {unit.unitType}
                  </span>
                )}
                {unit.configuration && (
                  <span className="px-3 py-1 rounded-full bg-slate-600/50 text-slate-300 border border-slate-500/30">
                    {unit.configuration}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right text-slate-400 text-sm">
              {unit.era && <div>Era: {unit.era.replace(/_/g, ' ')}</div>}
              {unit.year && <div>Year: {unit.year}</div>}
              {unit.rulesLevel && <div>Rules: {unit.rulesLevel.replace(/_/g, ' ')}</div>}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {/* Movement */}
          <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-amber-400 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
              Movement
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Walk MP</span>
                <span className="text-white font-mono">{unit.movement?.walk || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Run MP</span>
                <span className="text-white font-mono">{unit.movement?.walk ? Math.ceil(unit.movement.walk * 1.5) : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Jump MP</span>
                <span className="text-white font-mono">{unit.movement?.jump || 0}</span>
              </div>
              {unit.movement?.jumpJetType && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Jump Jets</span>
                  <span className="text-slate-300">{unit.movement.jumpJetType}</span>
                </div>
              )}
              {unit.movement?.enhancements && unit.movement.enhancements.length > 0 && (
                <div className="pt-2 border-t border-slate-700">
                  <span className="text-slate-400 text-sm">Enhancements:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {unit.movement.enhancements.map((e, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-emerald-600/20 text-emerald-400 text-xs">
                        {e}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Engine & Structure */}
          <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-cyan-400 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              </svg>
              Core Systems
            </h3>
            <div className="space-y-2">
              {unit.engine && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Engine</span>
                    <span className="text-white">{unit.engine.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Rating</span>
                    <span className="text-white font-mono">{unit.engine.rating}</span>
                  </div>
                </>
              )}
              {unit.gyro && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Gyro</span>
                  <span className="text-white">{unit.gyro.type}</span>
                </div>
              )}
              {unit.cockpit && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Cockpit</span>
                  <span className="text-white">{unit.cockpit}</span>
                </div>
              )}
              {unit.structure && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Structure</span>
                  <span className="text-white">{unit.structure.type}</span>
                </div>
              )}
            </div>
          </div>

          {/* Heat & Armor */}
          <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-rose-400 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
              </svg>
              Heat & Armor
            </h3>
            <div className="space-y-2">
              {unit.heatSinks && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Heat Sinks</span>
                    <span className="text-white font-mono">{unit.heatSinks.count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Type</span>
                    <span className="text-white">{unit.heatSinks.type}</span>
                  </div>
                </>
              )}
              {unit.armor && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Armor Type</span>
                    <span className="text-white">{unit.armor.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Armor</span>
                    <span className="text-white font-mono">{totalArmor} pts</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Armor Allocation */}
        {unit.armor?.allocation && (
          <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Armor Allocation</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Object.entries(unit.armor.allocation).map(([location, value]) => {
                const isObject = typeof value === 'object' && value !== null && 'front' in value;
                return (
                  <div key={location} className="bg-slate-700/30 rounded-lg p-3 text-center">
                    <div className="text-slate-400 text-xs uppercase mb-1">
                      {location.replace(/_/g, ' ')}
                    </div>
                    <div className="text-white font-mono">
                      {typeof value === 'number' ? (
                        value
                      ) : isObject ? (
                        <>
                          {value.front}
                          {value.rear > 0 && (
                            <span className="text-slate-500 text-sm"> / {value.rear}</span>
                          )}
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Equipment */}
        {unit.equipment && unit.equipment.length > 0 && (
          <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Equipment</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800/50">
                  <tr className="text-left text-slate-400 text-sm uppercase">
                    <th className="px-4 py-3">Equipment</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {unit.equipment.map((eq, index) => (
                    <tr key={index} className="hover:bg-slate-700/20">
                      <td className="px-4 py-3 text-white">{eq.id}</td>
                      <td className="px-4 py-3 text-slate-300">{eq.location}</td>
                      <td className="px-4 py-3 text-slate-400 text-sm">
                        {eq.isRearMounted && (
                          <span className="px-2 py-0.5 rounded bg-orange-600/20 text-orange-400 text-xs">
                            Rear
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Quirks */}
        {unit.quirks && unit.quirks.length > 0 && (
          <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Quirks</h3>
            <div className="flex flex-wrap gap-2">
              {unit.quirks.map((quirk, index) => (
                <span
                  key={index}
                  className="px-3 py-1 rounded-full bg-violet-600/20 text-violet-400 border border-violet-600/30 text-sm"
                >
                  {quirk}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
