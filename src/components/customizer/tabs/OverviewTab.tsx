/**
 * Overview Tab Component
 * 
 * Summary view of the current unit configuration.
 * Uses the contextual unit store - no tabId prop needed.
 * 
 * @spec openspec/specs/customizer-tabs/spec.md
 * @spec openspec/specs/unit-store-architecture/spec.md
 */

import React, { useCallback, useMemo } from 'react';
import { TechBase } from '@/types/enums/TechBase';
import { TechBaseConfiguration, IComponentValues } from '../shared/TechBaseConfiguration';
import { TechBaseMode, TechBaseComponent, IComponentTechBases } from '@/types/construction/TechBaseConfiguration';
import { useUnitStore } from '@/stores/useUnitStore';
import { getEngineDefinition } from '@/types/construction/EngineType';
import { getGyroDefinition } from '@/types/construction/GyroType';
import { getInternalStructureDefinition } from '@/types/construction/InternalStructureType';
import { getCockpitDefinition } from '@/types/construction/CockpitType';
import { getHeatSinkDefinition } from '@/types/construction/HeatSinkType';
import { getArmorDefinition } from '@/types/construction/ArmorType';
import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';

// =============================================================================
// Constants
// =============================================================================

const TONNAGE_RANGE = { min: 20, max: 100, step: 5 };

const CONFIGURATION_OPTIONS: { value: MechConfiguration; label: string }[] = [
  { value: MechConfiguration.BIPED, label: 'Biped' },
  { value: MechConfiguration.QUAD, label: 'Quad' },
  { value: MechConfiguration.TRIPOD, label: 'Tripod' },
  { value: MechConfiguration.LAM, label: 'LAM' },
  { value: MechConfiguration.QUADVEE, label: 'QuadVee' },
];

// =============================================================================
// Types
// =============================================================================

interface OverviewTabProps {
  /** Read-only mode */
  readOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Overview tab showing unit summary
 * 
 * Uses useUnitStore() to access the current unit's state.
 * No tabId prop needed - context provides the active unit.
 */
export function OverviewTab({
  readOnly = false,
  className = '',
}: OverviewTabProps) {
  // Get unit state from context (no tabId needed!)
  const name = useUnitStore((s) => s.name);
  const tonnage = useUnitStore((s) => s.tonnage);
  const configuration = useUnitStore((s) => s.configuration);
  const techBaseMode = useUnitStore((s) => s.techBaseMode);
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
  const setName = useUnitStore((s) => s.setName);
  const setTonnage = useUnitStore((s) => s.setTonnage);
  const setConfiguration = useUnitStore((s) => s.setConfiguration);
  const setTechBaseMode = useUnitStore((s) => s.setTechBaseMode);
  const setComponentTechBase = useUnitStore((s) => s.setComponentTechBase);
  
  // Handlers - Basic info
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  }, [setName]);
  
  const handleTonnageChange = useCallback((newTonnage: number) => {
    const clamped = Math.max(TONNAGE_RANGE.min, Math.min(TONNAGE_RANGE.max, newTonnage));
    const rounded = Math.round(clamped / TONNAGE_RANGE.step) * TONNAGE_RANGE.step;
    setTonnage(rounded);
  }, [setTonnage]);
  
  const handleConfigurationChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setConfiguration(e.target.value as MechConfiguration);
  }, [setConfiguration]);

  // Handler for global mode change
  const handleModeChange = useCallback((newMode: TechBaseMode) => {
    setTechBaseMode(newMode);
  }, [setTechBaseMode]);

  // Handler for individual component change
  const handleComponentChange = useCallback((component: TechBaseComponent, newTechBase: TechBase) => {
    setComponentTechBase(component, newTechBase);
  }, [setComponentTechBase]);

  // Build component values based on actual store selections
  const componentValues: IComponentValues = useMemo(() => {
    const engineDef = getEngineDefinition(engineType);
    const gyroDef = getGyroDefinition(gyroType);
    const structureDef = getInternalStructureDefinition(internalStructureType);
    const cockpitDef = getCockpitDefinition(cockpitType);
    const heatSinkDef = getHeatSinkDefinition(heatSinkType);
    const armorDef = getArmorDefinition(armorType);
    
    return {
      chassis: structureDef?.name ?? 'Standard',
      gyro: gyroDef?.name ?? 'Standard',
      engine: `${engineDef?.name ?? 'Standard Fusion'} ${engineRating}`,
      heatsink: `${heatSinkCount} ${heatSinkDef?.name ?? 'Single'}`,
      targeting: 'None',
      myomer: 'Standard',
      movement: 'None',
      armor: armorDef?.name ?? 'Standard',
    };
  }, [engineType, engineRating, gyroType, internalStructureType, cockpitType, heatSinkType, heatSinkCount, armorType]);

  return (
    <div className={`space-y-6 p-4 ${className}`}>
      {/* Basic Info Panel */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Basic Info</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Name */}
          <div className="space-y-1">
            <label className="text-sm text-slate-400">Name</label>
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              disabled={readOnly}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="Unit name..."
            />
          </div>
          
          {/* Tonnage */}
          <div className="space-y-1">
            <label className="text-sm text-slate-400">Tonnage</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleTonnageChange(tonnage - TONNAGE_RANGE.step)}
                disabled={readOnly || tonnage <= TONNAGE_RANGE.min}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded border border-slate-600 text-white text-sm"
              >
                −
              </button>
              <input
                type="number"
                value={tonnage}
                onChange={(e) => handleTonnageChange(parseInt(e.target.value, 10) || TONNAGE_RANGE.min)}
                disabled={readOnly}
                min={TONNAGE_RANGE.min}
                max={TONNAGE_RANGE.max}
                step={TONNAGE_RANGE.step}
                className="w-20 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                onClick={() => handleTonnageChange(tonnage + TONNAGE_RANGE.step)}
                disabled={readOnly || tonnage >= TONNAGE_RANGE.max}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded border border-slate-600 text-white text-sm"
              >
                +
              </button>
            </div>
          </div>
          
          {/* Motive Type */}
          <div className="space-y-1">
            <label className="text-sm text-slate-400">Motive Type</label>
            <select 
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
              disabled={readOnly}
              value={configuration}
              onChange={handleConfigurationChange}
            >
              {CONFIGURATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tech Base Configuration Panel */}
      <TechBaseConfiguration
        mode={techBaseMode}
        components={componentTechBases}
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
