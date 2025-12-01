/**
 * Structure Tab Component
 * 
 * Configuration of structural components (engine, gyro, structure, cockpit).
 * Uses the contextual unit store - no tabId prop needed.
 * 
 * @spec openspec/changes/add-customizer-ui-components/specs/customizer-tabs/spec.md
 * @spec openspec/changes/add-customizer-ui-components/specs/unit-store-architecture/spec.md
 */

import React, { useCallback, useMemo } from 'react';
import { useUnitStore } from '@/stores/useUnitStore';
import { useTechBaseSync } from '@/hooks/useTechBaseSync';
import { useUnitCalculations } from '@/hooks/useUnitCalculations';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import { CockpitType } from '@/types/construction/CockpitType';

// =============================================================================
// Types
// =============================================================================

interface StructureTabProps {
  /** Read-only mode */
  readOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate engine rating options based on tonnage
 */
function generateEngineRatings(tonnage: number): number[] {
  const ratings: number[] = [];
  for (let walkMP = 1; walkMP <= 12; walkMP++) {
    const rating = tonnage * walkMP;
    if (rating >= 10 && rating <= 500 && rating % 5 === 0) {
      ratings.push(rating);
    }
  }
  return ratings;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Structure configuration tab
 * 
 * Uses useUnitStore() to access the current unit's state.
 * No tabId prop needed - context provides the active unit.
 */
export function StructureTab({
  readOnly = false,
  className = '',
}: StructureTabProps) {
  // Get unit state from context (no tabId needed!)
  const tonnage = useUnitStore((s) => s.tonnage);
  const componentTechBases = useUnitStore((s) => s.componentTechBases);
  const engineType = useUnitStore((s) => s.engineType);
  const engineRating = useUnitStore((s) => s.engineRating);
  const gyroType = useUnitStore((s) => s.gyroType);
  const internalStructureType = useUnitStore((s) => s.internalStructureType);
  const cockpitType = useUnitStore((s) => s.cockpitType);
  const heatSinkType = useUnitStore((s) => s.heatSinkType);
  const heatSinkCount = useUnitStore((s) => s.heatSinkCount);
  const armorType = useUnitStore((s) => s.armorType);
  
  // Get actions from context
  const setEngineType = useUnitStore((s) => s.setEngineType);
  const setEngineRating = useUnitStore((s) => s.setEngineRating);
  const setGyroType = useUnitStore((s) => s.setGyroType);
  const setInternalStructureType = useUnitStore((s) => s.setInternalStructureType);
  const setCockpitType = useUnitStore((s) => s.setCockpitType);
  
  // Get filtered options based on tech base
  // Note: Component selection sync is handled in the store when tech base changes
  const { filteredOptions } = useTechBaseSync(componentTechBases);
  
  // Calculate weights and slots
  const calculations = useUnitCalculations(tonnage, {
    engineType,
    engineRating,
    gyroType,
    internalStructureType,
    cockpitType,
    heatSinkType,
    heatSinkCount,
    armorType,
  });
  
  // Generate engine rating options
  const engineRatings = useMemo(() => generateEngineRatings(tonnage), [tonnage]);
  
  // Handlers - no tabId needed!
  const handleEngineTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setEngineType(e.target.value as EngineType);
  }, [setEngineType]);
  
  const handleEngineRatingChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setEngineRating(parseInt(e.target.value, 10));
  }, [setEngineRating]);
  
  const handleGyroTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setGyroType(e.target.value as GyroType);
  }, [setGyroType]);
  
  const handleStructureTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setInternalStructureType(e.target.value as InternalStructureType);
  }, [setInternalStructureType]);
  
  const handleCockpitTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setCockpitType(e.target.value as CockpitType);
  }, [setCockpitType]);
  
  return (
    <div className={`space-y-6 p-4 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Engine Configuration */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Engine</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Engine Type</label>
              <select 
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                disabled={readOnly}
                value={engineType}
                onChange={handleEngineTypeChange}
              >
                {filteredOptions.engines.map((engine) => (
                  <option key={engine.type} value={engine.type}>
                    {engine.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-slate-400 mb-1">Engine Rating</label>
              <select 
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                disabled={readOnly}
                value={engineRating}
                onChange={handleEngineRatingChange}
              >
                {engineRatings.map((rating) => (
                  <option key={rating} value={rating}>
                    {rating} (Walk {Math.floor(rating / tonnage)})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="pt-2 border-t border-slate-700">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Weight:</span>
                <span className="text-white">{calculations.engineWeight} tons</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Walk MP:</span>
                <span className="text-white">{calculations.walkMP}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Critical Slots:</span>
                <span className="text-white">{calculations.engineSlots}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Gyro Configuration */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Gyro</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Gyro Type</label>
              <select 
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                disabled={readOnly}
                value={gyroType}
                onChange={handleGyroTypeChange}
              >
                {filteredOptions.gyros.map((gyro) => (
                  <option key={gyro.type} value={gyro.type}>
                    {gyro.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="pt-2 border-t border-slate-700">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Weight:</span>
                <span className="text-white">{calculations.gyroWeight} tons</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Critical Slots:</span>
                <span className="text-white">{calculations.gyroSlots}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Structure Configuration */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Internal Structure</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Structure Type</label>
              <select 
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                disabled={readOnly}
                value={internalStructureType}
                onChange={handleStructureTypeChange}
              >
                {filteredOptions.structures.map((structure) => (
                  <option key={structure.type} value={structure.type}>
                    {structure.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="pt-2 border-t border-slate-700">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Weight:</span>
                <span className="text-white">{calculations.structureWeight} tons</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Critical Slots:</span>
                <span className="text-white">{calculations.structureSlots}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Cockpit Configuration */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Cockpit</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Cockpit Type</label>
              <select 
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                disabled={readOnly}
                value={cockpitType}
                onChange={handleCockpitTypeChange}
              >
                {filteredOptions.cockpits.map((cockpit) => (
                  <option key={cockpit.type} value={cockpit.type}>
                    {cockpit.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="pt-2 border-t border-slate-700">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Weight:</span>
                <span className="text-white">{calculations.cockpitWeight} tons</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Critical Slots:</span>
                <span className="text-white">{calculations.cockpitSlots}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Weight Summary */}
      <div className="bg-slate-900 rounded-lg border border-slate-700 p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Structural Weight Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-white">{calculations.engineWeight}t</div>
            <div className="text-xs text-slate-400">Engine</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{calculations.gyroWeight}t</div>
            <div className="text-xs text-slate-400">Gyro</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{calculations.structureWeight}t</div>
            <div className="text-xs text-slate-400">Structure</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{calculations.cockpitWeight}t</div>
            <div className="text-xs text-slate-400">Cockpit</div>
          </div>
          <div className="border-l border-slate-700 pl-4">
            <div className="text-2xl font-bold text-amber-400">
              {calculations.totalStructuralWeight}t
            </div>
            <div className="text-xs text-slate-400">Total</div>
          </div>
        </div>
      </div>
    </div>
  );
}
