/**
 * Armor Status Legend Component
 *
 * Shows the color-coded legend for armor allocation status.
 * Used across all armor diagram variants for consistency.
 */

import React from 'react';

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
  return (
    <div className={`flex justify-center gap-3 mt-4 text-xs ${className}`}>
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded bg-green-500" />
        <span className="text-text-theme-secondary">75%+</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded bg-amber-500" />
        <span className="text-text-theme-secondary">50%+</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded bg-orange-500" />
        <span className="text-text-theme-secondary">25%+</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded bg-red-500" />
        <span className="text-text-theme-secondary">&lt;25%</span>
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
    <p className={`text-xs text-text-theme-secondary text-center mt-2 ${className}`}>
      {text}
    </p>
  );
}
