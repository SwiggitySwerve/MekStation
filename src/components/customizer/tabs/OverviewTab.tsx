/**
 * Overview Tab Component
 * 
 * Summary view of the current unit configuration.
 * Note: UnitInfoBanner is now rendered in the parent customizer page
 * to be persistent across all tabs.
 * 
 * Tech base configuration state is stored in the multi-unit store
 * to persist across tab navigation and browser sessions.
 * 
 * @spec openspec/changes/add-customizer-ui-components/specs/customizer-tabs/spec.md
 */

import React, { useCallback, useMemo } from 'react';
import { TechBase } from '@/types/enums/TechBase';
import { TechBaseConfiguration, IComponentValues } from '../shared/TechBaseConfiguration';
import { TechBaseMode, TechBaseComponent } from '@/types/construction/TechBaseConfiguration';
import { useMultiUnitStore } from '@/stores/useMultiUnitStore';
import { getEngineDefinition } from '@/types/construction/EngineType';
import { getGyroDefinition } from '@/types/construction/GyroType';
import { getInternalStructureDefinition } from '@/types/construction/InternalStructureType';
import { getCockpitDefinition } from '@/types/construction/CockpitType';
import { getHeatSinkDefinition } from '@/types/construction/HeatSinkType';
import { getArmorDefinition } from '@/types/construction/ArmorType';

interface OverviewTabProps {
  /** Tab ID for accessing store state */
  tabId: string;
  /** Unit name */
  unitName: string;
  /** Unit tonnage */
  tonnage: number;
  /** Walk MP */
  walkMP?: number;
  /** Engine rating (tonnage × walkMP) */
  engineRating?: number;
  /** Read-only mode */
  readOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Overview tab showing unit summary
 */
export function OverviewTab({
  tabId,
  unitName,
  tonnage,
  walkMP = 4,
  engineRating,
  readOnly = false,
  className = '',
}: OverviewTabProps) {
  // Calculate derived values
  const calculatedEngineRating = engineRating ?? tonnage * walkMP;

  // Get tech base configuration from store (persisted state)
  const tab = useMultiUnitStore((state) => 
    state.tabs.find((t) => t.id === tabId)
  );
  
  // Get store actions
  const updateTechBaseMode = useMultiUnitStore((state) => state.updateTechBaseMode);
  const updateComponentTechBase = useMultiUnitStore((state) => state.updateComponentTechBase);

  // Handler for global mode change
  const handleModeChange = useCallback((newMode: TechBaseMode) => {
    updateTechBaseMode(tabId, newMode);
  }, [tabId, updateTechBaseMode]);

  // Handler for individual component change
  const handleComponentChange = useCallback((component: TechBaseComponent, newTechBase: TechBase) => {
    updateComponentTechBase(tabId, component, newTechBase);
  }, [tabId, updateComponentTechBase]);

  // Build component values based on actual store selections
  const componentValues: IComponentValues = useMemo(() => {
    const selections = tab?.componentSelections;
    if (!selections) {
      return {
        chassis: 'Standard',
        gyro: 'Standard',
        engine: `Standard Fusion ${calculatedEngineRating}`,
        heatsink: '10 Single',
        targeting: 'None',
        myomer: 'Standard',
        movement: 'None',
        armor: 'Standard',
      };
    }
    
    const engineDef = getEngineDefinition(selections.engineType);
    const gyroDef = getGyroDefinition(selections.gyroType);
    const structureDef = getInternalStructureDefinition(selections.internalStructureType);
    const cockpitDef = getCockpitDefinition(selections.cockpitType);
    const heatSinkDef = getHeatSinkDefinition(selections.heatSinkType);
    const armorDef = getArmorDefinition(selections.armorType);
    
    return {
      chassis: structureDef?.name ?? 'Standard',
      gyro: gyroDef?.name ?? 'Standard',
      engine: `${engineDef?.name ?? 'Standard Fusion'} ${selections.engineRating}`,
      heatsink: `${selections.heatSinkCount} ${heatSinkDef?.name ?? 'Single'}`,
      targeting: 'None', // Targeting computer not yet implemented
      myomer: 'Standard', // Myomer not yet implemented
      movement: 'None', // Movement equipment not yet implemented
      armor: armorDef?.name ?? 'Standard',
    };
  }, [tab?.componentSelections, calculatedEngineRating]);

  // If tab not found, show error state
  if (!tab) {
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
      {/* Configuration Panel */}
      <TechBaseConfiguration
        mode={tab.techBaseMode}
        components={tab.componentTechBases}
        componentValues={componentValues}
        onModeChange={handleModeChange}
        onComponentChange={handleComponentChange}
        readOnly={readOnly}
      />

      {/* Equipment Summary */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Equipment Summary</h3>
        <div className="text-center py-8 text-slate-400">
          <p>No equipment mounted</p>
          <p className="text-sm mt-2">Add weapons and equipment from the Equipment tab</p>
        </div>
      </div>

      {readOnly && (
        <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 text-blue-300 text-sm">
          This unit is in read-only mode. Changes cannot be made.
        </div>
      )}
    </div>
  );
}
