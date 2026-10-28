/**
 * Tonnage breakdown segments
 *
 * Arranges the component weights already computed by `useUnitCalculations`
 * and the payload weight from `useEquipmentCalculations` into labelled bar
 * segments. It only regroups those numbers; the weights themselves come from
 * their owners, so the segments always add up to the banner's weight total.
 */

import type { UnitCalculations } from '@/hooks/useUnitCalculations';

export type TonnageSegmentId =
  | 'structure'
  | 'engine'
  | 'gyro'
  | 'cockpit'
  | 'heatSinks'
  | 'jumpJets'
  | 'armor'
  | 'equipment';

export interface TonnageSegment {
  readonly id: TonnageSegmentId;
  readonly label: string;
  readonly tons: number;
  /** Swatch/fill class for the bar segment and its legend key. */
  readonly colorClass: string;
}

export interface TonnageBreakdown {
  readonly segments: readonly TonnageSegment[];
  readonly used: number;
  readonly max: number;
  /** Unused tonnage; zero when overweight. */
  readonly free: number;
  /** Tons above the maximum; zero when in budget. */
  readonly over: number;
}

/**
 * Systems use their critical-slot family colours (slotColors.ts and
 * equipmentColors.ts); structure, armor and equipment use neutral greys.
 * Equipment, the payload, is a warm mid stone, at least 10 OKLab units from
 * every other segment, so it separates from the cool slate structure, cockpit
 * and light armor on narrow segments and never reads as free space. The Structure tab's weight
 * strip reuses these as its dots.
 */
export const TONNAGE_SEGMENT_COLORS: Record<TonnageSegmentId, string> = {
  structure: 'bg-slate-600',
  engine: 'bg-orange-400',
  gyro: 'bg-purple-400',
  cockpit: 'bg-slate-400',
  heatSinks: 'bg-cyan-400',
  jumpJets: 'bg-emerald-600',
  armor: 'bg-slate-300',
  equipment: 'bg-stone-500',
};

export function getTonnageBreakdown(
  calculations: Pick<
    UnitCalculations,
    | 'structureWeight'
    | 'engineWeight'
    | 'gyroWeight'
    | 'cockpitWeight'
    | 'heatSinkWeight'
    | 'jumpJetWeight'
    | 'armorWeight'
  >,
  equipmentWeight: number,
  weight: {
    readonly used: number;
    readonly max: number;
    readonly remaining: number;
  },
): TonnageBreakdown {
  const entries: ReadonlyArray<[TonnageSegmentId, string, number]> = [
    ['structure', 'Structure', calculations.structureWeight],
    ['engine', 'Engine', calculations.engineWeight],
    ['gyro', 'Gyro', calculations.gyroWeight],
    ['cockpit', 'Cockpit', calculations.cockpitWeight],
    ['heatSinks', 'Heat Sinks', calculations.heatSinkWeight],
    ['jumpJets', 'Jump Jets', calculations.jumpJetWeight],
    ['armor', 'Armor', calculations.armorWeight],
    ['equipment', 'Equipment', equipmentWeight],
  ];
  const segments = entries
    .filter(([, , tons]) => tons > 0)
    .map(([id, label, tons]) => ({
      id,
      label,
      tons,
      colorClass: TONNAGE_SEGMENT_COLORS[id],
    }));
  return {
    segments,
    used: weight.used,
    max: weight.max,
    free: Math.max(0, weight.remaining),
    over: Math.max(0, -weight.remaining),
  };
}
