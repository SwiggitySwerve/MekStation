/**
 * EnginePanel.tsx
 * UI Panel for configuring engine, gyro, and movement.
 */

import React from 'react';
import { useMechLabStore } from '../../hooks/useMechLabStore';
import { EngineType, GyroType } from '../../../../types/SystemComponents';
import { EngineMechanics } from '../../../../mechanics/Engine';
import { GyroMechanics } from '../../../../mechanics/Gyro';

export const EnginePanel: React.FC = () => {
  const { state, metrics, actions } = useMechLabStore();

  const engineSlots = EngineMechanics.getRequiredSlots(state.engineType, state.techBase);
  const gyroSlots = GyroMechanics.getRequiredSlots(state.gyroType);
  const internalHS = EngineMechanics.calculateInternalHeatSinks(metrics.engineRating);

  return (
    <section className="bg-gray-800 p-4 rounded-lg border border-gray-700">
      <h2 className="text-lg font-semibold mb-4 text-blue-300 border-b border-gray-700 pb-2">
        Engine & Systems
      </h2>

      {/* Movement */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs uppercase text-gray-500 mb-1">Walking MP</label>
          <input 
            type="number"
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-center font-mono text-lg focus:ring-2 focus:ring-blue-500"
            value={state.walkingMP}
            onChange={(e) => actions.setWalkingMP(Math.max(1, Number(e.target.value)))}
            min={1}
            max={15}
          />
        </div>
        <div>
          <label className="block text-xs uppercase text-gray-500 mb-1">Running MP</label>
          <div className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-gray-300 text-center font-mono text-lg">
            {Math.ceil(state.walkingMP * 1.5)}
          </div>
        </div>
      </div>

      {/* Engine Configuration */}
      <div className="mb-6">
        <label className="block text-xs uppercase text-gray-500 mb-1">Engine Type</label>
        <select 
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white mb-2 focus:ring-2 focus:ring-blue-500"
          value={state.engineType}
          onChange={(e) => actions.setEngineType(e.target.value as EngineType)}
        >
          {Object.values(EngineType).map(et => (
            <option key={et} value={et}>{et}</option>
          ))}
        </select>

        <div className="bg-gray-900/50 p-3 rounded border border-gray-700 text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-400">Rating</span>
            <span className="font-mono font-bold">{metrics.engineRating}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Weight</span>
            <span className="font-mono text-green-400">{metrics.engineWeight} tons</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Slots (CT/Side)</span>
            <span className="font-mono text-yellow-400">{engineSlots.ct} / {engineSlots.sideTorso}</span>
          </div>
          <div className="flex justify-between border-t border-gray-700 pt-2 mt-2">
            <span className="text-gray-400">Integral Heat Sinks</span>
            <span className="font-mono text-blue-300">{internalHS}</span>
          </div>
        </div>
      </div>

      {/* Gyro Configuration */}
      <div className="mb-4">
        <label className="block text-xs uppercase text-gray-500 mb-1">Gyro Type</label>
        <select 
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white mb-2 focus:ring-2 focus:ring-blue-500"
          value={state.gyroType}
          // Add setGyroType to store actions first! For now assumes standard
          disabled={true} 
        >
          {Object.values(GyroType).map(gt => (
            <option key={gt} value={gt}>{gt}</option>
          ))}
        </select>
        
        <div className="flex justify-between text-sm px-1">
          <span className="text-gray-400">Weight: <span className="text-green-400">{metrics.gyroWeight} tons</span></span>
          <span className="text-gray-400">Slots: <span className="text-yellow-400">{gyroSlots}</span></span>
        </div>
      </div>
    </section>
  );
};

