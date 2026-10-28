/**
 * Armor Summary Strip
 *
 * Compact header for the Armor tab: tonnage and the allocated total, with a
 * plain-words line explaining why the allocated total can sit below the
 * chassis maximum. The armor type, its points per ton and its slots live once,
 * in the inspector's Armor Type field.
 *
 * @spec openspec/specs/customizer-tabs/spec.md
 */

import React from 'react';

import { formatTons } from '@/utils/formatting';

import { customizerStyles as cs } from '../styles';
import { describeArmorPoints } from './ArmorTab.logic';

interface ArmorSummaryStripProps {
  readonly armorTonnage: number;
  /** Points the current armor tonnage buys. */
  readonly availablePoints: number;
  readonly allocatedPoints: number;
  readonly maxTotalArmor: number;
  readonly maxUsefulTonnage: number;
}

export function ArmorSummaryStrip({
  armorTonnage,
  availablePoints,
  allocatedPoints,
  maxTotalArmor,
  maxUsefulTonnage,
}: ArmorSummaryStripProps): React.ReactElement {
  const explanation = describeArmorPoints({
    availablePoints,
    armorTonnage,
    allocatedPoints,
    maxTotalArmor,
    maxUsefulTonnage,
  });

  // Sized to its two facts rather than the tab's width, so it never leaves
  // an empty band beside them.
  return (
    <div className={`${cs.panel.summary} w-fit max-w-full`}>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
        <div className={cs.layout.statRow}>
          <span className={`text-sm ${cs.text.label}`}>Tonnage:</span>
          <span className="text-text-theme-primary text-lg font-bold tabular-nums">
            {formatTons(armorTonnage)}
          </span>
        </div>
        <div className="flex flex-col">
          <div className={cs.layout.statRow}>
            <span className={`text-sm ${cs.text.label}`}>Allocated:</span>
            <span
              className={`text-lg font-bold tabular-nums ${allocatedPoints > maxTotalArmor ? 'text-red-400' : 'text-text-theme-primary'}`}
            >
              {allocatedPoints} / {maxTotalArmor}
            </span>
          </div>
          <span
            className={`${cs.text.secondary} tabular-nums`}
            data-testid="armor-points-explanation"
          >
            {explanation}
          </span>
        </div>
      </div>
    </div>
  );
}
