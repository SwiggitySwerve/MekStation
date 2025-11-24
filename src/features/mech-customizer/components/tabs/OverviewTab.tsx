'use client';

import React from 'react';
import { useCustomizerViewModel } from '../../store/useCustomizerStore';
import { getWeaponById } from '../../../../data/weapons';

export const OverviewTab: React.FC = () => {
  const { unit, metrics, validation } = useCustomizerViewModel();

  return (
    <div className="space-y-6">
      <section className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <h3 className="text-slate-200 font-semibold mb-3">Weight Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div className="bg-slate-800/70 rounded p-3">
            <p className="text-slate-400 text-xs uppercase">Structure</p>
            <p className="text-slate-100 font-mono text-lg">{metrics.structureWeight} t</p>
          </div>
          <div className="bg-slate-800/70 rounded p-3">
            <p className="text-slate-400 text-xs uppercase">Engine</p>
            <p className="text-slate-100 font-mono text-lg">{metrics.engineWeight} t</p>
          </div>
          <div className="bg-slate-800/70 rounded p-3">
            <p className="text-slate-400 text-xs uppercase">Gyro</p>
            <p className="text-slate-100 font-mono text-lg">{metrics.gyroWeight} t</p>
          </div>
          <div className="bg-slate-800/70 rounded p-3">
            <p className="text-slate-400 text-xs uppercase">Cockpit</p>
            <p className="text-slate-100 font-mono text-lg">{metrics.cockpitWeight} t</p>
          </div>
          <div className="bg-slate-800/70 rounded p-3">
            <p className="text-slate-400 text-xs uppercase">Equipment</p>
            <p className="text-slate-100 font-mono text-lg">{metrics.equipmentWeight} t</p>
          </div>
          <div className="bg-slate-800/70 rounded p-3">
            <p className="text-slate-400 text-xs uppercase">Remaining</p>
            <p
              className={`text-lg font-mono ${
                metrics.remainingTonnage < 0 ? 'text-red-400' : 'text-green-400'
              }`}
            >
              {metrics.remainingTonnage.toFixed(2)} t
            </p>
          </div>
        </div>
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <h3 className="text-slate-200 font-semibold mb-3">Validation</h3>
        {validation.isValid && validation.errors.length === 0 && validation.warnings.length === 0 && (
          <p className="text-green-400 text-sm">Unit configuration satisfies all core rules.</p>
        )}
        {validation.errors.length > 0 && (
          <div className="mb-4">
            <p className="text-red-400 text-xs uppercase mb-2 font-semibold">Errors</p>
            <ul className="text-sm text-red-300 space-y-1 list-disc list-inside">
              {validation.errors.map((error, idx) => (
                <li key={`error-${idx}`}>{error}</li>
              ))}
            </ul>
          </div>
        )}
        {validation.warnings.length > 0 && (
          <div>
            <p className="text-yellow-400 text-xs uppercase mb-2 font-semibold">Warnings</p>
            <ul className="text-sm text-yellow-300 space-y-1 list-disc list-inside">
              {validation.warnings.map((warning, idx) => (
                <li key={`warning-${idx}`}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <h3 className="text-slate-200 font-semibold mb-3">Installed Equipment</h3>
        {unit.equipment.length === 0 ? (
          <p className="text-sm text-slate-400">No equipment installed yet.</p>
        ) : (
          <div className="space-y-2 text-sm">
            {unit.equipment.map(item => {
              const def = getWeaponById(item.equipmentId);
              return (
                <div
                  key={item.id}
                  className="flex justify-between border border-slate-800 rounded px-3 py-2 bg-slate-800/50"
                >
                  <div>
                    <p className="text-slate-100 font-semibold">
                      {def?.name ?? item.equipmentId}
                    </p>
                    <p className="text-slate-500 text-xs">
                      {item.location === 'unallocated' ? 'Unallocated' : item.location}
                    </p>
                  </div>
                  {def && (
                    <p className="text-slate-400 font-mono">
                      {def.weight}t / {def.criticalSlots}cr
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

