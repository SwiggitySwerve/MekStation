/**
 * Component technology card
 *
 * Shows each component's current selection and tech base at a glance, with
 * the full tech base editor (including mixed-tech per-component toggles)
 * one disclosure away. The selections themselves are set elsewhere, so each
 * value links to the tab that changes it.
 *
 * @spec openspec/specs/customizer-tabs/spec.md
 */

import React, { useCallback, useMemo, useState } from 'react';

import type { CustomizerTabId } from '@/hooks/useCustomizerRouter';

import { AppIcon } from '@/components/ui/AppIcon';
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
  isEffectivelyMixed,
  TECH_BASE_COMPONENT_DESCRIPTIONS,
  TECH_BASE_COMPONENT_LABELS,
  TechBaseComponent,
  TechBaseMode,
} from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';
import {
  getTechBaseBadgeClass,
  getTechBaseShortName,
} from '@/utils/colors/techBaseColors';
import { getTabLabel } from '@/utils/validation/validationNavigation';

import {
  IComponentValues,
  TechBaseConfiguration,
} from '../../shared/TechBaseConfiguration';
import { customizerStyles as cs } from '../../styles';

const COMPONENTS = Object.values(TechBaseComponent);

/**
 * The tab where each component's selection is changed, including values
 * currently set to "None". Targeting computers are chosen with equipment.
 */
const COMPONENT_EDIT_TAB: Partial<Record<TechBaseComponent, CustomizerTabId>> =
  {
    [TechBaseComponent.CHASSIS]: 'structure',
    [TechBaseComponent.GYRO]: 'structure',
    [TechBaseComponent.ENGINE]: 'structure',
    [TechBaseComponent.HEATSINK]: 'structure',
    [TechBaseComponent.MYOMER]: 'structure',
    [TechBaseComponent.MOVEMENT]: 'structure',
    [TechBaseComponent.ARMOR]: 'armor',
    [TechBaseComponent.TARGETING]: 'equipment',
  };

/**
 * The value as a "go to" link, the same treatment as the readiness rows'
 * "Go to <tab> ›": plain value text with a trailing chevron, tinted on hover
 * and focus. No underline, so it never reads as a different kind of control.
 */
const VALUE_LINK =
  'group focus-visible:ring-accent inline-flex min-w-0 items-center gap-1 rounded !p-0 text-left !leading-6 transition-colors hover:text-text-theme-primary focus-visible:ring-2 focus-visible:outline-none [@media(pointer:coarse)]:min-h-11';

function useComponentValues(): IComponentValues {
  const engineType = useUnitStore((s) => s.engineType);
  const engineRating = useUnitStore((s) => s.engineRating);
  const gyroType = useUnitStore((s) => s.gyroType);
  const internalStructureType = useUnitStore((s) => s.internalStructureType);
  const heatSinkType = useUnitStore((s) => s.heatSinkType);
  const heatSinkCount = useUnitStore((s) => s.heatSinkCount);
  const armorType = useUnitStore((s) => s.armorType);
  const enhancement = useUnitStore((s) => s.enhancement);

  return useMemo(() => {
    const engineDef = getEngineDefinition(engineType);
    const gyroDef = getGyroDefinition(gyroType);
    const structureDef = getInternalStructureDefinition(internalStructureType);
    const heatSinkDef = getHeatSinkDefinition(heatSinkType);
    const armorDef = getArmorDefinition(armorType);

    // TSM is a myomer; MASC, Supercharger and Partial Wing are movement
    // enhancements that leave the myomer standard.
    const myomerName =
      enhancement === MovementEnhancementType.TSM
        ? 'Triple-Strength Myomer'
        : 'Standard';
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
}

interface ComponentTechnologyCardProps {
  readonly readOnly: boolean;
  /** Opens the tab that changes a component's selection. */
  readonly onNavigate?: (tabId: CustomizerTabId) => void;
}

export function ComponentTechnologyCard({
  readOnly,
  onNavigate,
}: ComponentTechnologyCardProps): React.ReactElement {
  const techBaseMode = useUnitStore((s) => s.techBaseMode);
  const componentTechBases = useUnitStore((s) => s.componentTechBases);
  const setTechBaseMode = useUnitStore((s) => s.setTechBaseMode);
  const setComponentTechBase = useUnitStore((s) => s.setComponentTechBase);
  const componentValues = useComponentValues();

  const [isEditorOpen, setIsEditorOpen] = useState(
    techBaseMode === TechBaseMode.MIXED,
  );

  const handleModeChange = useCallback(
    (newMode: TechBaseMode) => setTechBaseMode(newMode),
    [setTechBaseMode],
  );
  const handleComponentChange = useCallback(
    (component: TechBaseComponent, newTechBase: TechBase) =>
      setComponentTechBase(component, newTechBase),
    [setComponentTechBase],
  );

  const showPerComponentTech =
    techBaseMode === TechBaseMode.MIXED ||
    isEffectivelyMixed(componentTechBases);

  return (
    <section
      aria-labelledby="overview-component-tech-title"
      className={`${cs.panel.main} @container flex flex-1 flex-col`}
      data-testid="overview-component-technology"
    >
      {/* No gap under the rule: the first row starts on the same pitch as the
          rest of the list. */}
      <div className="border-border-theme flex flex-col gap-1 border-b pb-3 @sm:flex-row @sm:items-baseline @sm:justify-between">
        <div className="min-w-0">
          <h3 id="overview-component-tech-title" className={cs.text.cardTitle}>
            Component Technology
          </h3>
          <p
            className={`${cs.text.secondary} mt-1`}
            data-testid="overview-component-tech-help"
          >
            {/* Short enough for one line; "Change Tech Base" sits right below. */}
            Set in Structure, Armor and Equipment.
          </p>
        </div>
        {/* A single tech base is already in the Identity header. */}
        {showPerComponentTech && (
          <p className={`${cs.text.secondary} @sm:text-right`}>
            Mixed tech: each component sets its own tech base.
          </p>
        )}
      </div>

      {/* Rows share any height the card is stretched to, so the card can end on
          the same line as the column beside it without a void at the bottom. */}
      <dl className="grid flex-1 auto-rows-fr grid-cols-1 gap-x-6 @md:grid-cols-2">
        {COMPONENTS.map((component) => {
          const value = componentValues[component];
          const techBase = componentTechBases[component];
          const editTab = COMPONENT_EDIT_TAB[component];
          const isNone = value === 'None';
          const valueClass = isNone
            ? 'text-text-theme-secondary'
            : 'text-text-theme-primary';
          return (
            <div
              key={component}
              className="border-border-theme-subtle flex min-h-11 items-center justify-between gap-3 border-b py-1 text-sm"
              title={TECH_BASE_COMPONENT_DESCRIPTIONS[component]}
            >
              <dt className="text-text-theme-secondary shrink-0">
                {TECH_BASE_COMPONENT_LABELS[component]}
              </dt>
              <dd className="flex min-w-0 items-center justify-end gap-2">
                {onNavigate && editTab ? (
                  <button
                    type="button"
                    onClick={() => onNavigate(editTab)}
                    aria-label={`${TECH_BASE_COMPONENT_LABELS[component]}: ${value}. Change in ${getTabLabel(editTab)}`}
                    className={`${VALUE_LINK} ${valueClass}`}
                  >
                    <span className="min-w-0 truncate">{value}</span>
                    <AppIcon
                      name="chevron-right"
                      size="inline"
                      aria-hidden="true"
                      className="text-text-theme-muted group-hover:text-accent group-focus-visible:text-accent shrink-0 transition-colors"
                    />
                  </button>
                ) : (
                  <span className={`truncate ${valueClass}`}>{value}</span>
                )}
                {showPerComponentTech && techBase && (
                  <span
                    className={`${getTechBaseBadgeClass(techBase)} shrink-0`}
                  >
                    {getTechBaseShortName(techBase)}
                  </span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>

      {/* Full-width footer row; its rule overlaps the last rows' rules so the
          divider runs unbroken under both columns. */}
      <details
        className="group border-border-theme -mt-px border-t"
        open={isEditorOpen}
        onToggle={(event) => setIsEditorOpen(event.currentTarget.open)}
      >
        {/* The same disclosure row as Armor's "Advanced Allocation Details":
            trailing chevron, secondary text that brightens on hover. */}
        <summary className="focus-visible:ring-accent text-text-theme-secondary hover:text-text-theme-primary flex min-h-11 w-full cursor-pointer list-none items-center justify-between gap-2 rounded text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
          {readOnly ? 'Tech Base Settings' : 'Change Tech Base'}
          <AppIcon
            name="chevron-down"
            size="inline"
            className="shrink-0 transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <div className="mt-2">
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
    </section>
  );
}
