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
} from '@/types/construction/MovementEnhancement';
import { JumpJetType, getMaxJumpMP, JUMP_JET_DEFINITIONS, calculateEnhancedMaxRunMP } from '@/utils/construction/movementCalculations';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';
import { customizerStyles as cs } from '../styles';

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

interface StructureTabProps {
  /** Read-only mode */
  readOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/** Maximum engine rating per BattleTech TechManual */
const MAX_ENGINE_RATING = 400;
const MIN_ENGINE_RATING = 10;

/**
 * Get valid Walk MP range for a given tonnage
 * Engine rating = tonnage × walkMP, must be 10-400
 */
function getWalkMPRange(tonnage: number): { min: number; max: number } {
  const minWalk = Math.max(1, Math.ceil(MIN_ENGINE_RATING / tonnage));
  const maxWalk = Math.min(12, Math.floor(MAX_ENGINE_RATING / tonnage));
  
  return { min: minWalk, max: maxWalk };
}

/**
 * Calculate Run MP from Walk MP (ceil of 1.5× walk)
 */
function calculateRunMP(walkMP: number): number {
  return Math.ceil(walkMP * 1.5);
}

/**
 * Get available enhancement options
 * Note: MASC and TSM are mutually exclusive but we don't disable options
 * since selecting one simply replaces the other.
 */
function getEnhancementOptions(): {
  value: MovementEnhancementType | null;
  label: string;
}[] {
  return [
    { value: null, label: 'None' },
    { value: MovementEnhancementType.MASC, label: 'MASC' },
    { value: MovementEnhancementType.TSM, label: 'Triple Strength Myomer' },
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
}: StructureTabProps): React.ReactElement {
  // Get unit state from context
  const tonnage = useUnitStore((s) => s.tonnage);
  const configuration = useUnitStore((s) => s.configuration);
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
  const setTonnage = useUnitStore((s) => s.setTonnage);
  const setConfiguration = useUnitStore((s) => s.setConfiguration);
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
  
  // Engine rating limit warnings
  const isAtMaxEngineRating = engineRating >= MAX_ENGINE_RATING;
  
  // Calculate max run MP with enhancement active
  const maxRunMP = useMemo(() => {
    if (!enhancement) return undefined;
    return calculateEnhancedMaxRunMP(walkMP, enhancement);
  }, [enhancement, walkMP]);
  
  // Jump jet calculations
  const maxJumpMP = useMemo(() => getMaxJumpMP(walkMP, jumpJetType), [walkMP, jumpJetType]);
  
  // Enhancement options
  const enhancementOptions = useMemo(() => getEnhancementOptions(), []);
  
  // Handlers - Tonnage and Configuration
  const handleTonnageChange = useCallback((newTonnage: number) => {
    const clamped = Math.max(TONNAGE_RANGE.min, Math.min(TONNAGE_RANGE.max, newTonnage));
    const rounded = Math.round(clamped / TONNAGE_RANGE.step) * TONNAGE_RANGE.step;
    setTonnage(rounded);
  }, [setTonnage]);
  
  const handleConfigurationChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setConfiguration(e.target.value as MechConfiguration);
  }, [setConfiguration]);
  
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
            {/* Tonnage */}
            <div className={cs.layout.field}>
              <label className={cs.text.label}>Tonnage</label>
              <div className={cs.layout.rowGap}>
                <button
                  onClick={() => handleTonnageChange(tonnage - TONNAGE_RANGE.step)}
                  disabled={readOnly || tonnage <= TONNAGE_RANGE.min}
                  className={cs.button.stepperMd}
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
                  className={`w-20 ${cs.input.base} text-center ${cs.input.noSpinners}`}
                />
                <button
                  onClick={() => handleTonnageChange(tonnage + TONNAGE_RANGE.step)}
                  disabled={readOnly || tonnage >= TONNAGE_RANGE.max}
                  className={cs.button.stepperMd}
                >
                  +
                </button>
              </div>
            </div>
            
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
                <span className={`text-sm ${isAtMaxEngineRating ? 'text-amber-400 font-bold' : cs.text.valueHighlight}`}>
                  {engineRating}{isAtMaxEngineRating && ' (MAX)'}
                </span>
              </div>
              {isAtMaxEngineRating && (
                <p className="text-xs text-amber-400 mt-1">
                  ⚠️ Maximum engine rating of {MAX_ENGINE_RATING} reached. Cannot increase Walk MP further.
                </p>
              )}
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
            <div className="grid grid-cols-[140px_112px_1fr] gap-2 items-center">
              <span></span>
              <span className={`${cs.text.secondary} text-center uppercase`}>Base</span>
              <span className={`${cs.text.secondary} text-center uppercase`}>Final</span>
            </div>
            
            {/* Walk MP */}
            <div className="grid grid-cols-[140px_112px_1fr] gap-2 items-center">
              <label className={cs.text.label}>Walk MP</label>
              <div className="flex items-center justify-center">
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
            
            {/* Run MP (calculated) - no stepper, just centered value */}
            <div className="grid grid-cols-[140px_112px_1fr] gap-2 items-center">
              <label className={cs.text.label}>Run MP</label>
              <span className={`text-sm ${cs.text.value} text-center`}>{runMP}</span>
              <div className="flex items-center justify-center gap-1">
                <span className={`text-sm ${cs.text.value}`}>{runMP}</span>
                {maxRunMP && (
                  <span 
                    className="text-sm font-bold text-white cursor-help"
                    title={
                      enhancement === MovementEnhancementType.MASC 
                        ? `MASC Sprint: Walk ${walkMP} × 2 = ${maxRunMP}`
                        : enhancement === MovementEnhancementType.TSM
                        ? `TSM at 9+ heat: Base Run ${runMP} + 1 = ${maxRunMP} (net +1 from +2 Walk, -1 heat penalty)`
                        : enhancement === MovementEnhancementType.SUPERCHARGER
                        ? `Supercharger Sprint: Walk ${walkMP} × 2 = ${maxRunMP}`
                        : `Enhanced max: ${maxRunMP}`
                    }
                  >
                    [{maxRunMP}]
                  </span>
                )}
              </div>
            </div>
            
            {/* Jump/UMU MP */}
            <div className="grid grid-cols-[140px_112px_1fr] gap-2 items-center">
              <label className={cs.text.label}>Jump MP</label>
              <div className="flex items-center justify-center">
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
            <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
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
            </div>
            
            {/* Mech. J. Booster MP (placeholder) */}
            <div className="grid grid-cols-[140px_112px_1fr] gap-2 items-center">
              <label className={cs.text.label}>Mech. J. Booster MP</label>
              <div className="flex items-center justify-center">
                <input
                  type="number"
                  value={0}
                  disabled={true}
                  className={`w-12 ${cs.input.compact} text-center opacity-50 ${cs.input.noSpinners}`}
                />
              </div>
              <span></span>
            </div>
            
            {/* Movement summary info */}
            <div className={`${cs.layout.divider} mt-3`}>
              <p className={cs.text.secondary}>
                Walk MP range: {walkMPRange.min}–{walkMPRange.max} (for {tonnage}t mech, max engine {MAX_ENGINE_RATING})
              </p>
              <p className={cs.text.secondary}>Max Jump MP: {maxJumpMP} ({jumpJetType === JumpJetType.IMPROVED ? 'run speed' : 'walk speed'})</p>
              {jumpMP > 0 && (
                <p className={cs.text.secondary}>Jump Jets: {calculations.jumpJetWeight}t / {calculations.jumpJetSlots} slots</p>
              )}
            </div>
            
            {/* Enhancement Subsection */}
            <div className={`${cs.layout.divider} mt-2`}>
              <h4 className="text-sm font-semibold text-slate-300 mb-3">Enhancement</h4>
              <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
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
                    >
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              {enhancement && (
                <p className={`${cs.text.secondary} mt-2`}>
                  {enhancement === MovementEnhancementType.MASC && 'Sprint = Walk × 2 when activated. Risk of leg damage on failed roll.'}
                  {enhancement === MovementEnhancementType.TSM && (
                    <>
                      Activates at 9+ heat: +2 Walk MP, but -1 from heat penalty = net +1 MP.
                      <br />
                      <span className="text-amber-400">Doubles physical attack damage.</span>
                    </>
                  )}
                </p>
              )}
            </div>
            
            {/* Motive Type (Configuration) */}
            <div className={`${cs.layout.divider} mt-2`}>
              <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                <label className={cs.text.label}>Motive Type</label>
                <select 
                  className={cs.select.inline}
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
        </div>
      </div>
    </div>
  );
}
