import React, { useId } from 'react';

import { ARMOR_STATUS } from '@/constants/armorStatus';
import { MechLocation } from '@/types/construction';
import { getArmorStatusColor } from '@/utils/armor/armorColors';

import { hasRearArmor, LOCATION_SHORT_LABELS } from '../shared/types';

interface SchematicFill {
  color: string;
  emptyColor: string;
  ratio: number;
}

const SCHEMATIC_EMPTY_COLORS: Record<string, string> = {
  [ARMOR_STATUS.HEALTHY.color]: '#14532d',
  [ARMOR_STATUS.MODERATE.color]: '#713f12',
  [ARMOR_STATUS.LOW.color]: '#7c2d12',
  [ARMOR_STATUS.CRITICAL.color]: '#7f1d1d',
};

function getSchematicFill(current: number, maximum: number): SchematicFill {
  const ratio = maximum > 0 ? Math.min(1, Math.max(0, current / maximum)) : 0;

  if (maximum === 0) {
    return { color: '#64748b', emptyColor: '#334155', ratio };
  }
  const color = getArmorStatusColor(current, maximum);
  return { color, emptyColor: SCHEMATIC_EMPTY_COLORS[color], ratio };
}

function SchematicCapacityBar({
  fill,
  marker,
  height,
  section,
}: {
  fill: SchematicFill;
  marker: string;
  height: number;
  section: 'front' | 'rear';
}): React.ReactElement {
  const id = useId();
  const boundary = 1 - fill.ratio;

  return (
    <svg
      className="h-full w-2 shrink-0"
      viewBox={`0 0 8 ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={fill.emptyColor} />
          <stop offset={boundary} stopColor={fill.emptyColor} />
          <stop offset={boundary} stopColor={fill.color} />
          <stop offset="1" stopColor={fill.color} />
        </linearGradient>
      </defs>
      <rect
        data-armor-fill={marker}
        data-armor-fill-ratio={fill.ratio}
        data-armor-fill-section={section}
        width="8"
        height={height}
        rx="4"
        fill={`url(#${id})`}
      />
    </svg>
  );
}

export interface SchematicLocationProps {
  location: MechLocation;
  current: number;
  maximum: number;
  rear?: number;
  rearMaximum?: number;
  isSelected: boolean;
  onClick: (location: MechLocation) => void;
}

export function SchematicLocation({
  location,
  current,
  maximum,
  rear,
  rearMaximum,
  isSelected,
  onClick,
}: SchematicLocationProps): React.ReactElement {
  const label = LOCATION_SHORT_LABELS[location];
  const showRear = hasRearArmor(location) && rear !== undefined;
  const frontFill = getSchematicFill(current, maximum);
  const rearFill = showRear ? getSchematicFill(rear!, rearMaximum ?? 0) : null;

  const ariaLabel = showRear
    ? `${location} armor: Front ${current} of ${maximum}, Rear ${rear} of ${rearMaximum}`
    : `${location} armor: ${current} of ${maximum}`;

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={isSelected}
      onClick={() => onClick(location)}
      className={`bg-surface-base hover:bg-surface-raised relative rounded-lg border p-3 transition-all duration-150 ${isSelected ? 'border-blue-500 ring-2 ring-blue-500' : 'border-border-theme-subtle'} min-h-[44px] min-w-[44px] focus:ring-2 focus:ring-blue-500 focus:outline-none`}
    >
      <div className="text-text-theme-secondary mb-1 text-xs font-semibold">
        {label}
      </div>

      <div className="flex h-8 items-center gap-2">
        <SchematicCapacityBar
          fill={frontFill}
          marker={`${location}-front`}
          height={32}
          section="front"
        />
        <div className="flex flex-col">
          <span className="text-text-theme-primary text-lg font-bold tabular-nums">
            {current}
          </span>
          <span className="text-text-theme-secondary text-xs">/ {maximum}</span>
        </div>
      </div>

      {showRear && rearFill && (
        <div className="border-border-theme-subtle mt-2 border-t pt-2">
          <div className="text-text-theme-secondary mb-1 text-xs">Rear</div>
          <div className="flex h-6 items-center gap-2">
            <SchematicCapacityBar
              fill={rearFill}
              marker={`${location}-rear`}
              height={24}
              section="rear"
            />
            <div className="flex flex-col">
              <span className="text-text-theme-primary text-sm font-bold tabular-nums">
                {rear}
              </span>
              <span className="text-text-theme-secondary text-xs">
                / {rearMaximum}
              </span>
            </div>
          </div>
        </div>
      )}
    </button>
  );
}
