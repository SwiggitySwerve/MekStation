/**
 * Unit Customizer Page
 * Interface for creating and modifying custom BattleMech variants.
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
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

type WorkMode = 'select' | 'new' | 'edit';

export default function CustomizerPage() {
  const [mode, setMode] = useState<WorkMode>('select');
  const [units, setUnits] = useState<UnitEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<UnitEntry | null>(null);

  // Fetch units for the selector
  useEffect(() => {
    if (mode !== 'select') return;

    async function fetchUnits() {
      setLoading(true);
      try {
        const response = await fetch('/api/catalog');
        const data = await response.json();
        if (data.success) {
          setUnits(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch units:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchUnits();
  }, [mode]);

  // Filter units by search
  const filteredUnits = units.filter(unit => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      unit.name.toLowerCase().includes(search) ||
      unit.chassis.toLowerCase().includes(search) ||
      unit.variant.toLowerCase().includes(search)
    );
  }).slice(0, 50); // Limit for performance

  const handleSelectUnit = (unit: UnitEntry) => {
    setSelectedUnit(unit);
    setMode('edit');
  };

  const handleCreateNew = () => {
    setSelectedUnit(null);
    setMode('new');
  };

  const handleBack = () => {
    setMode('select');
    setSelectedUnit(null);
  };

  // Selection Mode
  if (mode === 'select') {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Unit Customizer</h1>
            <p className="text-slate-400">
              Create a new unit from scratch or modify an existing design
            </p>
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Create New */}
            <button
              onClick={handleCreateNew}
              className="group bg-gradient-to-br from-emerald-600/20 to-teal-700/20 border border-emerald-600/30 rounded-2xl p-8 text-left hover:border-emerald-500/50 hover:from-emerald-600/30 hover:to-teal-700/30 transition-all"
            >
              <div className="p-4 rounded-xl bg-emerald-600 text-white w-fit mb-4 group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Create New Unit</h2>
              <p className="text-slate-400">
                Start from scratch and build a completely custom BattleMech design
              </p>
            </button>

            {/* Load Existing */}
            <div className="bg-slate-800/30 border border-slate-700 rounded-2xl p-8">
              <div className="p-4 rounded-xl bg-cyan-600 text-white w-fit mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Modify Existing</h2>
              <p className="text-slate-400 mb-4">
                Select a canonical unit as your starting point
              </p>

              {/* Search */}
              <input
                type="text"
                placeholder="Search units..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:border-cyan-500 focus:outline-none mb-4"
              />

              {/* Unit List */}
              <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-600">
                {loading ? (
                  <div className="p-4 text-center text-slate-400">Loading units...</div>
                ) : filteredUnits.length === 0 ? (
                  <div className="p-4 text-center text-slate-400">
                    {searchTerm ? 'No units match your search' : 'No units available'}
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-700/50">
                    {filteredUnits.map((unit) => (
                      <li key={unit.id}>
                        <button
                          onClick={() => handleSelectUnit(unit)}
                          className="w-full px-4 py-3 text-left hover:bg-slate-700/50 transition-colors"
                        >
                          <div className="font-medium text-white">{unit.name}</div>
                          <div className="text-sm text-slate-400">
                            {unit.tonnage}t {unit.weightClass} • {unit.techBase.replace(/_/g, ' ')}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Custom Units Section */}
          <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-violet-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
              </svg>
              Your Custom Units
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              Custom units are stored locally in your browser using IndexedDB for privacy and offline access.
            </p>
            <div className="bg-slate-700/30 rounded-lg p-8 text-center text-slate-400 border border-dashed border-slate-600">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mx-auto mb-3 text-slate-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
              <p>No custom units yet</p>
              <p className="text-sm mt-1">Create your first custom unit to see it here</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // New / Edit Mode
  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="inline-flex items-center text-slate-400 hover:text-emerald-400 transition-colors mb-6"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 mr-2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Selection
        </button>

        {/* Header */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            {mode === 'new' ? 'New Custom Unit' : `Customizing: ${selectedUnit?.name}`}
          </h1>
          <p className="text-slate-400">
            {mode === 'new' 
              ? 'Configure your new BattleMech from the ground up'
              : `Based on ${selectedUnit?.chassis} ${selectedUnit?.variant}`}
          </p>
        </div>

        {/* Editor Placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Editor */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Chassis Name</label>
                  <input
                    type="text"
                    defaultValue={selectedUnit?.chassis || ''}
                    placeholder="e.g., Atlas"
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Model/Variant</label>
                  <input
                    type="text"
                    defaultValue={selectedUnit?.variant || ''}
                    placeholder="e.g., AS7-D"
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Tonnage</label>
                  <select
                    defaultValue={selectedUnit?.tonnage || 50}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
                  >
                    {[20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100].map(t => (
                      <option key={t} value={t}>{t} tons</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Tech Base</label>
                  <select
                    defaultValue={selectedUnit?.techBase || TechBase.INNER_SPHERE}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
                  >
                    {Object.values(TechBase).map(tb => (
                      <option key={tb} value={tb}>{tb.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Construction Notice */}
            <div className="bg-amber-600/10 border border-amber-600/30 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-amber-600/20 text-amber-400">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-amber-400 mb-1">Editor Under Development</h4>
                  <p className="text-slate-400 text-sm">
                    The full customizer with engine selection, armor allocation, equipment placement, 
                    and critical slot assignment is being built. Check back soon for the complete
                    TechManual-accurate construction interface.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Stats */}
          <div className="space-y-6">
            {/* Weight Summary */}
            <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Weight Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Max Tonnage</span>
                  <span className="text-white font-mono">{selectedUnit?.tonnage || 50}t</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Used</span>
                  <span className="text-white font-mono">0t</span>
                </div>
                <div className="flex justify-between border-t border-slate-700 pt-2 mt-2">
                  <span className="text-slate-400">Remaining</span>
                  <span className="text-emerald-400 font-mono">{selectedUnit?.tonnage || 50}t</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Actions</h3>
              <div className="space-y-2">
                <button
                  disabled
                  className="w-full bg-emerald-600/50 text-emerald-300 py-2 rounded-lg cursor-not-allowed opacity-50"
                >
                  Save Unit
                </button>
                <button
                  disabled
                  className="w-full bg-slate-700/50 text-slate-400 py-2 rounded-lg cursor-not-allowed opacity-50"
                >
                  Validate
                </button>
                <button
                  disabled
                  className="w-full bg-slate-700/50 text-slate-400 py-2 rounded-lg cursor-not-allowed opacity-50"
                >
                  Export MTF
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
