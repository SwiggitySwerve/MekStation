import { AerospaceLocation } from '@/types/construction/UnitLocation';

/** Shared display order; persisted location values remain unchanged. */
export const AEROSPACE_ARMOR_ARCS = [
  AerospaceLocation.NOSE,
  AerospaceLocation.LEFT_WING,
  AerospaceLocation.RIGHT_WING,
  AerospaceLocation.AFT,
].map((arc) => ({ arc, label: arc as string }));

export const AEROSPACE_ARC_OPTIONS = [
  ...AEROSPACE_ARMOR_ARCS.map(({ arc, label }) => ({ value: arc, label })),
  { value: AerospaceLocation.FUSELAGE, label: AerospaceLocation.FUSELAGE },
];
