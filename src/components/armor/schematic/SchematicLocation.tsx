import React from 'react';

import { MechLocation } from '@/types/construction';

import { hasRearArmor, LOCATION_SHORT_LABELS } from '../shared/types';

/**
 * Get status color based on armor percentage
 */
function getStatusColor(current: number, maximum: number): string {
  if (maximum === 0) return 'bg-gray-500';
  const percentage = (current / maximum) * 100;
  if (percentage >= 75) return 'bg-green-500';
  if (percentage >= 50) return 'bg-amber-500';
  if (percentage >= 25) return 'bg-orange-500';
  return 'bg-red-500';
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
  const frontColor = getStatusColor(current, maximum);
  const rearColor = showRear ? getStatusColor(rear!, rearMaximum ?? 1) : '';

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
      {/* Location Label */}
      <div className="text-text-theme-secondary mb-1 text-xs font-semibold">
        {label}
      </div>

      {/* Front Armor Section */}
      <div className="flex items-center gap-2">
        <div className={`h-8 w-2 rounded ${frontColor}`} />
        <div className="flex flex-col">
          <span className="text-lg font-bold text-white tabular-nums">
            {current}
          </span>
          <span className="text-text-theme-secondary text-xs">/ {maximum}</span>
        </div>
      </div>

      {/* Rear Armor Section (torso only) */}
      {showRear && (
        <div className="border-border-theme-subtle mt-2 border-t pt-2">
          <div className="text-text-theme-secondary mb-1 text-xs">Rear</div>
          <div className="flex items-center gap-2">
            <div className={`h-6 w-2 rounded ${rearColor}`} />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white tabular-nums">
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
