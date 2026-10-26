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
  EQUIPMENT_CATEGORY_COLORS,
  HEATSINK_COLORS,
} from '@/utils/colors/equipmentColors';
import { SLOT_COLORS, SystemComponentType } from '@/utils/colors/slotColors';
import { TECH_BASE_COLORS } from '@/utils/colors/techBaseColors';

interface ColorLegendProps {
  /** Initially expanded */
  defaultExpanded?: boolean;
  /** Additional CSS classes */
  className?: string;
}

interface ColorSwatchProps {
  bgClass: string;
  label: string;
}

function ColorSwatch({ bgClass, label }: ColorSwatchProps) {
  return (
    <div className="flex items-center gap-2">
      <div className={`h-5 w-7 shrink-0 rounded border ${bgClass}`} />
      <span className="text-text-theme-primary text-sm">{label}</span>
    </div>
  );
}

/**
 * Collapsible color reference panel
 */
export function ColorLegend({
  defaultExpanded = false,
  className = '',
}: ColorLegendProps): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const panelId = useId();

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
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls={panelId}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setIsExpanded(false);
        }}
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-text-theme-primary hover:text-text-theme-primary focus-visible:outline-accent flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2 text-sm transition-colors focus-visible:outline-2"
      >
        <span className="font-medium">Color Legend</span>
        <span
          className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        >
          <AppIcon name="chevron-down" size="inline" aria-hidden="true" />
        </span>
      </button>

      {isExpanded && (
        <div
          id={panelId}
          className="border-border-theme bg-surface-base absolute top-full right-0 z-20 max-h-[60dvh] w-[32rem] max-w-[calc(100vw-2rem)] space-y-4 overflow-y-auto rounded-lg border p-3 shadow-xl"
        >
          <p className="text-text-theme-secondary text-xs">
            Wide accents identify equipment; thin muted accents identify fixed
            systems. Dashed slots are empty or unhittable.
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
                  bgClass={`${SLOT_COLORS[type].bg} ${SLOT_COLORS[type].border}`}
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
              {equipmentTypes.map(({ accentBorder, label }) => (
                <ColorSwatch
                  key={label}
                  bgClass={`bg-surface-raised border-border-theme border-l-4 ${accentBorder}`}
                  label={label}
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
