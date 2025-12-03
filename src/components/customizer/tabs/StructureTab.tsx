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
import { JumpJetType, getMaxJumpMP, JUMP_JET_DEFINITIONS, calculateEnhancedMaxRunMP } from '@/utils/construction/movementCalculations';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { customizerStyles as cs } from '../styles';

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
  const armorTonnage = useUnitStore((s) => s.armorTonnage);
  const enhancement = useUnitStore((s) => s.enhancement);
  const jumpMP = useUnitStore((s) => s.jumpMP);
  const jumpJetType = useUnitStore((s) => s.jumpJetType);
  
  // Get actions from context
  const setEngineType = useUnitStore((s) => s.setEngineType);
  const setEngineRating = useUnitStore((s) => s.setEngineRating);
  const setGyroType = useUnitStore((s) => s.setGyroType);
  const setInternalStructureType = useUnitStore((s) => s.setInternalStructureType);
  const setCockpitType = useUnitStore((s) => s.setCockpitType);
  const setHeatSinkType = useUnitStore((s) => s.setHeatSinkType);
  const setHeatSinkCount = useUnitStore((s) => s.setHeatSinkCount);
  const setEnhancement = useUnitStore((s) => s.setEnhancement);
  const setJumpMP = useUnitStore((s) => s.setJumpMP);
  const setJumpJetType = useUnitStore((s) => s.setJumpJetType);
  
  // Get filtered options based on tech base
  const { filteredOptions } = useTechBaseSync(componentTechBases);
  
  // Calculate weights and slots (weight is based on armorTonnage, not allocated points)
  const calculations = useUnitCalculations(
    tonnage,
    {
      engineType,
      engineRating,
      gyroType,
      internalStructureType,
      cockpitType,
      heatSinkType,
      heatSinkCount,
      armorType,
      jumpMP,
      jumpJetType,
    },
    armorTonnage
  );
  
  // Movement calculations - Walk MP drives engine rating
  const walkMP = useMemo(() => Math.floor(engineRating / tonnage), [engineRating, tonnage]);
  const runMP = useMemo(() => calculateRunMP(walkMP), [walkMP]);
  const walkMPRange = useMemo(() => getWalkMPRange(tonnage), [tonnage]);
  
  // Calculate max run MP with enhancement active
  const maxRunMP = useMemo(() => {
    if (!enhancement) return undefined;
    return calculateEnhancedMaxRunMP(walkMP, enhancement);
  }, [enhancement, walkMP]);
  
  // Jump jet calculations
  const maxJumpMP = useMemo(() => getMaxJumpMP(walkMP, jumpJetType), [walkMP, jumpJetType]);
  
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
  
  const handleJumpMPChange = useCallback((newJumpMP: number) => {
    // Clamp to valid range (0 to max)
    const clampedJump = Math.max(0, Math.min(maxJumpMP, newJumpMP));
    setJumpMP(clampedJump);
  }, [maxJumpMP, setJumpMP]);
  
  const handleJumpJetTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setJumpJetType(e.target.value as JumpJetType);
  }, [setJumpJetType]);
  
  // Heat sink handlers
  const handleHeatSinkTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setHeatSinkType(e.target.value as HeatSinkType);
  }, [setHeatSinkType]);
  
  const handleHeatSinkCountChange = useCallback((newCount: number) => {
    // Minimum 10 heat sinks, no explicit maximum (limited by tonnage/slots)
    const clampedCount = Math.max(10, newCount);
    setHeatSinkCount(clampedCount);
  }, [setHeatSinkCount]);
  
  return (
    <div className={`${cs.layout.tabContent} ${className}`}>
      {/* Compact Structural Weight Summary - at top */}
      <div className={cs.panel.summary}>
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-6 text-sm">
            <div className={cs.layout.statRow}>
              <span className={cs.text.label}>Engine:</span>
              <span className={cs.text.value}>{calculations.engineWeight}t</span>
            </div>
            <div className={cs.layout.statRow}>
              <span className={cs.text.label}>Gyro:</span>
              <span className={cs.text.value}>{calculations.gyroWeight}t</span>
            </div>
            <div className={cs.layout.statRow}>
              <span className={cs.text.label}>Structure:</span>
              <span className={cs.text.value}>{calculations.structureWeight}t</span>
            </div>
            <div className={cs.layout.statRow}>
              <span className={cs.text.label}>Cockpit:</span>
              <span className={cs.text.value}>{calculations.cockpitWeight}t</span>
            </div>
            <div className={cs.layout.statRow}>
              <span className={cs.text.label}>Heat Sinks:</span>
              <span className={cs.text.value}>{calculations.heatSinkWeight}t</span>
            </div>
            {calculations.jumpJetWeight > 0 && (
              <div className={cs.layout.statRow}>
                <span className={cs.text.label}>Jump Jets:</span>
                <span className={cs.text.value}>{calculations.jumpJetWeight}t</span>
              </div>
            )}
          </div>
          <div className={`${cs.layout.statRow} ${cs.layout.dividerV}`}>
            <span className={`text-sm ${cs.text.label}`}>Total:</span>
            <span className="text-lg font-bold text-amber-400">{calculations.totalStructuralWeight}t</span>
          </div>
        </div>
      </div>

      {/* Two-column layout: Chassis | Movement */}
      <div className={cs.layout.twoColumn}>
        
        {/* LEFT: Chassis */}
        <div className={cs.panel.main}>
          <h3 className={cs.text.sectionTitle}>Chassis</h3>
          
          <div className={cs.layout.formStack}>
            {/* Engine Type */}
            <div className={cs.layout.field}>
              <div className={cs.layout.rowBetween}>
                <label className={cs.text.label}>Engine</label>
                <span className={cs.text.secondary}>{calculations.engineWeight}t / {calculations.engineSlots} slots</span>
              </div>
              <select 
                className={cs.select.compact}
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
            <div className={cs.layout.field}>
              <div className={cs.layout.rowBetween}>
                <label className={cs.text.label}>Gyro</label>
                <span className={cs.text.secondary}>{calculations.gyroWeight}t / {calculations.gyroSlots} slots</span>
              </div>
              <select 
                className={cs.select.compact}
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
            <div className={cs.layout.field}>
              <div className={cs.layout.rowBetween}>
                <label className={cs.text.label}>Structure</label>
                <span className={cs.text.secondary}>{calculations.structureWeight}t / {calculations.structureSlots} slots</span>
              </div>
              <select 
                className={cs.select.compact}
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
            <div className={cs.layout.field}>
              <div className={cs.layout.rowBetween}>
                <label className={cs.text.label}>Cockpit</label>
                <span className={cs.text.secondary}>{calculations.cockpitWeight}t / {calculations.cockpitSlots} slots</span>
              </div>
              <select 
                className={cs.select.compact}
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
            
            {/* Engine Rating (derived info) */}
            <div className={cs.layout.divider}>
              <div className={cs.layout.rowBetween}>
                <span className={`text-sm ${cs.text.label}`}>Engine Rating</span>
                <span className={`text-sm ${cs.text.valueHighlight}`}>{engineRating}</span>
              </div>
            </div>
            
            {/* Heat Sinks Subsection */}
            <div className={`${cs.layout.divider} mt-2`}>
              <div className={cs.layout.rowBetween}>
                <h4 className="text-sm font-semibold text-slate-300">Heat Sinks</h4>
                <span className={cs.text.secondary}>
                  {calculations.heatSinkWeight}t / {calculations.heatSinkSlots} slots
                </span>
              </div>
              
              {/* Type + Count on same line */}
              <div className="flex items-center gap-3 mt-2">
                <select 
                  className={`${cs.select.compact} flex-1`}
                  disabled={readOnly}
                  value={heatSinkType}
                  onChange={handleHeatSinkTypeChange}
                >
                  {filteredOptions.heatSinks.map((hs) => (
                    <option key={hs.type} value={hs.type}>
                      {hs.name}
                    </option>
                  ))}
                </select>
                <div className="flex items-center">
                  <button
                    onClick={() => handleHeatSinkCountChange(heatSinkCount - 1)}
                    disabled={readOnly || heatSinkCount <= 10}
                    className={cs.button.stepperLeft}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={heatSinkCount}
                    onChange={(e) => handleHeatSinkCountChange(parseInt(e.target.value, 10) || 10)}
                    disabled={readOnly}
                    min={10}
                    className={`w-12 ${cs.input.number} border-y ${cs.input.noSpinners}`}
                  />
                  <button
                    onClick={() => handleHeatSinkCountChange(heatSinkCount + 1)}
                    disabled={readOnly}
                    className={cs.button.stepperRight}
                  >
                    +
                  </button>
                </div>
              </div>
              
              {/* Heat Sink Summary */}
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-900/50 rounded p-2">
                  <div className={`text-lg font-bold ${cs.text.valuePositive}`}>{calculations.integralHeatSinks}</div>
                  <div className="text-[10px] text-slate-500">Free</div>
                </div>
                <div className="bg-slate-900/50 rounded p-2">
                  <div className={`text-lg font-bold ${calculations.externalHeatSinks > 0 ? cs.text.valueWarning : cs.text.value}`}>
                    {calculations.externalHeatSinks}
                  </div>
                  <div className="text-[10px] text-slate-500">External</div>
                </div>
                <div className="bg-slate-900/50 rounded p-2">
                  <div className={`text-lg font-bold ${cs.text.valueHighlight}`}>{calculations.totalHeatDissipation}</div>
                  <div className="text-[10px] text-slate-500">Dissipation</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Movement */}
        <div className={cs.panel.main}>
          <h3 className={cs.text.sectionTitle}>Movement</h3>
          
          <div className={cs.layout.formStack}>
            {/* Column Headers */}
            <div className="grid grid-cols-[140px_1fr_50px] gap-2 items-center">
              <span></span>
              <span className={`${cs.text.secondary} uppercase`}>Base</span>
              <span className={`${cs.text.secondary} text-center uppercase`}>Final</span>
            </div>
            
            {/* Walk MP */}
            <div className="grid grid-cols-[140px_1fr_50px] gap-2 items-center">
              <label className={cs.text.label}>Walk MP</label>
              <div className="flex items-center">
                <button
                  onClick={() => handleWalkMPChange(walkMP - 1)}
                  disabled={readOnly || walkMP <= walkMPRange.min}
                  className={cs.button.stepperLeft}
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
                  className={`w-12 ${cs.input.number} border-y ${cs.input.noSpinners}`}
                />
                <button
                  onClick={() => handleWalkMPChange(walkMP + 1)}
                  disabled={readOnly || walkMP >= walkMPRange.max}
                  className={cs.button.stepperRight}
                >
                  +
                </button>
              </div>
              <span className={`text-sm ${cs.text.value} text-center`}>{walkMP}</span>
            </div>
            
            {/* Run MP (calculated) */}
            <div className="grid grid-cols-[140px_1fr_50px] gap-2 items-center">
              <label className={cs.text.label}>Run MP</label>
              <span className={`text-sm ${cs.text.secondary}`}>{runMP}</span>
              <div className="flex items-center justify-center gap-1">
                <span className={`text-sm ${cs.text.value}`}>{runMP}</span>
                {maxRunMP && (
                  <span className="text-sm font-bold text-white">[{maxRunMP}]</span>
                )}
              </div>
            </div>
            
            {/* Jump/UMU MP */}
            <div className="grid grid-cols-[140px_1fr_50px] gap-2 items-center">
              <label className={cs.text.label}>Jump MP</label>
              <div className="flex items-center">
                <button
                  onClick={() => handleJumpMPChange(jumpMP - 1)}
                  disabled={readOnly || jumpMP <= 0}
                  className={cs.button.stepperLeft}
                >
                  −
                </button>
                <input
                  type="number"
                  value={jumpMP}
                  onChange={(e) => handleJumpMPChange(parseInt(e.target.value, 10) || 0)}
                  disabled={readOnly}
                  min={0}
                  max={maxJumpMP}
                  className={`w-12 ${cs.input.number} border-y ${cs.input.noSpinners}`}
                />
                <button
                  onClick={() => handleJumpMPChange(jumpMP + 1)}
                  disabled={readOnly || jumpMP >= maxJumpMP}
                  className={cs.button.stepperRight}
                >
                  +
                </button>
              </div>
              <span className={`text-sm ${cs.text.value} text-center`}>{jumpMP}</span>
            </div>
            
            {/* Jump Type */}
            <div className="grid grid-cols-[140px_1fr_50px] gap-2 items-center">
              <label className={cs.text.label}>Jump Type</label>
              <select 
                className={cs.select.inline}
                disabled={readOnly}
                value={jumpJetType}
                onChange={handleJumpJetTypeChange}
              >
                {JUMP_JET_DEFINITIONS.filter(def => def.type !== JumpJetType.MECHANICAL).map((def) => (
                  <option key={def.type} value={def.type}>
                    {def.name}
                  </option>
                ))}
              </select>
              <span></span>
            </div>
            
            {/* Mech. J. Booster MP (placeholder) */}
            <div className="grid grid-cols-[140px_1fr_50px] gap-2 items-center">
              <label className={cs.text.label}>Mech. J. Booster MP</label>
              <input
                type="number"
                value={0}
                disabled={true}
                className={`w-16 ${cs.input.compact} opacity-50 ${cs.input.noSpinners}`}
              />
              <span></span>
            </div>
            
            {/* Movement summary info */}
            <div className={`${cs.layout.divider} mt-3`}>
              <p className={cs.text.secondary}>Walk MP range: {walkMPRange.min}–{walkMPRange.max} (for {tonnage}t mech)</p>
              <p className={cs.text.secondary}>Max Jump MP: {maxJumpMP} ({jumpJetType === JumpJetType.IMPROVED ? 'run speed' : 'walk speed'})</p>
              {jumpMP > 0 && (
                <p className={cs.text.secondary}>Jump Jets: {calculations.jumpJetWeight}t / {calculations.jumpJetSlots} slots</p>
              )}
            </div>
            
            {/* Enhancement Subsection */}
            <div className={`${cs.layout.divider} mt-2`}>
              <h4 className="text-sm font-semibold text-slate-300 mb-3">Enhancement</h4>
              <div className="grid grid-cols-[140px_1fr_50px] gap-2 items-center">
                <label className={cs.text.label}>Type</label>
                <select 
                  className={cs.select.inline}
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
                <span></span>
              </div>
              {enhancement && (
                <p className={`${cs.text.secondary} mt-2`}>
                  {enhancement === MovementEnhancementType.MASC && 'Double running speed, risk of leg damage'}
                  {enhancement === MovementEnhancementType.TSM && '+2 Walk MP at 9+ heat, double physical damage'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
