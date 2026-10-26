/**
 * Armor allocation footer
 *
 * The unallocated-points readout beside the armor status legend, shown under
 * the biped diagram where the armor inspector is not on screen next to it.
 *
 * @spec openspec/specs/armor-diagram/spec.md
 */

import React from 'react';

import { ArmorStatusLegend } from '@/components/armor/shared/ArmorStatusLegend';

export interface ArmorAllocationFooterProps {
  /** Points the armor tonnage buys that are not placed yet (negative = over). */
  readonly unallocatedPoints: number;
  readonly className?: string;
}

export function ArmorAllocationFooter({
  unallocatedPoints,
  className = '',
}: ArmorAllocationFooterProps): React.ReactElement {
  const over = unallocatedPoints < 0;
  return (
    <div
      className={`border-border-theme-subtle bg-surface-deep flex flex-col gap-2 rounded border px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-x-4 ${className}`}
      data-testid="armor-allocation-footer"
    >
      <div className="flex items-baseline justify-between gap-x-4 text-xs sm:justify-start">
        <div className="flex items-baseline gap-2" aria-live="polite">
          <span className={over ? 'text-red-400' : 'text-text-theme-secondary'}>
            {over ? 'Over allocated' : 'Unallocated:'}
          </span>
          <span className="text-text-theme-primary font-semibold tabular-nums">
            {Math.abs(unallocatedPoints)} points
          </span>
        </div>
        <span className="text-text-theme-secondary">R = rear armor</span>
      </div>
      <ArmorStatusLegend className="mt-0! flex-wrap justify-start!" />
    </div>
  );
}
