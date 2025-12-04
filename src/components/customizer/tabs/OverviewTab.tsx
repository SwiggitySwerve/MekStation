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
import { RulesLevel, ALL_RULES_LEVELS } from '@/types/enums/RulesLevel';
import { TechBaseConfiguration, IComponentValues } from '../shared/TechBaseConfiguration';
import { TechBaseMode, TechBaseComponent } from '@/types/construction/TechBaseConfiguration';
import { useUnitStore } from '@/stores/useUnitStore';
import { useTabManagerStore } from '@/stores/useTabManagerStore';
import { getEngineDefinition } from '@/types/construction/EngineType';
import { getGyroDefinition } from '@/types/construction/GyroType';
import { getInternalStructureDefinition } from '@/types/construction/InternalStructureType';
import { getHeatSinkDefinition } from '@/types/construction/HeatSinkType';
import { getArmorDefinition } from '@/types/construction/ArmorType';
import { getMovementEnhancementDefinition, MovementEnhancementType } from '@/types/construction/MovementEnhancement';
import { customizerStyles as cs } from '../styles';

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
}: OverviewTabProps): React.ReactElement {
  // Get unit state from context (no tabId needed!)
  const unitId = useUnitStore((s) => s.id);
  const chassis = useUnitStore((s) => s.chassis);
  const clanName = useUnitStore((s) => s.clanName);
  const model = useUnitStore((s) => s.model);
  const mulId = useUnitStore((s) => s.mulId);
  const year = useUnitStore((s) => s.year);
  const rulesLevel = useUnitStore((s) => s.rulesLevel);
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
  const enhancement = useUnitStore((s) => s.enhancement);
  
  // Get actions from context
  const setChassis = useUnitStore((s) => s.setChassis);
  const setClanName = useUnitStore((s) => s.setClanName);
  const setModel = useUnitStore((s) => s.setModel);
  const setMulId = useUnitStore((s) => s.setMulId);
  const setYear = useUnitStore((s) => s.setYear);
  const setRulesLevel = useUnitStore((s) => s.setRulesLevel);
  const setTechBaseMode = useUnitStore((s) => s.setTechBaseMode);
  const setComponentTechBase = useUnitStore((s) => s.setComponentTechBase);
  
  // Get tab manager action
  const renameTab = useTabManagerStore((s) => s.renameTab);
  
  // Helper to update tab name when chassis/model changes
  const updateTabName = useCallback((newChassis: string, newModel: string) => {
    const newName = `${newChassis}${newModel ? ' ' + newModel : ''}`;
    renameTab(unitId, newName);
  }, [unitId, renameTab]);
  
  // Handlers - Basic info (MegaMekLab format)
  const handleChassisChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newChassis = e.target.value;
    setChassis(newChassis);
    updateTabName(newChassis, model);
  }, [setChassis, model, updateTabName]);
  
  const handleClanNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setClanName(e.target.value);
  }, [setClanName]);
  
  const handleModelChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newModel = e.target.value;
    setModel(newModel);
    updateTabName(chassis, newModel);
  }, [setModel, chassis, updateTabName]);
  
  const handleMulIdChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow numbers and hyphens only, store as string (-1 for custom units)
    const value = e.target.value.replace(/[^0-9-]/g, '');
    setMulId(value === '' ? '-1' : value);
  }, [setMulId]);
  
  const handleYearChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value > 0) {
      setYear(value);
    }
  }, [setYear]);
  
  const handleRulesLevelChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setRulesLevel(e.target.value as RulesLevel);
  }, [setRulesLevel]);

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
    const heatSinkDef = getHeatSinkDefinition(heatSinkType);
    const armorDef = getArmorDefinition(armorType);
    
    // Get myomer display name based on enhancement
    let myomerName = 'Standard';
    if (enhancement === MovementEnhancementType.TSM) {
      myomerName = 'Triple-Strength Myomer';
    } else if (enhancement) {
      // For MASC/Supercharger, myomer is still standard but movement enhancement is active
      myomerName = 'Standard';
    }
    
    // Get movement enhancement display (MASC, Supercharger, Partial Wing)
    let movementName = 'None';
    if (enhancement && enhancement !== MovementEnhancementType.TSM) {
      const enhancementDef = getMovementEnhancementDefinition(enhancement);
      movementName = enhancementDef?.name ?? enhancement;
    }
    
    return {
      chassis: structureDef?.name ?? 'Standard',
      gyro: gyroDef?.name ?? 'Standard',
      engine: `${engineDef?.name ?? 'Standard Fusion'} ${engineRating}`,
      heatsink: `${heatSinkCount} ${heatSinkDef?.name ?? 'Single'}`,
      targeting: 'None',
      myomer: myomerName,
      movement: movementName,
      armor: armorDef?.name ?? 'Standard',
    };
  }, [engineType, engineRating, gyroType, internalStructureType, cockpitType, heatSinkType, heatSinkCount, armorType, enhancement]);

  return (
    <div className={`space-y-6 p-4 ${className}`}>
      {/* Basic Info Panel */}
      <div className={cs.panel.main}>
        <h3 className={cs.text.sectionTitle}>Basic Information</h3>
        
        <div className={cs.layout.formStack}>
          {/* Chassis */}
          <div className={cs.layout.field}>
            <label className={cs.text.label}>Chassis</label>
            <input
              type="text"
              value={chassis}
              onChange={handleChassisChange}
              disabled={readOnly}
              className={cs.input.full}
              placeholder="e.g., Atlas, Timber Wolf"
            />
          </div>
          
          {/* Clan Name (optional) */}
          <div className={cs.layout.field}>
            <label className={cs.text.label}>Clan Name <span className={cs.text.secondary}>(optional)</span></label>
            <input
              type="text"
              value={clanName}
              onChange={handleClanNameChange}
              disabled={readOnly}
              className={cs.input.full}
              placeholder="e.g., Mad Cat for Timber Wolf"
            />
          </div>
          
          {/* Model */}
          <div className={cs.layout.field}>
            <label className={cs.text.label}>Model</label>
            <input
              type="text"
              value={model}
              onChange={handleModelChange}
              disabled={readOnly}
              className={cs.input.full}
              placeholder="e.g., AS7-D, Prime"
            />
          </div>
          
          {/* MUL ID, Year, Tech Level - split row */}
          <div className={cs.layout.threeColumn}>
            {/* MUL ID */}
            <div className={cs.layout.field}>
              <label className={cs.text.label}>MUL ID</label>
              <input
                type="text"
                value={mulId}
                onChange={handleMulIdChange}
                disabled={readOnly}
                className={cs.input.full}
                placeholder="-1"
              />
            </div>
            
            {/* Year */}
            <div className={cs.layout.field}>
              <label className={cs.text.label}>Year</label>
              <input
                type="number"
                value={year}
                onChange={handleYearChange}
                disabled={readOnly}
                min={2000}
                max={3200}
                className={`${cs.input.full} ${cs.input.noSpinners}`}
              />
            </div>
            
            {/* Tech Level */}
            <div className={cs.layout.field}>
              <label className={cs.text.label}>Tech Level</label>
              <select
                value={rulesLevel}
                onChange={handleRulesLevelChange}
                disabled={readOnly}
                className={cs.select.full}
              >
                {ALL_RULES_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
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
      <div className={cs.panel.main}>
        <h3 className={cs.text.sectionTitle}>Equipment Summary</h3>
        <div className={cs.panel.empty}>
          <p>No equipment mounted</p>
          <p className="text-sm mt-2">Add weapons and equipment from the Equipment tab</p>
        </div>
      </div>

      {readOnly && (
        <div className={cs.panel.notice}>
          This unit is in read-only mode. Changes cannot be made.
        </div>
      )}
    </div>
  );
}
