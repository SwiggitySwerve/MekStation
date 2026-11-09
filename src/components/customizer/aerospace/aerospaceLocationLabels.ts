import { getAerospaceArcs } from '@/types/construction/aerospaceArcLabels';
import { AerospaceLocation } from '@/types/construction/UnitLocation';
import { AerospaceSubType } from '@/types/unit/AerospaceInterfaces';

/**
 * Shared display order; persisted location values remain unchanged. The labels
 * come from the shared owner (`types/construction/aerospaceArcLabels.ts`),
 * which the record sheet also uses.
 */
export const AEROSPACE_ARMOR_ARCS: { arc: AerospaceLocation; label: string }[] =
  getAerospaceArcs(false).map(({ arc, label }) => ({ arc, label }));

export const AEROSPACE_ARC_OPTIONS = [
  ...AEROSPACE_ARMOR_ARCS.map(({ arc, label }) => ({ value: arc, label })),
  { value: AerospaceLocation.FUSELAGE, label: AerospaceLocation.FUSELAGE },
];

/** MegaMek 48fcb2f64 SmallCraft.java LOCATION_NAMES; keep the store's arc keys. */
export function getAerospaceArmorArcs(
  subType: AerospaceSubType,
): typeof AEROSPACE_ARMOR_ARCS {
  return getAerospaceArcs(subType === AerospaceSubType.SMALL_CRAFT).map(
    ({ arc, label }) => ({ arc, label }),
  );
}
