/**
 * Armor Summary Strip
 *
 * Compact header for the Armor tab: armor type facts on the left, tonnage and
 * the allocated total on the right, with a plain-words line explaining why the
 * allocated total can sit below the chassis maximum.
 *
 * @spec openspec/specs/customizer-tabs/spec.md
 */

import React from 'react';

import { customizerStyles as cs } from '../styles';
import { describeArmorPoints } from './ArmorTab.logic';

interface ArmorSummaryStripProps {
  readonly armorTypeName: string;
  readonly pointsPerTon: number;
  readonly armorSlots: number;
  readonly armorTonnage: number;
  /** Points the current armor tonnage buys. */
  readonly availablePoints: number;
  readonly allocatedPoints: number;
  readonly maxTotalArmor: number;
  readonly maxUsefulTonnage: number;
}

export function ArmorSummaryStrip({
  armorTypeName,
  pointsPerTon,
  armorSlots,
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

  return (
    <div className={cs.panel.summary}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm sm:gap-x-6">
          <div className={`${cs.layout.statRow} flex-shrink-0`}>
            <span className={cs.text.label}>Type:</span>
            <span className={cs.text.value}>{armorTypeName}</span>
          </div>
          <div className={`${cs.layout.statRow} flex-shrink-0`}>
            <span className={cs.text.label}>Pts/Ton:</span>
            <span className={cs.text.value}>{pointsPerTon}</span>
          </div>
          <div className={`${cs.layout.statRow} flex-shrink-0`}>
            <span className={cs.text.label}>Slots:</span>
            <span className={cs.text.value}>{armorSlots}</span>
          </div>
        </div>
        <div className="border-border-theme-subtle flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-2 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4">
          <div className={cs.layout.statRow}>
            <span className={`text-sm ${cs.text.label}`}>Tonnage:</span>
            <span className="text-text-theme-primary text-lg font-bold tabular-nums">
              {armorTonnage}t
            </span>
          </div>
          <div className="flex flex-col">
            <div className={cs.layout.statRow}>
              <span className={`text-sm ${cs.text.label}`}>Allocated:</span>
              <span
                className={`text-lg font-bold tabular-nums ${allocatedPoints > maxTotalArmor ? 'text-red-400' : 'text-text-theme-primary'}`}
              >
                {allocatedPoints} / {maxTotalArmor} max
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
    </div>
  );
}
