/**
 * Equipment Detail Page
 * Displays full specifications for a single equipment item.
 */
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { TechBase } from '@/types/enums/TechBase';

interface EquipmentData {
  id: string;
  name: string;
  category?: string;
  techBase?: TechBase;
  rulesLevel?: string;
  weight?: number;
  criticalSlots?: number;
  costCBills?: number;
  
  // Weapon-specific
  damage?: number;
  heat?: number;
  minimumRange?: number;
  shortRange?: number;
  mediumRange?: number;
  longRange?: number;
  extremeRange?: number;
  ammoPerTon?: number;
  
  // Temporal
  introductionYear?: number;
  extinctionYear?: number;
  reintroductionYear?: number;
  
  // Additional
  description?: string;
  specialRules?: string[];
  battleValue?: number;
}

// Category display names
const categoryLabels: Record<string, string> = {
  ENERGY_WEAPON: 'Energy Weapon',
  BALLISTIC_WEAPON: 'Ballistic Weapon',
  MISSILE_WEAPON: 'Missile Weapon',
  AMMUNITION: 'Ammunition',
  PHYSICAL_WEAPON: 'Physical Weapon',
  ELECTRONICS: 'Electronics',
  HEAT_SINK: 'Heat Sink',
  JUMP_JET: 'Jump Jet',
  MYOMER: 'Myomer Enhancement',
  MOVEMENT_ENHANCEMENT: 'Movement Enhancement',
  TARGETING_SYSTEM: 'Targeting System',
  INDUSTRIAL: 'Industrial Equipment',
  MISC_EQUIPMENT: 'Misc Equipment',
};

export default function EquipmentDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [equipment, setEquipment] = useState<EquipmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    async function fetchEquipment() {
      try {
        const response = await fetch(`/api/equipment?id=${encodeURIComponent(id as string)}`);
        const data = await response.json();
        
        if (data.success) {
          setEquipment(data.data);
        } else {
          setError(data.error || 'Equipment not found');
        }
      } catch (err) {
        setError('Failed to load equipment');
      } finally {
        setLoading(false);
      }
    }

    fetchEquipment();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading equipment data...</p>
        </div>
      </div>
    );
  }

  if (error || !equipment) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8">
        <div className="bg-red-900/20 border border-red-600/30 rounded-xl p-8 max-w-md text-center">
          <h2 className="text-xl font-semibold text-red-400 mb-2">Equipment Not Found</h2>
          <p className="text-slate-400 mb-6">{error || 'The requested equipment could not be found.'}</p>
          <Link
            href="/equipment"
            className="inline-block bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Back to Equipment
          </Link>
        </div>
      </div>
    );
  }

  const isWeapon = equipment.category?.includes('WEAPON');
  const hasRangeData = equipment.shortRange || equipment.mediumRange || equipment.longRange;

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Back navigation */}
        <Link
          href="/equipment"
          className="inline-flex items-center text-slate-400 hover:text-cyan-400 transition-colors mb-6"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 mr-2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Equipment
        </Link>

        {/* Header */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{equipment.name}</h1>
              <div className="flex flex-wrap gap-3 text-sm">
                {equipment.category && (
                  <span className="px-3 py-1 rounded-full bg-cyan-600/20 text-cyan-400 border border-cyan-600/30">
                    {categoryLabels[equipment.category] || equipment.category.replace(/_/g, ' ')}
                  </span>
                )}
                {equipment.techBase && (
                  <span className={`px-3 py-1 rounded-full border ${
                    equipment.techBase === TechBase.INNER_SPHERE 
                      ? 'bg-blue-600/20 text-blue-400 border-blue-600/30'
                      : equipment.techBase === TechBase.CLAN
                      ? 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30'
                      : 'bg-purple-600/20 text-purple-400 border-purple-600/30'
                  }`}>
                    {equipment.techBase.replace(/_/g, ' ')}
                  </span>
                )}
                {equipment.rulesLevel && (
                  <span className="px-3 py-1 rounded-full bg-slate-600/50 text-slate-300 border border-slate-500/30">
                    {equipment.rulesLevel.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Basic Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Physical Properties */}
          <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-cyan-400 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" />
              </svg>
              Physical Properties
            </h3>
            <div className="space-y-3">
              {equipment.weight !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Weight</span>
                  <span className="text-white font-mono bg-slate-700/50 px-3 py-1 rounded">
                    {equipment.weight} tons
                  </span>
                </div>
              )}
              {equipment.criticalSlots !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Critical Slots</span>
                  <span className="text-white font-mono bg-slate-700/50 px-3 py-1 rounded">
                    {equipment.criticalSlots}
                  </span>
                </div>
              )}
              {equipment.costCBills !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Cost (C-Bills)</span>
                  <span className="text-amber-400 font-mono bg-slate-700/50 px-3 py-1 rounded">
                    {equipment.costCBills.toLocaleString()}
                  </span>
                </div>
              )}
              {equipment.battleValue !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Battle Value</span>
                  <span className="text-white font-mono bg-slate-700/50 px-3 py-1 rounded">
                    {equipment.battleValue}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Availability */}
          <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-amber-400 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              Availability
            </h3>
            <div className="space-y-3">
              {equipment.introductionYear !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Introduced</span>
                  <span className="text-white font-mono">{equipment.introductionYear}</span>
                </div>
              )}
              {equipment.extinctionYear !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Extinct</span>
                  <span className="text-red-400 font-mono">{equipment.extinctionYear}</span>
                </div>
              )}
              {equipment.reintroductionYear !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Reintroduced</span>
                  <span className="text-emerald-400 font-mono">{equipment.reintroductionYear}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Combat Stats (for weapons) */}
        {isWeapon && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Damage & Heat */}
            <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                </svg>
                Combat Stats
              </h3>
              <div className="space-y-3">
                {equipment.damage !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Damage</span>
                    <span className="text-red-400 font-mono text-lg bg-slate-700/50 px-3 py-1 rounded">
                      {equipment.damage}
                    </span>
                  </div>
                )}
                {equipment.heat !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Heat</span>
                    <span className="text-orange-400 font-mono text-lg bg-slate-700/50 px-3 py-1 rounded">
                      {equipment.heat}
                    </span>
                  </div>
                )}
                {equipment.ammoPerTon !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Ammo/Ton</span>
                    <span className="text-white font-mono bg-slate-700/50 px-3 py-1 rounded">
                      {equipment.ammoPerTon}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Range Data */}
            {hasRangeData && (
              <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-emerald-400 mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H6A2.25 2.25 0 003.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0120.25 6v1.5m0 9V18A2.25 2.25 0 0118 20.25h-1.5m-9 0H6A2.25 2.25 0 013.75 18v-1.5M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Range Profile
                </h3>
                <div className="space-y-3">
                  {equipment.minimumRange !== undefined && equipment.minimumRange > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Minimum</span>
                      <span className="text-yellow-400 font-mono">{equipment.minimumRange}</span>
                    </div>
                  )}
                  {equipment.shortRange !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Short Range</span>
                      <span className="text-emerald-400 font-mono">{equipment.shortRange}</span>
                    </div>
                  )}
                  {equipment.mediumRange !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Medium Range</span>
                      <span className="text-cyan-400 font-mono">{equipment.mediumRange}</span>
                    </div>
                  )}
                  {equipment.longRange !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Long Range</span>
                      <span className="text-blue-400 font-mono">{equipment.longRange}</span>
                    </div>
                  )}
                  {equipment.extremeRange !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Extreme Range</span>
                      <span className="text-violet-400 font-mono">{equipment.extremeRange}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Special Rules */}
        {equipment.specialRules && equipment.specialRules.length > 0 && (
          <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Special Rules</h3>
            <div className="flex flex-wrap gap-2">
              {equipment.specialRules.map((rule, index) => (
                <span
                  key={index}
                  className="px-3 py-1 rounded-full bg-violet-600/20 text-violet-400 border border-violet-600/30 text-sm"
                >
                  {rule}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {equipment.description && (
          <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Description</h3>
            <p className="text-slate-300 leading-relaxed">{equipment.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
