/**
 * Armor Tab Readouts
 *
 * The armor inspector's Unallocated Armor Points row and its Advanced
 * Allocation Details ledger. Leftover, over-allocated and wasted points are a
 * status, so they take the warning or error colour with its icon, never the
 * amber accent.
 *
 * @spec openspec/specs/armor-diagram/spec.md
 */

import React from 'react';

import { SeverityIcon } from '@/components/customizer/shared/BuildStatusLabel';
import { AppIcon } from '@/components/ui/AppIcon';

import { customizerStyles as cs } from '../styles';

interface ArmorTabReadoutsProps {
  readonly unallocatedPoints: number;
  readonly allocatedPoints: number;
  /** Points the current armor tonnage buys. */
  readonly availablePoints: number;
  readonly maxTotalArmor: number;
  readonly wastedPoints: number;
}

export function ArmorTabReadouts({
  unallocatedPoints,
  allocatedPoints,
  availablePoints,
  maxTotalArmor,
  wastedPoints,
}: ArmorTabReadoutsProps): React.ReactElement {
  return (
    <div className="border-border-theme-subtle border-t pt-2">
      <div className={`${cs.layout.rowBetween} text-sm`}>
        <span className={cs.text.label}>Unallocated Armor Points</span>
        <span
          className={`inline-flex items-center gap-1.5 font-medium tabular-nums ${
            unallocatedPoints < 0
              ? 'text-red-400'
              : unallocatedPoints > 0
                ? 'text-warning'
                : 'text-text-theme-primary'
          }`}
          data-testid="armor-unallocated-points"
        >
          {unallocatedPoints !== 0 && (
            <SeverityIcon kind={unallocatedPoints < 0 ? 'error' : 'warning'} />
          )}
          {unallocatedPoints}
        </span>
      </div>
      {/* Open by default: the ledger fills the inspector beside the
          taller diagram instead of leaving an empty band. */}
      <details className="group mt-3" open>
        <summary className="focus-visible:ring-accent text-text-theme-secondary hover:text-text-theme-primary flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
          Advanced Allocation Details
          <AppIcon
            name="chevron-down"
            size="inline"
            className="shrink-0 transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <div className="border-border-theme-subtle mt-3 space-y-2 border-l pl-3">
          <div className={`${cs.layout.rowBetween} text-sm`}>
            <span className={cs.text.label}>Allocated Armor Points</span>
            <span className={`${cs.text.value} tabular-nums`}>
              {allocatedPoints}
            </span>
          </div>
          <div className={`${cs.layout.rowBetween} text-sm`}>
            <span className={cs.text.label}>Points from Tonnage</span>
            <span className={`${cs.text.value} tabular-nums`}>
              {availablePoints}
            </span>
          </div>
          <div className={`${cs.layout.rowBetween} text-sm`}>
            <span className={cs.text.label}>Maximum Possible Armor Points</span>
            <span className="text-text-theme-secondary font-medium tabular-nums">
              {maxTotalArmor}
            </span>
          </div>
          {wastedPoints > 0 && (
            <div className={`${cs.layout.rowBetween} text-sm`}>
              <span className={cs.text.label}>Wasted Armor Points</span>
              <span className="text-warning inline-flex items-center gap-1.5 font-medium tabular-nums">
                <SeverityIcon kind="warning" />
                {wastedPoints}
              </span>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
