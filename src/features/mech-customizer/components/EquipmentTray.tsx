'use client';

import React, { useMemo } from 'react';
import { useCustomizerStore } from '../store/useCustomizerStore';
import { getWeaponById } from '../../../data/weapons';

interface EquipmentTrayProps {
  isExpanded: boolean;
  onToggle(): void;
}

export const EquipmentTray: React.FC<EquipmentTrayProps> = ({ isExpanded, onToggle }) => {
  const equipment = useCustomizerStore(state => state.unit.equipment);
  const removeEquipment = useCustomizerStore(state => state.removeEquipment);

  const unallocated = useMemo(
    () => equipment.filter(item => item.location === 'unallocated'),
    [equipment]
  );

  return (
    <>
      <button
        onClick={onToggle}
        className="fixed top-1/3 right-0 z-40 bg-slate-800 text-slate-200 border border-slate-700 rounded-l px-2 py-8 text-xs tracking-wide hover:bg-slate-700"
        aria-expanded={isExpanded}
      >
        {isExpanded ? 'Close' : 'Equipment'}
      </button>
      <aside
        className={`fixed top-0 right-0 h-full w-80 bg-slate-900 border-l border-slate-800 transform transition-transform duration-300 z-30 ${
          isExpanded ? 'translate-x-0' : 'translate-x-full'
        } flex flex-col`}
      >
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-slate-100 font-semibold text-sm">Equipment Tray</h3>
          <button className="text-slate-400 hover:text-slate-100" onClick={onToggle}>
            ✕
          </button>
        </div>
        <div className="p-4 space-y-3 overflow-y-auto flex-1 custom-scrollbar text-sm">
          {unallocated.length === 0 && (
            <p className="text-slate-500 text-center">No unallocated equipment</p>
          )}
          {unallocated.map(item => {
            const def = getWeaponById(item.equipmentId);
            return (
              <div
                key={item.id}
                className="border border-slate-700 rounded px-3 py-2 flex flex-col gap-1 bg-slate-800/70"
              >
                <div className="flex justify-between items-center">
                  <span className="text-slate-100 font-semibold text-xs">
                    {def?.name ?? item.equipmentId}
                  </span>
                  <button
                    className="text-red-400 text-[10px] uppercase tracking-wide"
                    onClick={() => removeEquipment(item.id)}
                  >
                    Remove
                  </button>
                </div>
                <div className="text-slate-400 text-[11px]">
                  {def ? `${def.type} • ${def.weight}t • ${def.criticalSlots} slots` : 'Custom'}
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
};

