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
  QUALITY_ORDER.map((q, i) => [q, i])
);

export function degradeQuality(quality: PartQuality): PartQuality {
  const index = QUALITY_INDEX.get(quality)!;
  return index === 0 ? quality : QUALITY_ORDER[index - 1];
}

export function improveQuality(quality: PartQuality): PartQuality {
  const index = QUALITY_INDEX.get(quality)!;
  return index === QUALITY_ORDER.length - 1 ? quality : QUALITY_ORDER[index + 1];
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
