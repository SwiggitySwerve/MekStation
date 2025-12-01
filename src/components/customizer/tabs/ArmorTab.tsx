/**
 * Armor Tab Component
 * 
 * Configuration of armor type, tonnage, and per-location allocation.
 * Uses tonnage-first workflow where user sets armor tonnage, then
 * distributes available points to locations.
 * 
 * @spec openspec/specs/armor-system/spec.md
 * @spec openspec/specs/armor-diagram/spec.md
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useUnitStore } from '@/stores/useUnitStore';
import { useTechBaseSync } from '@/hooks/useTechBaseSync';
import { ArmorTypeEnum, getArmorDefinition } from '@/types/construction/ArmorType';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { ArmorDiagram, LocationArmorData } from '../armor/ArmorDiagram';
import { LocationArmorEditor } from '../armor/LocationArmorEditor';
import {
  calculateArmorPoints,
  getMaxArmorForLocation,
  getMaxTotalArmor,
  getArmorCriticalSlots,
} from '@/utils/construction/armorCalculations';
import { getTotalAllocatedArmor } from '@/stores/unitState';

// =============================================================================
// Types
// =============================================================================

interface ArmorTabProps {
  /** Read-only mode */
  readOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Armor configuration tab
 * 
 * Uses useUnitStore() to access the current unit's state.
 */
export function ArmorTab({
  readOnly = false,
  className = '',
}: ArmorTabProps) {
  // Get unit state from context
  const tonnage = useUnitStore((s) => s.tonnage);
  const componentTechBases = useUnitStore((s) => s.componentTechBases);
  const armorType = useUnitStore((s) => s.armorType);
  const armorTonnage = useUnitStore((s) => s.armorTonnage);
  const armorAllocation = useUnitStore((s) => s.armorAllocation);
  
  // Get actions from context
  const setArmorType = useUnitStore((s) => s.setArmorType);
  const setArmorTonnage = useUnitStore((s) => s.setArmorTonnage);
  const setLocationArmor = useUnitStore((s) => s.setLocationArmor);
  const autoAllocateArmor = useUnitStore((s) => s.autoAllocateArmor);
  const maximizeArmor = useUnitStore((s) => s.maximizeArmor);
  const clearAllArmor = useUnitStore((s) => s.clearAllArmor);
  
  // Get filtered armor options based on tech base
  const { filteredOptions } = useTechBaseSync(componentTechBases);
  
  // Selected location for editing
  const [selectedLocation, setSelectedLocation] = useState<MechLocation | null>(null);
  
  // Calculate derived values
  const armorDef = useMemo(() => getArmorDefinition(armorType), [armorType]);
  const pointsPerTon = armorDef?.pointsPerTon ?? 16;
  const availablePoints = useMemo(
    () => calculateArmorPoints(armorTonnage, armorType),
    [armorTonnage, armorType]
  );
  const allocatedPoints = useMemo(
    () => getTotalAllocatedArmor(armorAllocation),
    [armorAllocation]
  );
  const unallocatedPoints = availablePoints - allocatedPoints;
  const maxTotalArmor = useMemo(() => getMaxTotalArmor(tonnage), [tonnage]);
  const armorSlots = useMemo(() => getArmorCriticalSlots(armorType), [armorType]);
  
  // Convert allocation to diagram format
  const armorData: LocationArmorData[] = useMemo(() => [
    {
      location: MechLocation.HEAD,
      current: armorAllocation[MechLocation.HEAD],
      maximum: getMaxArmorForLocation(tonnage, MechLocation.HEAD),
    },
    {
      location: MechLocation.CENTER_TORSO,
      current: armorAllocation[MechLocation.CENTER_TORSO],
      maximum: getMaxArmorForLocation(tonnage, MechLocation.CENTER_TORSO),
      rear: armorAllocation.centerTorsoRear,
      rearMaximum: getMaxArmorForLocation(tonnage, MechLocation.CENTER_TORSO) - armorAllocation[MechLocation.CENTER_TORSO],
    },
    {
      location: MechLocation.LEFT_TORSO,
      current: armorAllocation[MechLocation.LEFT_TORSO],
      maximum: getMaxArmorForLocation(tonnage, MechLocation.LEFT_TORSO),
      rear: armorAllocation.leftTorsoRear,
      rearMaximum: getMaxArmorForLocation(tonnage, MechLocation.LEFT_TORSO) - armorAllocation[MechLocation.LEFT_TORSO],
    },
    {
      location: MechLocation.RIGHT_TORSO,
      current: armorAllocation[MechLocation.RIGHT_TORSO],
      maximum: getMaxArmorForLocation(tonnage, MechLocation.RIGHT_TORSO),
      rear: armorAllocation.rightTorsoRear,
      rearMaximum: getMaxArmorForLocation(tonnage, MechLocation.RIGHT_TORSO) - armorAllocation[MechLocation.RIGHT_TORSO],
    },
    {
      location: MechLocation.LEFT_ARM,
      current: armorAllocation[MechLocation.LEFT_ARM],
      maximum: getMaxArmorForLocation(tonnage, MechLocation.LEFT_ARM),
    },
    {
      location: MechLocation.RIGHT_ARM,
      current: armorAllocation[MechLocation.RIGHT_ARM],
      maximum: getMaxArmorForLocation(tonnage, MechLocation.RIGHT_ARM),
    },
    {
      location: MechLocation.LEFT_LEG,
      current: armorAllocation[MechLocation.LEFT_LEG],
      maximum: getMaxArmorForLocation(tonnage, MechLocation.LEFT_LEG),
    },
    {
      location: MechLocation.RIGHT_LEG,
      current: armorAllocation[MechLocation.RIGHT_LEG],
      maximum: getMaxArmorForLocation(tonnage, MechLocation.RIGHT_LEG),
    },
  ], [tonnage, armorAllocation]);
  
  // Get selected location data
  const selectedLocationData = useMemo(() => {
    if (!selectedLocation) return null;
    return armorData.find(d => d.location === selectedLocation) ?? null;
  }, [selectedLocation, armorData]);
  
  // Handlers
  const handleArmorTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setArmorType(e.target.value as ArmorTypeEnum);
  }, [setArmorType]);
  
  const handleArmorTonnageChange = useCallback((newTonnage: number) => {
    setArmorTonnage(Math.max(0, newTonnage));
  }, [setArmorTonnage]);
  
  const handleLocationClick = useCallback((location: MechLocation) => {
    setSelectedLocation(prev => prev === location ? null : location);
  }, []);
  
  const handleLocationArmorChange = useCallback((front: number, rear?: number) => {
    if (!selectedLocation) return;
    setLocationArmor(selectedLocation, front, rear);
  }, [selectedLocation, setLocationArmor]);
  
  const handleAutoAllocate = useCallback(() => {
    autoAllocateArmor();
  }, [autoAllocateArmor]);
  
  const handleMaximize = useCallback(() => {
    maximizeArmor();
  }, [maximizeArmor]);
  
  const handleClear = useCallback(() => {
    clearAllArmor();
  }, [clearAllArmor]);
  
  return (
    <div className={`space-y-4 p-4 ${className}`}>
      {/* Compact Summary Bar */}
      <div className="bg-slate-800/50 rounded-lg border border-slate-700 px-4 py-2">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Type:</span>
              <span className="font-medium text-white">{armorDef?.name ?? 'Standard'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Points/Ton:</span>
              <span className="font-medium text-white">{pointsPerTon}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Slots:</span>
              <span className="font-medium text-white">{armorSlots}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 pl-4 border-l border-slate-600">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">Tonnage:</span>
              <span className="text-lg font-bold text-amber-400">{armorTonnage}t</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">Points:</span>
              <span className={`text-lg font-bold ${unallocatedPoints < 0 ? 'text-red-400' : 'text-green-400'}`}>
                {allocatedPoints} / {availablePoints}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* LEFT: Armor Configuration */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Armor Configuration</h3>
          
          <div className="space-y-4">
            {/* Armor Type */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-sm text-slate-400">Armor Type</label>
                <span className="text-xs text-slate-500">{armorSlots} slots</span>
              </div>
              <select 
                className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                disabled={readOnly}
                value={armorType}
                onChange={handleArmorTypeChange}
              >
                {filteredOptions.armors.map((armor) => (
                  <option key={armor.type} value={armor.type}>
                    {armor.name} ({armor.pointsPerTon} pts/ton)
                  </option>
                ))}
              </select>
            </div>
            
            {/* Armor Tonnage */}
            <div className="space-y-1">
              <label className="text-sm text-slate-400">Armor Tonnage</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleArmorTonnageChange(armorTonnage - 0.5)}
                  disabled={readOnly || armorTonnage <= 0}
                  className="px-2 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded border border-slate-600 text-white text-sm"
                >
                  −
                </button>
                <input
                  type="number"
                  value={armorTonnage}
                  onChange={(e) => handleArmorTonnageChange(parseFloat(e.target.value) || 0)}
                  disabled={readOnly}
                  min={0}
                  step={0.5}
                  className="w-20 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  onClick={() => handleArmorTonnageChange(armorTonnage + 0.5)}
                  disabled={readOnly}
                  className="px-2 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded border border-slate-600 text-white text-sm"
                >
                  +
                </button>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleMaximize}
                disabled={readOnly}
                className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white text-sm font-medium transition-colors"
              >
                Maximize Tonnage
              </button>
              <button
                onClick={handleClear}
                disabled={readOnly}
                className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white text-sm font-medium transition-colors"
              >
                Clear
              </button>
            </div>
            
            {/* Summary Stats */}
            <div className="pt-3 mt-1 border-t border-slate-700 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Available Points</span>
                <span className="font-medium text-white">{availablePoints}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Allocated Points</span>
                <span className="font-medium text-white">{allocatedPoints}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Unallocated Points</span>
                <span className={`font-medium ${unallocatedPoints < 0 ? 'text-red-400' : unallocatedPoints > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                  {unallocatedPoints}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-600">
                <span className="text-slate-400">Maximum Possible</span>
                <span className="font-medium text-slate-300">{maxTotalArmor}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Armor Allocation */}
        <div className="space-y-4">
          {/* Armor Diagram */}
          <ArmorDiagram
            armorData={armorData}
            selectedLocation={selectedLocation}
            unallocatedPoints={unallocatedPoints}
            onLocationClick={handleLocationClick}
            onAutoAllocate={handleAutoAllocate}
          />
          
          {/* Location Editor */}
          {selectedLocation && selectedLocationData && (
            <LocationArmorEditor
              location={selectedLocation}
              data={selectedLocationData}
              tonnage={tonnage}
              readOnly={readOnly}
              onChange={handleLocationArmorChange}
              onClose={() => setSelectedLocation(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

