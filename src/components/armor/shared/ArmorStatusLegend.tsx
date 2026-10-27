/**
 * Armor Status Legend Component
 *
 * Shows the color-coded legend for armor allocation status.
 * Used across all armor diagram variants for consistency.
 */

import React from 'react';

import { ARMOR_STATUS } from '@/constants/armorStatus';

export interface ArmorStatusLegendProps {
  /** Additional CSS classes */
  className?: string;
}

/**
 * Standard armor status color legend
 */
export function ArmorStatusLegend({
  className = '',
}: ArmorStatusLegendProps): React.ReactElement {
  const healthyPct = Math.round(ARMOR_STATUS.HEALTHY.min * 100);
  const moderatePct = Math.round(ARMOR_STATUS.MODERATE.min * 100);
  const lowPct = Math.round(ARMOR_STATUS.LOW.min * 100);

  return (
    <div
      className={`mt-4 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-xs max-sm:gap-x-2 max-sm:text-sm ${className}`}
    >
      <span className="text-text-theme-secondary font-medium">
        <span className="max-sm:sr-only">Armor </span>% of max:
      </span>
      <div className="flex items-center gap-1">
        <div
          className="h-3 w-3 rounded max-sm:h-3.5 max-sm:w-3.5"
          style={{ backgroundColor: ARMOR_STATUS.HEALTHY.color }}
        />
        <span className="text-text-theme-secondary">{healthyPct}%+</span>
      </div>
      <div className="flex items-center gap-1">
        <div
          className="h-3 w-3 rounded max-sm:h-3.5 max-sm:w-3.5"
          style={{ backgroundColor: ARMOR_STATUS.MODERATE.color }}
        />
        <span className="text-text-theme-secondary">{moderatePct}%+</span>
      </div>
      <div className="flex items-center gap-1">
        <div
          className="h-3 w-3 rounded max-sm:h-3.5 max-sm:w-3.5"
          style={{ backgroundColor: ARMOR_STATUS.LOW.color }}
        />
        <span className="text-text-theme-secondary">{lowPct}%+</span>
      </div>
      <div className="flex items-center gap-1">
        <div
          className="h-3 w-3 rounded max-sm:h-3.5 max-sm:w-3.5"
          style={{ backgroundColor: ARMOR_STATUS.CRITICAL.color }}
        />
        <span className="text-text-theme-secondary">&lt;{lowPct}%</span>
      </div>
    </div>
  );
}

/**
 * Instruction text shown below armor diagrams
 */
export function ArmorDiagramInstructions({
  className = '',
  text = 'Click a location to edit armor values',
}: {
  className?: string;
  text?: string;
}): React.ReactElement {
  return (
    <p
      className={`text-text-theme-secondary mt-2 text-center text-xs ${className}`}
    >
      {text}
    </p>
  );
}
