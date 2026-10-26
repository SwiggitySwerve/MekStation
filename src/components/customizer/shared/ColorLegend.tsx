/**
 * Color Legend Component
 *
 * Collapsible color reference panel explaining the color system.
 *
 * @spec openspec/specs/color-system/spec.md
 */

import React, { useId, useState } from 'react';

import { AppIcon } from '@/components/ui/AppIcon';
import { TechBase } from '@/types/enums/TechBase';
import {
  classifyEquipmentByName,
  EQUIPMENT_CATEGORY_COLORS,
  HEATSINK_COLORS,
} from '@/utils/colors/equipmentColors';
import { SystemComponentType } from '@/utils/colors/slotColors';
import { TECH_BASE_COLORS } from '@/utils/colors/techBaseColors';

import {
  getCriticalCategoryTint,
  getSlotContentClasses,
  getSystemSlotClasses,
} from '../critical-slots/SlotVisualHelpers';
import styles from '../CustomizerWorkbench.module.css';

interface ColorLegendProps {
  /** Initially expanded */
  defaultExpanded?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Show the categories used by this unit inline on desktop. */
  equipmentNames?: readonly string[];
}

interface ColorSwatchProps {
  bgClass: string;
  label: string;
  compact?: boolean;
  style?: React.CSSProperties;
}

// Keep the empty-slot pattern legible at legend scale.
const EMPTY_SWATCH_CLASSES =
  'bg-surface-deep border-border-theme-strong border-dashed';

function ColorSwatch({
  bgClass,
  label,
  compact = false,
  style,
}: ColorSwatchProps) {
  return (
    <div
      className={`flex min-w-0 items-center gap-1.5 ${compact ? 'whitespace-nowrap' : ''}`}
    >
      <div
        aria-hidden="true"
        style={style}
        className={`${styles.criticalLegendBar} border-border-theme-strong shrink-0 rounded-sm border ${bgClass}`}
      />
      <span className="text-text-theme-primary text-[13px]">{label}</span>
    </div>
  );
}

/**
 * Collapsible color reference panel
 */
export function ColorLegend({
  defaultExpanded = false,
  className = '',
  equipmentNames,
}: ColorLegendProps): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const panelId = useId();
  const presentCategories = new Set(
    equipmentNames?.map(classifyEquipmentByName),
  );
  const inlineColors = [...presentCategories].map((category) =>
    category === 'heatsink'
      ? HEATSINK_COLORS
      : EQUIPMENT_CATEGORY_COLORS[category],
  );

  const systemComponents: { type: SystemComponentType; label: string }[] = [
    { type: 'engine', label: 'Engine' },
    { type: 'gyro', label: 'Gyro' },
    { type: 'actuator', label: 'Actuators' },
    { type: 'cockpit', label: 'Cockpit / life support / sensors' },
    { type: 'structure', label: 'Endo / Ferro (unhittable)' },
    { type: 'empty', label: 'Empty Slot' },
  ];

  const equipmentTypes = [
    ...Object.values(EQUIPMENT_CATEGORY_COLORS),
    { ...HEATSINK_COLORS, label: 'Heat Sinks' },
  ];

  const techBases = [
    { techBase: TechBase.INNER_SPHERE, label: 'Inner Sphere' },
    { techBase: TechBase.CLAN, label: 'Clan' },
  ];

  return (
    <div className={`bg-surface-base relative ${className}`}>
      {equipmentNames && (
        <div
          role="group"
          aria-label="Colour key"
          className="hidden flex-wrap items-center justify-end gap-x-3 gap-y-1 py-1 sm:flex"
        >
          {inlineColors.map((colors) => (
            <ColorSwatch
              key={colors.label}
              compact
              label={colors.label}
              style={getCriticalCategoryTint(colors)}
              bgClass={`border-l-4 ${colors.accentBorder} ${styles.criticalTintedSlot} ${colors === HEATSINK_COLORS ? styles.criticalHeatSink : ''}`}
            />
          ))}
          <ColorSwatch
            compact
            label="Fixed systems"
            bgClass={getSlotContentClasses({
              index: 0,
              type: 'system',
              name: 'Engine',
            })}
          />
          <ColorSwatch compact label="Empty" bgClass={EMPTY_SWATCH_CLASSES} />
        </div>
      )}
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls={panelId}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setIsExpanded(false);
        }}
        onClick={() => setIsExpanded(!isExpanded)}
        className={`text-text-theme-primary hover:text-text-theme-primary focus-visible:outline-accent flex min-h-11 w-full items-center justify-between gap-2 px-2 py-2 text-sm transition-colors focus-visible:outline-2 ${equipmentNames ? 'sm:hidden' : ''}`}
      >
        <span className="font-medium whitespace-nowrap">Colour key</span>
        <span
          className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        >
          <AppIcon name="chevron-down" size="inline" aria-hidden="true" />
        </span>
      </button>

      {isExpanded && (
        <div
          id={panelId}
          className={`border-border-theme bg-surface-base absolute top-full right-0 z-20 max-h-[60dvh] w-[32rem] max-w-[calc(100vw-2rem)] space-y-4 overflow-y-auto rounded-lg border p-3 shadow-xl ${equipmentNames ? 'sm:hidden' : ''}`}
        >
          <p className="text-text-theme-secondary text-xs">
            Tinted bars identify equipment; neutral grey identifies fixed
            systems. Patterned fill and dashed cyan stripes identify heat sinks.
            Dashed outlines are empty or unhittable.
          </p>
          {/* System Components */}
          <div>
            <h4 className="text-text-theme-secondary mb-2 text-xs font-semibold uppercase">
              System Components
            </h4>
            <div className="grid grid-cols-2 gap-1">
              {systemComponents.map(({ type, label }) => (
                <ColorSwatch
                  key={type}
                  bgClass={
                    type === 'empty'
                      ? EMPTY_SWATCH_CLASSES
                      : getSystemSlotClasses(type)
                  }
                  label={label}
                />
              ))}
            </div>
          </div>

          {/* Equipment Types */}
          <div>
            <h4 className="text-text-theme-secondary mb-2 text-xs font-semibold uppercase">
              Equipment Types
            </h4>
            <div className="grid grid-cols-2 gap-1">
              {equipmentTypes.map((colors) => (
                <ColorSwatch
                  key={colors.label}
                  style={getCriticalCategoryTint(colors)}
                  bgClass={`border-l-4 ${colors.accentBorder} ${styles.criticalTintedSlot} ${colors.label === 'Heat Sinks' ? styles.criticalHeatSink : ''}`}
                  label={colors.label}
                />
              ))}
            </div>
          </div>

          {/* Tech Base */}
          <div>
            <h4 className="text-text-theme-secondary mb-2 text-xs font-semibold uppercase">
              Tech Base
            </h4>
            <div className="grid grid-cols-2 gap-1">
              {techBases.map(({ techBase, label }) => (
                <ColorSwatch
                  key={techBase}
                  bgClass={TECH_BASE_COLORS[techBase].bg}
                  label={label}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
