export enum PartQuality {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  E = 'E',
  F = 'F',
}

export const QUALITY_TN_MODIFIER: Record<PartQuality, number> = {
  [PartQuality.A]: +3,
  [PartQuality.B]: +2,
  [PartQuality.C]: +1,
  [PartQuality.D]: 0,
  [PartQuality.E]: -1,
  [PartQuality.F]: -2,
};

export const QUALITY_ORDER: readonly PartQuality[] = Object.freeze([
  PartQuality.A,
  PartQuality.B,
  PartQuality.C,
  PartQuality.D,
  PartQuality.E,
  PartQuality.F,
]);

const QUALITY_INDEX = new Map<PartQuality, number>(
  QUALITY_ORDER.map((q, i) => [q, i]),
);

export function degradeQuality(quality: PartQuality): PartQuality {
  const index = QUALITY_INDEX.get(quality)!;
  return index === 0 ? quality : QUALITY_ORDER[index - 1];
}

export function improveQuality(quality: PartQuality): PartQuality {
  const index = QUALITY_INDEX.get(quality)!;
  return index === QUALITY_ORDER.length - 1
    ? quality
    : QUALITY_ORDER[index + 1];
}

const QUALITY_DISPLAY_NAMES: Record<PartQuality, string> = {
  [PartQuality.A]: 'A (Worst)',
  [PartQuality.B]: 'B (Poor)',
  [PartQuality.C]: 'C (Below Average)',
  [PartQuality.D]: 'D (Standard)',
  [PartQuality.E]: 'E (Good)',
  [PartQuality.F]: 'F (Best)',
};

export function getQualityDisplayName(quality: PartQuality): string {
  return QUALITY_DISPLAY_NAMES[quality];
}

const QUALITY_COLORS: Record<PartQuality, string> = {
  [PartQuality.A]: '#dc2626',
  [PartQuality.B]: '#ea580c',
  [PartQuality.C]: '#d97706',
  [PartQuality.D]: '#6b7280',
  [PartQuality.E]: '#16a34a',
  [PartQuality.F]: '#2563eb',
};

export function getQualityColor(quality: PartQuality): string {
  return QUALITY_COLORS[quality];
}

/**
 * Repair cost multiplier by quality grade.
 *
 * Worse quality parts (toward A) cost more to repair because they
 * require more labor and replacement components. Better quality parts
 * (toward F) are cheaper to maintain.
 *
 * A (worst) = 1.5x, F (best) = 0.8x
 */
export const QUALITY_REPAIR_COST_MULTIPLIER: Record<PartQuality, number> = {
  [PartQuality.A]: 1.5,
  [PartQuality.B]: 1.3,
  [PartQuality.C]: 1.1,
  [PartQuality.D]: 1.0,
  [PartQuality.E]: 0.9,
  [PartQuality.F]: 0.8,
};

export function getQualityRepairCostMultiplier(quality: PartQuality): number {
  return QUALITY_REPAIR_COST_MULTIPLIER[quality];
}

/** Default quality for new units */
export const DEFAULT_UNIT_QUALITY = PartQuality.D;

/** Default quality for salvaged equipment */
export const SALVAGE_STARTING_QUALITY = PartQuality.C;
