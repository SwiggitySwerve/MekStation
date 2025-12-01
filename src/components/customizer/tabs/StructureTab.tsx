/**
 * Structure Tab Component
 * 
 * Configuration of structural components (engine, gyro, structure, cockpit)
 * and movement settings. Uses movement-first design where Walk MP determines
 * engine rating.
 * 
 * @spec openspec/specs/customizer-tabs/spec.md
 * @spec openspec/specs/unit-store-architecture/spec.md
 */

import React, { useCallback, useMemo } from 'react';
import { useUnitStore } from '@/stores/useUnitStore';
import { useTechBaseSync } from '@/hooks/useTechBaseSync';
import { useUnitCalculations } from '@/hooks/useUnitCalculations';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import { CockpitType } from '@/types/construction/CockpitType';
import { 
  MovementEnhancementType, 
  getMovementEnhancementDefinition,
  MOVEMENT_ENHANCEMENT_DEFINITIONS 
} from '@/types/construction/MovementEnhancement';

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
 * Get valid Walk MP range for a given tonnage
 * Engine rating = tonnage × walkMP, must be 10-500
 */
function getWalkMPRange(tonnage: number): { min: number; max: number } {
  const minRating = 10;
  const maxRating = 500;
  
  const minWalk = Math.max(1, Math.ceil(minRating / tonnage));
  const maxWalk = Math.min(12, Math.floor(maxRating / tonnage));
  
  return { min: minWalk, max: maxWalk };
}

/**
 * Calculate Run MP from Walk MP (ceil of 1.5× walk)
 */
function calculateRunMP(walkMP: number): number {
  return Math.ceil(walkMP * 1.5);
}

/**
 * Get available enhancement options (MASC and TSM are mutually exclusive)
 */
function getEnhancementOptions(currentEnhancement: MovementEnhancementType | null): {
  value: MovementEnhancementType | null;
  label: string;
  disabled: boolean;
  tooltip?: string;
}[] {
  const mascDef = getMovementEnhancementDefinition(MovementEnhancementType.MASC);
  const tsmDef = getMovementEnhancementDefinition(MovementEnhancementType.TSM);
  
  return [
    { value: null, label: 'None', disabled: false },
    { 
      value: MovementEnhancementType.MASC, 
      label: 'MASC', 
      disabled: currentEnhancement === MovementEnhancementType.TSM,
      tooltip: currentEnhancement === MovementEnhancementType.TSM ? 'Mutually incompatible with TSM' : undefined,
    },
    { 
      value: MovementEnhancementType.TSM, 
      label: 'Triple Strength Myomer', 
      disabled: currentEnhancement === MovementEnhancementType.MASC,
      tooltip: currentEnhancement === MovementEnhancementType.MASC ? 'Mutually incompatible with MASC' : undefined,
    },
  ];
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
  // Get unit state from context
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
  const enhancement = useUnitStore((s) => s.enhancement);
  
  // Get actions from context
  const setEngineType = useUnitStore((s) => s.setEngineType);
  const setEngineRating = useUnitStore((s) => s.setEngineRating);
  const setGyroType = useUnitStore((s) => s.setGyroType);
  const setInternalStructureType = useUnitStore((s) => s.setInternalStructureType);
  const setCockpitType = useUnitStore((s) => s.setCockpitType);
  const setEnhancement = useUnitStore((s) => s.setEnhancement);
  
  // Get filtered options based on tech base
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
  
  // Movement calculations - Walk MP drives engine rating
  const walkMP = useMemo(() => Math.floor(engineRating / tonnage), [engineRating, tonnage]);
  const runMP = useMemo(() => calculateRunMP(walkMP), [walkMP]);
  const walkMPRange = useMemo(() => getWalkMPRange(tonnage), [tonnage]);
  
  // Enhancement options
  const enhancementOptions = useMemo(() => getEnhancementOptions(enhancement), [enhancement]);
  
  // Handlers - Components
  const handleEngineTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setEngineType(e.target.value as EngineType);
  }, [setEngineType]);
  
  const handleWalkMPChange = useCallback((newWalkMP: number) => {
    // Clamp to valid range
    const clampedWalk = Math.max(walkMPRange.min, Math.min(walkMPRange.max, newWalkMP));
    // Calculate and set engine rating
    const newRating = tonnage * clampedWalk;
    setEngineRating(newRating);
  }, [tonnage, walkMPRange, setEngineRating]);
  
  const handleGyroTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setGyroType(e.target.value as GyroType);
  }, [setGyroType]);
  
  const handleStructureTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setInternalStructureType(e.target.value as InternalStructureType);
  }, [setInternalStructureType]);
  
  const handleCockpitTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setCockpitType(e.target.value as CockpitType);
  }, [setCockpitType]);
  
  const handleEnhancementChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setEnhancement(value === '' ? null : value as MovementEnhancementType);
  }, [setEnhancement]);
  
  return (
    <div className={`space-y-4 p-4 ${className}`}>
      {/* Compact Structural Weight Summary - at top */}
      <div className="bg-slate-800/50 rounded-lg border border-slate-700 px-4 py-2">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Engine:</span>
              <span className="font-medium text-white">{calculations.engineWeight}t</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Gyro:</span>
              <span className="font-medium text-white">{calculations.gyroWeight}t</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Structure:</span>
              <span className="font-medium text-white">{calculations.structureWeight}t</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Cockpit:</span>
              <span className="font-medium text-white">{calculations.cockpitWeight}t</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Heat Sinks:</span>
              <span className="font-medium text-white">{calculations.heatSinkWeight}t</span>
            </div>
          </div>
          <div className="flex items-center gap-2 pl-4 border-l border-slate-600">
            <span className="text-sm text-slate-400">Total:</span>
            <span className="text-lg font-bold text-amber-400">{calculations.totalStructuralWeight}t</span>
          </div>
        </div>
      </div>

      {/* Two-column layout: Chassis | Movement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* LEFT: Chassis */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Chassis</h3>
          
          <div className="space-y-3">
            {/* Engine Type */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-sm text-slate-400">Engine</label>
                <span className="text-xs text-slate-500">{calculations.engineWeight}t / {calculations.engineSlots} slots</span>
              </div>
              <select 
                className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm"
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
            
            {/* Gyro */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-sm text-slate-400">Gyro</label>
                <span className="text-xs text-slate-500">{calculations.gyroWeight}t / {calculations.gyroSlots} slots</span>
              </div>
              <select 
                className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm"
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
            
            {/* Internal Structure */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-sm text-slate-400">Structure</label>
                <span className="text-xs text-slate-500">{calculations.structureWeight}t / {calculations.structureSlots} slots</span>
              </div>
              <select 
                className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm"
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
            
            {/* Cockpit */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-sm text-slate-400">Cockpit</label>
                <span className="text-xs text-slate-500">{calculations.cockpitWeight}t / {calculations.cockpitSlots} slots</span>
              </div>
              <select 
                className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm"
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
            
            {/* Enhancement */}
            <div className="space-y-1">
              <label className="text-sm text-slate-400">Enhancement</label>
              <select 
                className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                disabled={readOnly}
                value={enhancement ?? ''}
                onChange={handleEnhancementChange}
              >
                {enhancementOptions.map((opt) => (
                  <option 
                    key={opt.value ?? 'none'} 
                    value={opt.value ?? ''}
                    disabled={opt.disabled}
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
              {enhancement && (
                <p className="text-xs text-slate-500 mt-1">
                  {enhancement === MovementEnhancementType.MASC && 'Double running speed, risk of leg damage'}
                  {enhancement === MovementEnhancementType.TSM && '+2 Walk MP at 9+ heat, double physical damage'}
                </p>
              )}
            </div>
            
            {/* Engine Rating (derived info) */}
            <div className="pt-3 mt-1 border-t border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Engine Rating</span>
                <span className="text-sm font-medium text-amber-400">{engineRating}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Movement */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Movement</h3>
          
          <div className="space-y-3">
            {/* Column Headers */}
            <div className="grid grid-cols-[140px_80px_80px] gap-2 items-center">
              <span></span>
              <span className="text-xs text-slate-500 text-center uppercase">Base</span>
              <span className="text-xs text-slate-500 text-center uppercase">Final</span>
            </div>
            
            {/* Walk MP */}
            <div className="grid grid-cols-[140px_80px_80px] gap-2 items-center">
              <label className="text-sm text-slate-400">Walk MP</label>
              <div className="flex items-center justify-center">
                <button
                  onClick={() => handleWalkMPChange(walkMP - 1)}
                  disabled={readOnly || walkMP <= walkMPRange.min}
                  className="px-2 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-l border border-slate-600 text-white text-sm"
                >
                  −
                </button>
                <input
                  type="number"
                  value={walkMP}
                  onChange={(e) => handleWalkMPChange(parseInt(e.target.value, 10) || walkMPRange.min)}
                  disabled={readOnly}
                  min={walkMPRange.min}
                  max={walkMPRange.max}
                  className="w-12 px-1 py-1 bg-slate-700 border-y border-slate-600 text-white text-sm text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  onClick={() => handleWalkMPChange(walkMP + 1)}
                  disabled={readOnly || walkMP >= walkMPRange.max}
                  className="px-2 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-r border border-slate-600 text-white text-sm"
                >
                  +
                </button>
              </div>
              <span className="text-sm text-white text-center font-medium">{walkMP}</span>
            </div>
            
            {/* Run MP (calculated) */}
            <div className="grid grid-cols-[140px_80px_80px] gap-2 items-center">
              <label className="text-sm text-slate-400">Run MP</label>
              <span className="text-sm text-slate-500 text-center">{runMP}</span>
              <span className="text-sm text-white text-center font-medium">{runMP}</span>
            </div>
            
            {/* Jump/UMU MP */}
            <div className="grid grid-cols-[140px_80px_80px] gap-2 items-center">
              <label className="text-sm text-slate-400">Jump/UMU MP</label>
              <div className="flex items-center justify-center">
                <button
                  disabled={true}
                  className="px-2 py-1 bg-slate-700 opacity-50 cursor-not-allowed rounded-l border border-slate-600 text-white text-sm"
                >
                  −
                </button>
                <input
                  type="number"
                  value={0}
                  disabled={true}
                  className="w-12 px-1 py-1 bg-slate-700 border-y border-slate-600 text-white text-sm text-center opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  disabled={true}
                  className="px-2 py-1 bg-slate-700 opacity-50 cursor-not-allowed rounded-r border border-slate-600 text-white text-sm"
                >
                  +
                </button>
              </div>
              <span className="text-sm text-white text-center font-medium">0</span>
            </div>
            
            {/* Jump Type */}
            <div className="grid grid-cols-[140px_160px] gap-2 items-center">
              <label className="text-sm text-slate-400">Jump Type</label>
              <select 
                className="px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                disabled={true}
                value="jump_jet"
              >
                <option value="jump_jet">Jump Jet</option>
                <option value="improved_jump_jet">Improved Jump Jet</option>
                <option value="umu">UMU</option>
              </select>
            </div>
            
            {/* Mech. J. Booster MP (placeholder) */}
            <div className="grid grid-cols-[140px_80px_80px] gap-2 items-center">
              <label className="text-sm text-slate-400">Mech. J. Booster MP</label>
              <div className="flex items-center justify-center">
                <input
                  type="number"
                  value={0}
                  disabled={true}
                  className="w-16 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm text-center opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <span></span>
            </div>
            
            {/* Movement summary info */}
            <div className="pt-3 mt-3 border-t border-slate-700 text-xs text-slate-500">
              <p>Walk MP range: {walkMPRange.min}–{walkMPRange.max} (for {tonnage}t mech)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
