/**
 * StructurePanel.tsx
 * UI Panel for configuring internal structure and chassis options.
 */

import React from 'react';
import { useMechLabStore } from '../../hooks/useMechLabStore';
import { StructureType } from '../../../../types/SystemComponents';
import { StructureMechanics } from '../../../../mechanics/Structure';

export const StructurePanel: React.FC = () => {
  const { state, actions } = useMechLabStore();

  const structureWeight = StructureMechanics.calculateWeight(state.tonnage, state.structureType);
  const structureSlots = StructureMechanics.getRequiredSlots(state.structureType, state.techBase);
  const structurePoints = StructureMechanics.getPoints(state.tonnage);

  return (
    <section className="bg-gray-800 p-4 rounded-lg border border-gray-700">
      <h2 className="text-lg font-semibold mb-4 text-blue-300 border-b border-gray-700 pb-2">
        Structure & Armor
      </h2>

      {/* Structure Type Selection */}
      <div className="mb-6">
        <label className="block text-xs uppercase text-gray-500 mb-1">Internal Structure Type</label>
        <div className="flex flex-col gap-2">
          <select 
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
            value={state.structureType}
            onChange={(e) => actions.setStructureType(e.target.value as StructureType)}
          >
            {Object.values(StructureType).map(st => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
          
          <div className="grid grid-cols-2 gap-4 text-sm bg-gray-900/50 p-3 rounded border border-gray-700">
            <div>
              <span className="text-gray-400 text-xs block">Weight</span>
              <span className="font-mono text-green-400">{structureWeight} tons</span>
            </div>
            <div>
              <span className="text-gray-400 text-xs block">Critical Slots</span>
              <span className="font-mono text-yellow-400">{structureSlots} slots</span>
            </div>
          </div>
        </div>
      </div>

      {/* Structure Points Display */}
      <div className="mb-6">
        <h3 className="text-xs uppercase text-gray-500 mb-2">Internal Structure Points</h3>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-gray-700 p-2 rounded col-start-2">
            <div className="text-gray-400">Head</div>
            <div className="font-mono font-bold">{structurePoints.hd}</div>
          </div>
          <div className="bg-gray-700 p-2 rounded col-start-1 row-start-2">
            <div className="text-gray-400">L. Torso</div>
            <div className="font-mono font-bold">{structurePoints.lt}</div>
          </div>
          <div className="bg-gray-700 p-2 rounded col-start-2 row-start-2 border border-blue-500/30">
            <div className="text-gray-400">C. Torso</div>
            <div className="font-mono font-bold text-blue-300">{structurePoints.ct}</div>
          </div>
          <div className="bg-gray-700 p-2 rounded col-start-3 row-start-2">
            <div className="text-gray-400">R. Torso</div>
            <div className="font-mono font-bold">{structurePoints.rt}</div>
          </div>
          <div className="bg-gray-700 p-2 rounded col-start-1 row-start-3">
            <div className="text-gray-400">L. Arm</div>
            <div className="font-mono font-bold">{structurePoints.la}</div>
          </div>
          <div className="bg-gray-700 p-2 rounded col-start-3 row-start-3">
            <div className="text-gray-400">R. Arm</div>
            <div className="font-mono font-bold">{structurePoints.ra}</div>
          </div>
          <div className="bg-gray-700 p-2 rounded col-start-1 row-start-4">
            <div className="text-gray-400">L. Leg</div>
            <div className="font-mono font-bold">{structurePoints.ll}</div>
          </div>
          <div className="bg-gray-700 p-2 rounded col-start-3 row-start-4">
            <div className="text-gray-400">R. Leg</div>
            <div className="font-mono font-bold">{structurePoints.rl}</div>
          </div>
        </div>
      </div>
    </section>
  );
};

