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

const SEGMENT_COLORS: Record<TonnageSegmentId, string> = {
  structure: 'bg-slate-400',
  engine: 'bg-sky-500',
  gyro: 'bg-sky-300',
  cockpit: 'bg-indigo-400',
  heatSinks: 'bg-cyan-400',
  jumpJets: 'bg-teal-300',
  armor: 'bg-emerald-500',
  equipment: 'bg-violet-400',
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
    ['heatSinks', 'Heat sinks', calculations.heatSinkWeight],
    ['jumpJets', 'Jump jets', calculations.jumpJetWeight],
    ['armor', 'Armor', calculations.armorWeight],
    ['equipment', 'Equipment', equipmentWeight],
  ];
  const segments = entries
    .filter(([, , tons]) => tons > 0)
    .map(([id, label, tons]) => ({
      id,
      label,
      tons,
      colorClass: SEGMENT_COLORS[id],
    }));
  return {
    segments,
    used: weight.used,
    max: weight.max,
    free: Math.max(0, weight.remaining),
    over: Math.max(0, -weight.remaining),
  };
}

/** Tons with one decimal, matching the banner readout, e.g. "19.0 t". */
export function formatTons(tons: number): string {
  return `${tons.toFixed(1)} t`;
}
