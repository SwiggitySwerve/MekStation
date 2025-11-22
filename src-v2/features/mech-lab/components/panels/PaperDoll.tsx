/**
 * PaperDoll.tsx
 * UI component to visualize critical slots (Paper Doll).
 * Interactive assignment supported.
 */

import React, { useMemo, useState } from 'react';
import { useMechLabStore } from '../../hooks/useMechLabStore';
import { CriticalSlotMechanics, MechLocation, ILocationSlots, ICriticalSlot } from '../../../../mechanics/CriticalSlots';
import { getWeaponById } from '../../../../data/weapons';

const LOCATION_ORDER = [
  MechLocation.HEAD,
  MechLocation.CENTER_TORSO,
  MechLocation.RIGHT_TORSO,
  MechLocation.LEFT_TORSO,
  MechLocation.RIGHT_ARM,
  MechLocation.LEFT_ARM,
  MechLocation.RIGHT_LEG,
  MechLocation.LEFT_LEG,
];

export const PaperDoll: React.FC = () => {
  const { state, actions } = useMechLabStore();
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);

  // Generate Layout
  const layout = useMemo(() => {
    return CriticalSlotMechanics.generateBaseLayout(
      state.techBase,
      state.engineType,
      state.gyroType,
      state.cockpitType,
      state.equipment
    );
  }, [state.techBase, state.engineType, state.gyroType, state.cockpitType, state.equipment]);

  const handleSlotClick = (location: MechLocation, slotIndex: number) => {
    if (selectedEquipmentId) {
      // Try to assign selected equipment to this slot
      const canPlace = CriticalSlotMechanics.canPlaceEquipment(
        layout,
        location,
        slotIndex,
        state.equipment.find(e => e.id === selectedEquipmentId)?.equipmentId || ''
      );

      if (canPlace) {
        actions.assignEquipment(selectedEquipmentId, location, slotIndex);
        setSelectedEquipmentId(null); // Deselect after placement
      } else {
        alert("Cannot place item here: Slot occupied or insufficient space.");
      }
    } else {
      // If clicking an occupied slot with equipment, maybe select it to move?
      // For now, simple unassign on click if it's equipment
      const slot = layout[location].slots[slotIndex - 1];
      if (slot.equipmentInstanceId) {
        actions.unassignEquipment(slot.equipmentInstanceId);
      }
    }
  };

  // Filter unallocated equipment for selection list
  const unallocatedEquipment = state.equipment.filter(e => e.location === 'unallocated');

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* Assignment Area */}
      <section className="bg-gray-800 p-4 rounded-lg border border-gray-700">
        <h2 className="text-lg font-semibold mb-4 text-blue-300 border-b border-gray-700 pb-2">
          Critical Slots Assignment
        </h2>

        <div className="mb-4">
          <h3 className="text-xs uppercase text-gray-500 mb-2">Unallocated Equipment (Click to Place)</h3>
          {unallocatedEquipment.length === 0 ? (
            <div className="text-sm text-gray-500 italic">All items assigned</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {unallocatedEquipment.map(item => {
                const def = getWeaponById(item.equipmentId);
                if (!def) return null;
                const isSelected = selectedEquipmentId === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedEquipmentId(isSelected ? null : item.id)}
                    className={`px-3 py-2 rounded text-xs font-bold border ${
                      isSelected 
                        ? 'bg-blue-600 border-blue-400 text-white ring-2 ring-blue-300' 
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {def.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
          {LOCATION_ORDER.map(loc => {
            const locData: ILocationSlots = layout[loc];
            return (
              <div key={loc} className="bg-gray-900 p-2 rounded border border-gray-700 text-xs">
                <div className="font-bold text-gray-400 mb-1 text-center border-b border-gray-800 pb-1 uppercase">
                  {loc}
                </div>
                <div className="space-y-1">
                  {locData.slots.map(slot => (
                    <div 
                      key={slot.index}
                      onClick={() => handleSlotClick(loc, slot.index)}
                      className={`flex items-center gap-2 p-1 rounded cursor-pointer transition-colors ${
                        slot.isAllocated 
                          ? slot.isSystem 
                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                            : 'bg-blue-900/30 text-blue-200 border border-blue-800/50 hover:bg-red-900/30 hover:border-red-800/50' // Equipment (click to remove)
                          : selectedEquipmentId 
                            ? 'bg-gray-800/30 text-gray-600 hover:bg-green-900/30 hover:text-green-200 border border-transparent hover:border-green-700' // Empty & selecting
                            : 'bg-gray-800/30 text-gray-600 border border-transparent' // Empty & idle
                      }`}
                    >
                      <span className="text-gray-500 w-4 text-center font-mono">{slot.index}</span>
                      <span className={`truncate ${slot.isSystem ? 'text-gray-500 italic' : ''} ${slot.placeholder ? 'opacity-50' : ''}`}>
                        {slot.content || (selectedEquipmentId ? 'Open' : '-')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
