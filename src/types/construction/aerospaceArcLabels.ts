import { AerospaceLocation, SmallCraftLocation } from './UnitLocation';

/**
 * The four armor arcs in display order, as persisted store keys. Labels never
 * change what is saved.
 */
export const AEROSPACE_ARMOR_ARC_KEYS = [
  AerospaceLocation.NOSE,
  AerospaceLocation.LEFT_WING,
  AerospaceLocation.RIGHT_WING,
  AerospaceLocation.AFT,
] as const;
export type AerospaceArmorArcKey = (typeof AEROSPACE_ARMOR_ARC_KEYS)[number];

/** Every label an armor arc can carry, whichever hull prints it. */
export const AEROSPACE_ARC_LABELS = [
  AerospaceLocation.NOSE,
  AerospaceLocation.LEFT_WING,
  AerospaceLocation.RIGHT_WING,
  SmallCraftLocation.LEFT_SIDE,
  SmallCraftLocation.RIGHT_SIDE,
  AerospaceLocation.AFT,
] as const;
export type AerospaceArcLabel = (typeof AEROSPACE_ARC_LABELS)[number];

export interface IAerospaceArmorArc {
  readonly arc: AerospaceArmorArcKey;
  readonly label: AerospaceArcLabel;
}

/**
 * The label for one armor arc. Small craft use MegaMek 48fcb2f64
 * SmallCraft.java LOCATION_NAMES ("Left Side"/"Right Side"); fighters keep the
 * wing names.
 *
 * This is the single owner for the customizer's arc labels and the record
 * sheet's: both import it, so neither restates the strings.
 */
export function getAerospaceArcLabel(
  arc: AerospaceArmorArcKey,
  smallCraft: boolean,
): AerospaceArcLabel {
  if (smallCraft && arc === AerospaceLocation.LEFT_WING)
    return SmallCraftLocation.LEFT_SIDE;
  if (smallCraft && arc === AerospaceLocation.RIGHT_WING)
    return SmallCraftLocation.RIGHT_SIDE;
  return arc;
}

/** The four armor arcs with their labels for one hull, in display order. */
export function getAerospaceArcs(
  smallCraft: boolean,
): readonly IAerospaceArmorArc[] {
  return AEROSPACE_ARMOR_ARC_KEYS.map((arc) => ({
    arc,
    label: getAerospaceArcLabel(arc, smallCraft),
  }));
}
