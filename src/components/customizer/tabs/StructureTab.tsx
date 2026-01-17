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

import React, { useCallback } from 'react';
import { useUnitStore } from '@/stores/useUnitStore';
import { useTechBaseSync } from '@/hooks/useTechBaseSync';
import { useUnitCalculations } from '@/hooks/useUnitCalculations';
import {
  useMovementCalculations,
  getEnhancementOptions,
  MAX_ENGINE_RATING,
} from '@/hooks/useMovementCalculations';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import { CockpitType } from '@/types/construction/CockpitType';
import { MovementEnhancementType } from '@/types/construction/MovementEnhancement';
import { JumpJetType, JUMP_JET_DEFINITIONS } from '@/utils/construction/movementCalculations';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';
import { customizerStyles as cs } from '../styles';
import { BATTLEMECH_TONNAGE } from '@/services/construction/constructionConstants';

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

  // OmniMech-specific state
  const isOmni = useUnitStore((s) => s.isOmni);
  const baseChassisHeatSinks = useUnitStore((s) => s.baseChassisHeatSinks);
  
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
  const setBaseChassisHeatSinks = useUnitStore((s) => s.setBaseChassisHeatSinks);
  
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
  
  // Movement calculations - extracted to useMovementCalculations hook
  const {
    walkMP,
    runMP,
    walkMPRange,
    maxJumpMP,
    maxRunMP,
    isAtMaxEngineRating,
    getEngineRatingForWalkMP,
    clampWalkMP,
    clampJumpMP,
  } = useMovementCalculations({
    tonnage,
    engineRating,
    jumpMP,
    jumpJetType,
    enhancement,
  });

  // Enhancement options (static data from hook module)
  const enhancementOptions = getEnhancementOptions();
  
  // Handlers - Tonnage and Configuration
  const handleTonnageChange = useCallback((newTonnage: number) => {
    const clamped = Math.max(BATTLEMECH_TONNAGE.min, Math.min(BATTLEMECH_TONNAGE.max, newTonnage));
    const rounded = Math.round(clamped / BATTLEMECH_TONNAGE.step) * BATTLEMECH_TONNAGE.step;
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
    const clampedWalk = clampWalkMP(newWalkMP);
    const newRating = getEngineRatingForWalkMP(clampedWalk);
    setEngineRating(newRating);
  }, [clampWalkMP, getEngineRatingForWalkMP, setEngineRating]);
  
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
    const clampedJump = clampJumpMP(newJumpMP);
    setJumpMP(clampedJump);
  }, [clampJumpMP, setJumpMP]);
  
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

  const handleBaseChassisHeatSinksChange = useCallback((newCount: number) => {
    // Base chassis heat sinks: minimum 1, maximum is heatSinkCount
    // -1 means "use engine integral capacity" (default)
    const clampedCount = Math.max(-1, Math.min(heatSinkCount, newCount));
    setBaseChassisHeatSinks(clampedCount);
  }, [setBaseChassisHeatSinks, heatSinkCount]);
  
  return (
    <div className={`${cs.layout.tabContent} ${className}`}>
      {/* Compact Structural Weight Summary - at top, scrollable on mobile */}
      <div className={cs.panel.summary}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-6">
          <div className="flex items-center gap-3 sm:gap-6 text-sm overflow-x-auto pb-1 sm:pb-0">
            <div className={`${cs.layout.statRow} flex-shrink-0`}>
              <span className={cs.text.label}>Engine:</span>
              <span className={cs.text.value}>{calculations.engineWeight}t</span>
            </div>
            <div className={`${cs.layout.statRow} flex-shrink-0`}>
              <span className={cs.text.label}>Gyro:</span>
              <span className={cs.text.value}>{calculations.gyroWeight}t</span>
            </div>
            <div className={`${cs.layout.statRow} flex-shrink-0`}>
              <span className={cs.text.label}>Structure:</span>
              <span className={cs.text.value}>{calculations.structureWeight}t</span>
            </div>
            <div className={`${cs.layout.statRow} flex-shrink-0`}>
              <span className={cs.text.label}>Cockpit:</span>
              <span className={cs.text.value}>{calculations.cockpitWeight}t</span>
            </div>
            <div className={`${cs.layout.statRow} flex-shrink-0`}>
              <span className={cs.text.label}>Heat Sinks:</span>
              <span className={cs.text.value}>{calculations.heatSinkWeight}t</span>
            </div>
            {calculations.jumpJetWeight > 0 && (
              <div className={`${cs.layout.statRow} flex-shrink-0`}>
                <span className={cs.text.label}>Jump Jets:</span>
                <span className={cs.text.value}>{calculations.jumpJetWeight}t</span>
              </div>
            )}
          </div>
          <div className={`${cs.layout.statRow} sm:${cs.layout.dividerV} pt-2 sm:pt-0 border-t sm:border-t-0 border-border-theme-subtle`}>
            <span className={`text-sm ${cs.text.label}`}>Total:</span>
            <span className="text-lg font-bold text-accent">{calculations.totalStructuralWeight}t</span>
          </div>
        </div>
      </div>

      {/* Two-column layout: Chassis | Movement - uses lg breakpoint for sidebar-adjacent context */}
      <div className={cs.layout.twoColumnSidebar}>
        
        {/* LEFT: Chassis */}
        <div className={cs.panel.main}>
          <h3 className={cs.text.sectionTitle}>Chassis</h3>
          
          <div className={cs.layout.formStack}>
            {/* Tonnage */}
            <div className={cs.layout.field}>
              <label className={cs.text.label}>Tonnage</label>
              <div className={cs.layout.rowGap}>
                <button
                  onClick={() => handleTonnageChange(tonnage - BATTLEMECH_TONNAGE.step)}
                  disabled={readOnly || tonnage <= BATTLEMECH_TONNAGE.min}
                  className={cs.button.stepperMd}
                >
                  −
                </button>
                <input
                  type="number"
                  value={tonnage}
                  onChange={(e) => handleTonnageChange(parseInt(e.target.value, 10) || BATTLEMECH_TONNAGE.min)}
                  disabled={readOnly}
                  min={BATTLEMECH_TONNAGE.min}
                  max={BATTLEMECH_TONNAGE.max}
                  step={BATTLEMECH_TONNAGE.step}
                  className={`w-20 ${cs.input.base} text-center ${cs.input.noSpinners}`}
                />
                <button
                  onClick={() => handleTonnageChange(tonnage + BATTLEMECH_TONNAGE.step)}
                  disabled={readOnly || tonnage >= BATTLEMECH_TONNAGE.max}
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
                <span className={`text-sm ${isAtMaxEngineRating ? 'text-accent font-bold' : cs.text.valueHighlight}`}>
                  {engineRating}{isAtMaxEngineRating && ' (MAX)'}
                </span>
              </div>
              {isAtMaxEngineRating && (
                <p className="text-xs text-accent mt-1">
                  Warning: Maximum engine rating of {MAX_ENGINE_RATING} reached. Cannot increase Walk MP further.
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
                <div className="bg-surface-deep/50 rounded p-2">
                  <div className={`text-lg font-bold ${cs.text.valuePositive}`}>{calculations.integralHeatSinks}</div>
                  <div className="text-[10px] text-text-theme-muted">Free</div>
                </div>
                <div className="bg-surface-deep/50 rounded p-2">
                  <div className={`text-lg font-bold ${calculations.externalHeatSinks > 0 ? cs.text.valueWarning : cs.text.value}`}>
                    {calculations.externalHeatSinks}
                  </div>
                  <div className="text-[10px] text-text-theme-muted">External</div>
                </div>
                <div className="bg-surface-deep/50 rounded p-2">
                  <div className={`text-lg font-bold ${cs.text.valueHighlight}`}>{calculations.totalHeatDissipation}</div>
                  <div className="text-[10px] text-text-theme-muted">Dissipation</div>
                </div>
              </div>

              {/* Base Chassis Heat Sinks (OmniMech only) */}
              {isOmni && (
                <div className="mt-3 pt-3 border-t border-border-theme-subtle">
                  <div className={cs.layout.rowBetween}>
                    <label className={cs.text.label}>Base Chassis Heat Sinks</label>
                    <span className={cs.text.secondary}>
                      {baseChassisHeatSinks === -1 ? 'Auto' : `${baseChassisHeatSinks} fixed`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => handleBaseChassisHeatSinksChange(-1)}
                      disabled={readOnly}
                      className={`px-2 py-1 text-xs rounded ${
                        baseChassisHeatSinks === -1
                          ? 'bg-accent text-white'
                          : 'bg-surface-deep text-text-theme-muted hover:bg-surface-hover'
                      }`}
                    >
                      Auto
                    </button>
                    <div className="flex items-center flex-1">
                      <button
                        onClick={() => handleBaseChassisHeatSinksChange((baseChassisHeatSinks === -1 ? calculations.integralHeatSinks : baseChassisHeatSinks) - 1)}
                        disabled={readOnly || baseChassisHeatSinks <= 1}
                        className={cs.button.stepperLeft}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={baseChassisHeatSinks === -1 ? calculations.integralHeatSinks : baseChassisHeatSinks}
                        onChange={(e) => handleBaseChassisHeatSinksChange(parseInt(e.target.value, 10) || 10)}
                        disabled={readOnly}
                        min={1}
                        max={heatSinkCount}
                        className={`w-12 ${cs.input.number} border-y ${cs.input.noSpinners}`}
                      />
                      <button
                        onClick={() => handleBaseChassisHeatSinksChange((baseChassisHeatSinks === -1 ? calculations.integralHeatSinks : baseChassisHeatSinks) + 1)}
                        disabled={readOnly || (baseChassisHeatSinks !== -1 && baseChassisHeatSinks >= heatSinkCount)}
                        className={cs.button.stepperRight}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-text-theme-muted mt-1">
                    Heat sinks permanently fixed to the base chassis (cannot be pod-mounted)
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Movement */}
        <div className={cs.panel.main}>
          <h3 className={cs.text.sectionTitle}>Movement</h3>
          
          <div className={cs.layout.formStack}>
            {/* Column Headers */}
            <div className="grid grid-cols-[80px_1fr_60px] sm:grid-cols-[140px_112px_1fr] gap-2 items-center">
              <span></span>
              <span className={`${cs.text.secondary} text-center uppercase text-xs sm:text-sm`}>Base</span>
              <span className={`${cs.text.secondary} text-center uppercase text-xs sm:text-sm`}>Final</span>
            </div>
            
            {/* Walk MP */}
            <div className="grid grid-cols-[80px_1fr_60px] sm:grid-cols-[140px_112px_1fr] gap-2 items-center">
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
            <div className="grid grid-cols-[80px_1fr_60px] sm:grid-cols-[140px_112px_1fr] gap-2 items-center">
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
            <div className="grid grid-cols-[80px_1fr_60px] sm:grid-cols-[140px_112px_1fr] gap-2 items-center">
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
            <div className="grid grid-cols-[80px_1fr] sm:grid-cols-[140px_1fr] gap-2 items-center">
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
            <div className="grid grid-cols-[80px_1fr_60px] sm:grid-cols-[140px_112px_1fr] gap-2 items-center">
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
              <div className="grid grid-cols-[80px_1fr] sm:grid-cols-[140px_1fr] gap-2 items-center">
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
                      <span className="text-accent">Doubles physical attack damage.</span>
                    </>
                  )}
                </p>
              )}
            </div>
            
            {/* Motive Type (Configuration) */}
            <div className={`${cs.layout.divider} mt-2`}>
              <div className="grid grid-cols-[80px_1fr] sm:grid-cols-[140px_1fr] gap-2 items-center">
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
