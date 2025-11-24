'use client';

import React, { useMemo } from 'react';
import { useCustomizerStore } from '../store/useCustomizerStore';
import { CriticalSlotMechanics } from '../../../mechanics/CriticalSlots';
import { WeightOps } from '../../../mechanics/WeightOps';

interface TopStatsBannerProps {
  onRequestReset(): void;
  onToggleDebug(): void;
}

export const TopStatsBanner: React.FC<TopStatsBannerProps> = ({
  onRequestReset,
  onToggleDebug,
}) => {
  const unit = useCustomizerStore(state => state.unit);
  const metrics = useCustomizerStore(state => state.metrics);
  const validation = useCustomizerStore(state => state.validation);

  const slotUsage = useMemo(() => CriticalSlotMechanics.getSlotUsage(unit), [unit]);
  const maxArmorPoints = useMemo(() => WeightOps.getMaxArmorPoints(unit.tonnage), [unit.tonnage]);
  const allocatedArmor = useMemo(() => {
    const allocations = Object.values(unit.armorAllocation ?? {});
    if (allocations.length === 0) {
      return 0;
    }
    return allocations.reduce((sum, value) => {
      if (typeof value === 'number') {
        return sum + value;
      }
      if (typeof value === 'object' && value !== null) {
        return (
          sum +
          Object.values(value)
            .filter(v => typeof v === 'number')
            .reduce((sub, v) => sub + (v as number), 0)
        );
      }
      return sum;
    }, 0);
  }, [unit.armorAllocation]);

  const runningMP = Math.ceil(unit.walkingMP * 1.5);
  const engineHeatSinks = Math.floor(metrics.engineRating / 25);

  return (
    <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-col gap-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">{unit.name}</h1>
          <p className="text-sm text-slate-400">
            {unit.tonnage}-ton {unit.techBase} • Rules: {unit.rulesLevel}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center text-xs">
            <span
              className={`w-2 h-2 rounded-full mr-2 ${
                validation.isValid ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className={validation.isValid ? 'text-green-400' : 'text-red-400'}>
              {validation.isValid
                ? 'Valid'
                : `${validation.errors.length} issues, ${validation.warnings.length} warnings`}
            </span>
          </div>
          <button
            className="px-3 py-1 text-xs bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
            onClick={onRequestReset}
          >
            Reset
          </button>
          <button
            className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors"
            onClick={onToggleDebug}
          >
            Debug
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 text-center text-xs">
        <div className="bg-slate-800/60 border border-slate-700 rounded p-2">
          <p className="text-slate-400 uppercase tracking-wide">Movement</p>
          <p className="text-slate-100 text-lg font-mono">
            {unit.walkingMP}/{runningMP}
          </p>
          <p className="text-slate-500 text-[10px]">Walk / Run</p>
        </div>
        <div className="bg-slate-800/60 border border-slate-700 rounded p-2">
          <p className="text-slate-400 uppercase tracking-wide">Weight</p>
          <p
            className={`text-lg font-mono ${
              metrics.currentWeight > unit.tonnage ? 'text-red-400' : 'text-slate-100'
            }`}
          >
            {metrics.currentWeight.toFixed(2)}/{unit.tonnage}
          </p>
          <p className="text-slate-500 text-[10px]">tons used</p>
        </div>
        <div className="bg-slate-800/60 border border-slate-700 rounded p-2">
          <p className="text-slate-400 uppercase tracking-wide">Criticals</p>
          <p className="text-slate-100 text-lg font-mono">
            {slotUsage.used}/{slotUsage.total}
          </p>
          <p className="text-slate-500 text-[10px]">used / total</p>
        </div>
        <div className="bg-slate-800/60 border border-slate-700 rounded p-2">
          <p className="text-slate-400 uppercase tracking-wide">Armor</p>
          <p className="text-slate-100 text-lg font-mono">
            {allocatedArmor}/{maxArmorPoints}
          </p>
          <p className="text-slate-500 text-[10px]">allocated / max</p>
        </div>
        <div className="bg-slate-800/60 border border-slate-700 rounded p-2">
          <p className="text-slate-400 uppercase tracking-wide">Engine Rating</p>
          <p className="text-slate-100 text-lg font-mono">{metrics.engineRating}</p>
          <p className="text-slate-500 text-[10px]">{unit.engineType}</p>
        </div>
        <div className="bg-slate-800/60 border border-slate-700 rounded p-2">
          <p className="text-slate-400 uppercase tracking-wide">Heat Sinks</p>
          <p className="text-slate-100 text-lg font-mono">{engineHeatSinks}</p>
          <p className="text-slate-500 text-[10px]">integral</p>
        </div>
        <div className="bg-slate-800/60 border border-slate-700 rounded p-2">
          <p className="text-slate-400 uppercase tracking-wide">Structure</p>
          <p className="text-slate-100 text-lg font-mono">{unit.structureType}</p>
          <p className="text-slate-500 text-[10px]">type</p>
        </div>
        <div className="bg-slate-800/60 border border-slate-700 rounded p-2">
          <p className="text-slate-400 uppercase tracking-wide">Armor Type</p>
          <p className="text-slate-100 text-lg font-mono">{unit.armorType}</p>
          <p className="text-slate-500 text-[10px]">configuration</p>
        </div>
      </div>
    </div>
  );
};

