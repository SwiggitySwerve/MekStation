/**
 * Component technology card
 *
 * Shows each component's current selection and tech base at a glance, with
 * the full tech base editor (including mixed-tech per-component toggles)
 * one disclosure away.
 *
 * @spec openspec/specs/customizer-tabs/spec.md
 */

import React, { useCallback, useMemo, useState } from 'react';

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
  TECH_BASE_MODE_LABELS,
  TechBaseComponent,
  TechBaseMode,
} from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';
import {
  getTechBaseBadgeClass,
  getTechBaseShortName,
} from '@/utils/colors/techBaseColors';

import {
  IComponentValues,
  TechBaseConfiguration,
} from '../../shared/TechBaseConfiguration';
import { customizerStyles as cs } from '../../styles';

const COMPONENTS = Object.values(TechBaseComponent);

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
}

export function ComponentTechnologyCard({
  readOnly,
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
      className={`${cs.panel.main} @container`}
      data-testid="overview-component-technology"
    >
      <div className="border-border-theme mb-3 flex flex-col gap-1 border-b pb-3 @sm:flex-row @sm:items-baseline @sm:justify-between">
        <h3 id="overview-component-tech-title" className={cs.text.cardTitle}>
          Component technology
        </h3>
        <p className={`${cs.text.secondary} @sm:text-right`}>
          {showPerComponentTech
            ? 'Mixed tech: each component sets its own tech base.'
            : `${TECH_BASE_MODE_LABELS[techBaseMode]} applies across the unit.`}
        </p>
      </div>

      <dl className="grid grid-cols-1 gap-x-6 @lg:grid-cols-2">
        {COMPONENTS.map((component) => {
          const value = componentValues[component];
          const techBase = componentTechBases[component];
          return (
            <div
              key={component}
              className="border-border-theme-subtle flex min-h-9 items-center justify-between gap-3 border-b py-1.5 text-sm"
              title={TECH_BASE_COMPONENT_DESCRIPTIONS[component]}
            >
              <dt className="text-text-theme-secondary shrink-0">
                {TECH_BASE_COMPONENT_LABELS[component]}
              </dt>
              <dd className="flex min-w-0 items-center justify-end gap-2">
                <span
                  className={`truncate ${
                    value === 'None'
                      ? 'text-text-theme-secondary'
                      : 'text-text-theme-primary'
                  }`}
                >
                  {value}
                </span>
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

      <details
        className="group mt-3"
        open={isEditorOpen}
        onToggle={(event) => setIsEditorOpen(event.currentTarget.open)}
      >
        <summary className="focus-visible:ring-accent text-text-theme-secondary hover:text-text-theme-primary inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded text-sm font-medium focus-visible:ring-2 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
          {readOnly ? 'Tech base settings' : 'Change tech base'}
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
