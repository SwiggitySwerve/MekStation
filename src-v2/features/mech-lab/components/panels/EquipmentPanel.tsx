/**
 * EquipmentPanel.tsx
 * UI Panel for selecting equipment (Weapons, Ammo, etc.).
 */

import React from 'react';
import { useMechLabStore } from '../../hooks/useMechLabStore';
import { WEAPONS_DB, getWeaponById } from '../../../../data/weapons';

export const EquipmentPanel: React.FC = () => {
  const { state, actions } = useMechLabStore();

  return (
    <section className="bg-gray-800 p-4 rounded-lg border border-gray-700">
      <h2 className="text-lg font-semibold mb-4 text-blue-300 border-b border-gray-700 pb-2">
        Equipment & Weapons
      </h2>

      {/* Installed Equipment List */}
      <div className="mb-6">
        <h3 className="text-xs uppercase text-gray-500 mb-2">Installed Equipment</h3>
        {state.equipment.length === 0 ? (
          <div className="text-sm text-gray-500 italic text-center py-4 bg-gray-900/50 rounded">
            No equipment installed
          </div>
        ) : (
          <div className="space-y-2">
            {state.equipment.map((item) => {
              const def = getWeaponById(item.equipmentId);
              if (!def) return null;
              return (
                <div key={item.id} className="bg-gray-700 p-2 rounded border border-gray-600 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-sm text-white">{def.name}</div>
                    <div className="text-xs text-gray-400">
                      {item.location === 'unallocated' ? 'Unallocated' : item.location} • {def.weight} tons • {def.criticalSlots} slots
                    </div>
                  </div>
                  <button 
                    onClick={() => actions.removeEquipment(item.id)}
                    className="text-red-400 hover:text-red-300 text-xs font-bold px-2"
                  >
                    REMOVE
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Available Equipment List */}
      <div>
        <h3 className="text-xs uppercase text-gray-500 mb-2">Available Weapons</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
          {WEAPONS_DB.map(weapon => (
            <div key={weapon.id} className="bg-gray-900 p-2 rounded border border-gray-700 flex justify-between items-center hover:bg-gray-800 transition-colors">
              <div>
                <div className="font-bold text-sm text-blue-200">{weapon.name}</div>
                <div className="text-xs text-gray-500">
                  {weapon.type} • {weapon.weight} tons • {weapon.criticalSlots} slots
                </div>
              </div>
              <button 
                onClick={() => actions.addEquipment(weapon.id)}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs font-bold text-white"
              >
                ADD
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
