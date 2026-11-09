import {
  AerospaceLocation,
  SmallCraftLocation,
} from '@/types/construction/UnitLocation';
import { AerospaceSubType } from '@/types/unit/AerospaceInterfaces';

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

/** MegaMek 48fcb2f64 SmallCraft.java LOCATION_NAMES; keep the store's arc keys. */
export function getAerospaceArmorArcs(
  subType: AerospaceSubType,
): typeof AEROSPACE_ARMOR_ARCS {
  return AEROSPACE_ARMOR_ARCS.map(({ arc, label }) => ({
    arc,
    label:
      subType === AerospaceSubType.SMALL_CRAFT
        ? arc === AerospaceLocation.LEFT_WING
          ? SmallCraftLocation.LEFT_SIDE
          : arc === AerospaceLocation.RIGHT_WING
            ? SmallCraftLocation.RIGHT_SIDE
            : label
        : label,
  }));
}
