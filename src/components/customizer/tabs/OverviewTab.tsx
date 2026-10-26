/**
 * Overview Tab Component
 *
 * Summary view of the current unit configuration.
 * Uses the contextual unit store - no tabId prop needed.
 *
 * @spec openspec/specs/customizer-tabs/spec.md
 * @spec openspec/specs/unit-store-architecture/spec.md
 */

import React, { useCallback, useMemo, useState } from 'react';

import { AppIcon } from '@/components/ui/AppIcon';
import { useTabManagerStore } from '@/stores/useTabManagerStore';
import { useUnitStore } from '@/stores/useUnitStore';
import { getArmorDefinition } from '@/types/construction/ArmorType';
import { getEngineDefinition } from '@/types/construction/EngineType';
import { getGyroDefinition } from '@/types/construction/GyroType';
import { getHeatSinkDefinition } from '@/types/construction/HeatSinkType';
import { getInternalStructureDefinition } from '@/types/construction/InternalStructureType';
import {
  getMovementEnhancementDefinition,
  MovementEnhancementType,
} from '@/types/construction/MovementEnhancement';
import {
  TechBaseMode,
  TechBaseComponent,
  TECH_BASE_MODE_LABELS,
} from '@/types/construction/TechBaseConfiguration';
import { RulesLevel, ALL_RULES_LEVELS } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { hasAssignedCriticalSlots } from '@/utils/construction/slotOperations/placement';

import {
  TechBaseConfiguration,
  IComponentValues,
} from '../shared/TechBaseConfiguration';
import { customizerStyles as cs } from '../styles';
import { OverviewOmniControls } from './OverviewTab.omni';

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
  const equipment = useUnitStore((s) => s.equipment);
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
  const updateTabName = useCallback(
    (newChassis: string, newModel: string) => {
      const newName = `${newChassis}${newModel ? ' ' + newModel : ''}`;
      renameTab(unitId, newName);
    },
    [unitId, renameTab],
  );

  // Handlers - Basic info (MegaMekLab format)
  const handleChassisChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newChassis = e.target.value;
      setChassis(newChassis);
      updateTabName(newChassis, model);
    },
    [setChassis, model, updateTabName],
  );

  const handleClanNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setClanName(e.target.value);
    },
    [setClanName],
  );

  const handleModelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newModel = e.target.value;
      setModel(newModel);
      updateTabName(chassis, newModel);
    },
    [setModel, chassis, updateTabName],
  );

  const handleMulIdChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Allow numbers and hyphens only, store as string (-1 for custom units)
      const value = e.target.value.replace(/[^0-9-]/g, '');
      setMulId(value === '' ? '-1' : value);
    },
    [setMulId],
  );

  const handleYearChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 10);
      if (!isNaN(value) && value > 0) {
        setYear(value);
      }
    },
    [setYear],
  );

  const handleRulesLevelChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setRulesLevel(e.target.value as RulesLevel);
    },
    [setRulesLevel],
  );

  // Handler for global mode change
  const handleModeChange = useCallback(
    (newMode: TechBaseMode) => {
      setTechBaseMode(newMode);
    },
    [setTechBaseMode],
  );

  // Handler for individual component change
  const handleComponentChange = useCallback(
    (component: TechBaseComponent, newTechBase: TechBase) => {
      setComponentTechBase(component, newTechBase);
    },
    [setComponentTechBase],
  );

  // Build component values based on actual store selections
  const [isTechConfigOpen, setIsTechConfigOpen] = useState(
    techBaseMode === TechBaseMode.MIXED,
  );

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
  }, [
    engineType,
    engineRating,
    gyroType,
    internalStructureType,
    heatSinkType,
    heatSinkCount,
    armorType,
    enhancement,
  ]);

  const unplacedCount = equipment.filter(
    (item) => !hasAssignedCriticalSlots(item),
  ).length;

  return (
    <div
      className={`grid gap-4 p-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] xl:items-start ${className}`}
    >
      <div className={cs.panel.main}>
        <div className="border-border-theme mb-4 flex flex-col gap-1 border-b pb-3 sm:flex-row sm:items-baseline sm:justify-between">
          <h3 className={cs.text.cardTitle}>Identity</h3>
          <p className={`${cs.text.secondary} sm:text-right`}>
            {TECH_BASE_MODE_LABELS[techBaseMode]} · {rulesLevel}
          </p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[1.35fr_0.8fr_1fr]">
            <div className={cs.layout.field}>
              <label className={cs.text.label}>Chassis</label>
              <input
                type="text"
                aria-label="Chassis"
                value={chassis}
                onChange={handleChassisChange}
                disabled={readOnly}
                className={cs.input.full}
                placeholder="New"
              />
            </div>

            <div className={cs.layout.field}>
              <label className={cs.text.label}>Model</label>
              <input
                type="text"
                aria-label="Model"
                value={model}
                onChange={handleModelChange}
                disabled={readOnly}
                className={cs.input.full}
                placeholder="Mek"
              />
            </div>

            <div className={cs.layout.field}>
              <label className={cs.text.label}>
                Clan Name <span className={cs.text.secondary}>(opt)</span>
              </label>
              <input
                type="text"
                aria-label="Clan name"
                value={clanName}
                onChange={handleClanNameChange}
                disabled={readOnly}
                className={cs.input.full}
                placeholder=""
              />
            </div>
          </div>

          <div className="border-border-theme grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-3">
            <div className={cs.layout.field}>
              <label className={cs.text.label}>Year</label>
              <input
                type="number"
                aria-label="Year"
                value={year}
                onChange={handleYearChange}
                disabled={readOnly}
                min={2000}
                max={3200}
                className={`${cs.input.full} ${cs.input.noSpinners}`}
              />
            </div>

            <div className={cs.layout.field}>
              <label className={cs.text.label}>Tech Level</label>
              <select
                aria-label="Tech level"
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

            <div className={cs.layout.field}>
              <label className={cs.text.label}>MUL ID</label>
              <input
                type="text"
                aria-label="MUL ID"
                value={mulId}
                onChange={handleMulIdChange}
                disabled={readOnly}
                className={cs.input.full}
                placeholder="-1"
              />
            </div>
          </div>

          <OverviewOmniControls readOnly={readOnly} />
        </div>
      </div>

      {/* Wide screens: Identity on the left; technology and summary stack on the right. */}
      <div className="flex min-w-0 flex-col gap-4">
        <details
          className={`${cs.panel.main} group`}
          open={isTechConfigOpen}
          onToggle={(event) => setIsTechConfigOpen(event.currentTarget.open)}
        >
          <summary className="focus-visible:ring-accent focus-visible:ring-offset-surface-base flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 rounded text-left focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
            <span>
              <span className={`${cs.text.cardTitle} block`}>
                Component technology
              </span>
              <span className={cs.text.secondary}>
                {techBaseMode === TechBaseMode.MIXED
                  ? 'Mixed tech is active; each component can be configured independently.'
                  : `${TECH_BASE_MODE_LABELS[techBaseMode]} applies across the unit.`}
              </span>
            </span>
            <AppIcon
              name="chevron-down"
              size="inline"
              className="text-text-theme-secondary shrink-0 transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <div className="border-border-theme mt-4 border-t pt-4">
            <TechBaseConfiguration
              mode={techBaseMode}
              components={componentTechBases}
              componentValues={componentValues}
              onModeChange={handleModeChange}
              onComponentChange={handleComponentChange}
              readOnly={readOnly}
            />
          </div>
        </details>

        <div
          className={`${cs.panel.main} flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1`}
        >
          <h3 className={cs.text.cardTitle}>Loadout summary</h3>
          {equipment.length > 0 ? (
            <p
              aria-label="Equipment summary"
              className="text-text-theme-secondary text-sm tabular-nums"
            >
              <strong className={cs.text.value}>{equipment.length}</strong>{' '}
              {equipment.length === 1 ? 'item' : 'items'} ·{' '}
              <strong className={cs.text.value}>
                {equipment
                  .reduce((sum, item) => sum + item.weight, 0)
                  .toFixed(1)}{' '}
                t
              </strong>{' '}
              equipment weight ·{' '}
              <strong
                className={
                  unplacedCount > 0 ? cs.text.valueWarning : cs.text.value
                }
              >
                {unplacedCount}
              </strong>{' '}
              need placement
            </p>
          ) : (
            <p aria-label="Equipment summary" className={cs.text.secondary}>
              No equipment mounted. Add weapons and equipment from the Equipment
              tab.
            </p>
          )}
        </div>
      </div>

      {readOnly && (
        <div className={`${cs.panel.notice} xl:col-span-2`}>
          This unit is in read-only mode. Changes cannot be made.
        </div>
      )}
    </div>
  );
}
