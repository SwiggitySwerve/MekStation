/**
 * Structure Tab Component
 * 
 * Configuration of structural components (engine, gyro, structure, cockpit).
 * Uses store for persistence and tech base filtering for available options.
 * 
 * @spec openspec/changes/add-customizer-ui-components/specs/customizer-tabs/spec.md
 * @spec openspec/changes/add-customizer-ui-components/specs/component-configuration/spec.md
 */

import React, { useCallback, useMemo } from 'react';
import { useMultiUnitStore } from '@/stores/useMultiUnitStore';
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
  /** Tab ID for accessing store state */
  tabId: string;
  /** Unit tonnage */
  tonnage: number;
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
  // Walk MP 1-12 gives engine ratings from tonnage*1 to tonnage*12
  // But cap at 500 (max engine rating)
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
 */
export function StructureTab({
  tabId,
  tonnage,
  readOnly = false,
  className = '',
}: StructureTabProps) {
  // Get tab data from store
  const tab = useMultiUnitStore((state) => state.tabs.find((t) => t.id === tabId));
  
  // Get store actions
  const updateEngineType = useMultiUnitStore((state) => state.updateEngineType);
  const updateEngineRating = useMultiUnitStore((state) => state.updateEngineRating);
  const updateGyroType = useMultiUnitStore((state) => state.updateGyroType);
  const updateStructureType = useMultiUnitStore((state) => state.updateStructureType);
  const updateCockpitType = useMultiUnitStore((state) => state.updateCockpitType);
  
  // Get filtered options based on tech base
  const componentTechBases = tab?.componentTechBases;
  const { filteredOptions } = useTechBaseSync(componentTechBases ?? {
    chassis: tab?.techBase ?? 'Inner Sphere',
    gyro: tab?.techBase ?? 'Inner Sphere',
    engine: tab?.techBase ?? 'Inner Sphere',
    heatsink: tab?.techBase ?? 'Inner Sphere',
    targeting: tab?.techBase ?? 'Inner Sphere',
    myomer: tab?.techBase ?? 'Inner Sphere',
    movement: tab?.techBase ?? 'Inner Sphere',
    armor: tab?.techBase ?? 'Inner Sphere',
  } as any);
  
  // Get current selections
  const selections = tab?.componentSelections;
  
  // Calculate weights and slots
  const calculations = useUnitCalculations(
    tonnage,
    selections ?? {
      engineType: EngineType.STANDARD,
      engineRating: tonnage * 4,
      gyroType: GyroType.STANDARD,
      internalStructureType: InternalStructureType.STANDARD,
      cockpitType: CockpitType.STANDARD,
      heatSinkType: 'Single' as any,
      heatSinkCount: 10,
      armorType: 'Standard' as any,
    }
  );
  
  // Generate engine rating options
  const engineRatings = useMemo(() => generateEngineRatings(tonnage), [tonnage]);
  
  // Handlers
  const handleEngineTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    updateEngineType(tabId, e.target.value as EngineType);
  }, [tabId, updateEngineType]);
  
  const handleEngineRatingChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    updateEngineRating(tabId, parseInt(e.target.value, 10));
  }, [tabId, updateEngineRating]);
  
  const handleGyroTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    updateGyroType(tabId, e.target.value as GyroType);
  }, [tabId, updateGyroType]);
  
  const handleStructureTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    updateStructureType(tabId, e.target.value as InternalStructureType);
  }, [tabId, updateStructureType]);
  
  const handleCockpitTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    updateCockpitType(tabId, e.target.value as CockpitType);
  }, [tabId, updateCockpitType]);
  
  // If tab not found, show error
  if (!tab || !selections) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300">
          Error: Unit tab not found
        </div>
      </div>
    );
  }
  
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
                value={selections.engineType}
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
                value={selections.engineRating}
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
                value={selections.gyroType}
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
                value={selections.internalStructureType}
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
                value={selections.cockpitType}
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
