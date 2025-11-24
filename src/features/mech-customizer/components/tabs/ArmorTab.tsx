'use client';

import React from 'react';
import { useCustomizerViewModel } from '../../store/useCustomizerStore';
import { ArmorType, HeatSinkType } from '../../../../types/SystemComponents';
import { WeightOps } from '../../../../mechanics/WeightOps';

const armorTypes = Object.values(ArmorType);
const heatSinkTypes = Object.values(HeatSinkType);

export const ArmorTab: React.FC = () => {
  const { unit, actions } = useCustomizerViewModel();
  const maxArmor = WeightOps.getMaxArmorPoints(unit.tonnage);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <section className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
        <div>
          <label className="text-xs uppercase text-slate-400 block mb-2">Armor Type</label>
          <select
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100"
            value={unit.armorType}
            onChange={event => actions.setArmorType(event.target.value as ArmorType)}
          >
            {armorTypes.map(type => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div className="text-sm text-slate-300">
          <p>
            Maximum armor points for this chassis:{' '}
            <span className="font-mono text-slate-100">{maxArmor}</span>
          </p>
          <p className="text-slate-500 text-xs">
            Values sourced from TechManual tables via `WeightOps.getMaxArmorPoints`.
          </p>
        </div>
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
        <div>
          <label className="text-xs uppercase text-slate-400 block mb-2">Heat Sink Type</label>
          <select
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100"
            value={unit.heatSinkType}
            onChange={event => actions.setHeatSinkType(event.target.value as HeatSinkType)}
          >
            {heatSinkTypes.map(type => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-slate-500">
          Heat sink weights follow the TechManual defaults (1 ton each unless compact or laser).
        </p>
      </section>
    </div>
  );
};

