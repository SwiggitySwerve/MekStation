/**
 * MechDashboard.tsx
 * Main dashboard for the v2 Mech Lab.
 */

import React, { useMemo } from 'react';
import { useMechLabStore } from '../hooks/useMechLabStore';
import { TechBase } from '../../../types/TechBase';
import { StructurePanel } from './panels/StructurePanel';
import { EnginePanel } from './panels/EnginePanel';
import { EquipmentPanel } from './panels/EquipmentPanel';
import { PaperDoll } from './panels/PaperDoll';
import { ExportPanel } from './panels/ExportPanel';
import { MechValidator } from '../../../mechanics/Validation';

export const MechDashboard: React.FC = () => {
  const { state, metrics, actions } = useMechLabStore();

  // Run validation
  const validation = useMemo(() => 
    MechValidator.validate(state, metrics.currentWeight), 
  [state, metrics.currentWeight]);

  return (
    <div className="p-4 bg-gray-900 text-white min-h-screen font-sans">
      <header className="mb-6 border-b border-gray-700 pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-blue-400">Mech Lab v2 (Alpha)</h1>
          <div className="text-sm text-gray-400 mt-1">Strict Type Safety • Pure Mechanics • No Magic Strings</div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold font-mono">
            <span className={metrics.currentWeight > state.tonnage ? "text-red-500" : "text-green-400"}>
              {metrics.currentWeight.toFixed(2)}
            </span>
            <span className="text-gray-500 text-xl">/{state.tonnage}</span>
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wider">Tonnage Used</div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Chassis & Structure */}
        <div className="space-y-6">
          <section className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <h2 className="text-lg font-semibold mb-3 text-blue-300">Chassis Specs</h2>
            
            {/* Tonnage Selector */}
            <div className="mb-4">
              <label className="block text-xs uppercase text-gray-500 mb-1">Tonnage</label>
              <select 
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
                value={state.tonnage}
                onChange={(e) => actions.setTonnage(Number(e.target.value))}
              >
                {[20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100].map(t => (
                  <option key={t} value={t}>{t} Tons</option>
                ))}
              </select>
            </div>

            {/* TechBase Selector */}
            <div className="mb-4">
              <label className="block text-xs uppercase text-gray-500 mb-1">Tech Base</label>
              <select 
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
                value={state.techBase}
                onChange={(e) => actions.setTechBase(e.target.value as TechBase)}
              >
                {Object.values(TechBase).map(tb => (
                  <option key={tb} value={tb}>{tb}</option>
                ))}
              </select>
            </div>
          </section>

          <StructurePanel />
          <ExportPanel />
        </div>

        {/* Column 2: Engine & Movement */}
        <div className="space-y-6">
          <EnginePanel />
          <EquipmentPanel />
        </div>

        {/* Column 3: Summary & Validation */}
        <div className="space-y-6">
          <section className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <h2 className="text-lg font-semibold mb-3 text-blue-300">Weight Summary</h2>
            <table className="w-full text-sm text-left">
              <tbody>
                <tr className="border-b border-gray-700">
                  <td className="py-2 text-gray-400">Structure</td>
                  <td className="py-2 text-right font-mono">{metrics.structureWeight.toFixed(2)}</td>
                </tr>
                <tr className="border-b border-gray-700">
                  <td className="py-2 text-gray-400">Engine</td>
                  <td className="py-2 text-right font-mono">{metrics.engineWeight.toFixed(2)}</td>
                </tr>
                <tr className="border-b border-gray-700">
                  <td className="py-2 text-gray-400">Gyro</td>
                  <td className="py-2 text-right font-mono">{metrics.gyroWeight.toFixed(2)}</td>
                </tr>
                <tr className="border-b border-gray-700">
                  <td className="py-2 text-gray-400">Cockpit</td>
                  <td className="py-2 text-right font-mono">{metrics.cockpitWeight.toFixed(2)}</td>
                </tr>
                <tr className="font-bold bg-gray-700/50">
                  <td className="py-2 pl-2">Total Used</td>
                  <td className="py-2 text-right pr-2 font-mono">{metrics.currentWeight.toFixed(2)}</td>
                </tr>
                <tr className={metrics.remainingTonnage < 0 ? "text-red-400 font-bold" : "text-green-400 font-bold"}>
                  <td className="py-2 pl-2">Remaining</td>
                  <td className="py-2 text-right pr-2 font-mono">{metrics.remainingTonnage.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Validation */}
          <section className={`bg-gray-800 p-4 rounded-lg border ${validation.isValid ? 'border-green-700' : 'border-red-700'}`}>
             <h2 className="text-lg font-semibold mb-3 text-blue-300">Validation</h2>
             
             {validation.isValid && validation.warnings.length === 0 && (
               <div className="text-green-400 font-bold text-center bg-green-900/20 p-2 rounded">
                 UNIT IS VALID
               </div>
             )}

             {validation.errors.length > 0 && (
               <div className="mb-4">
                 <h3 className="text-xs font-bold text-red-400 uppercase mb-1">Errors</h3>
                 <ul className="list-disc list-inside text-sm text-red-300">
                   {validation.errors.map((err, i) => <li key={i}>{err}</li>)}
                 </ul>
               </div>
             )}

             {validation.warnings.length > 0 && (
               <div>
                 <h3 className="text-xs font-bold text-yellow-400 uppercase mb-1">Warnings</h3>
                 <ul className="list-disc list-inside text-sm text-yellow-300">
                   {validation.warnings.map((warn, i) => <li key={i}>{warn}</li>)}
                 </ul>
               </div>
             )}
          </section>
          
          <PaperDoll />
        </div>
      </div>
    </div>
  );
};
