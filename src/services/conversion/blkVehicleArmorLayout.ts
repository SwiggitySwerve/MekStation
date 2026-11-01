/**
 * Per-location armor for BLK combat and support vehicles, in MegaMek's layout.
 *
 * The `<armor>` array is positional and its meaning depends on the Java class
 * the loader builds, so the layout is chosen the way the loaders choose it:
 * - Tank, Naval, Hydrofoil and Surface (all loaded by BLKTankFile,
 *   `MekFileParser.java:233`):
 *   six-side SuperHeavyTank above the motion weight limit
 *   (`BLKTankFile.java:94-123`), otherwise Front, Right, Left, Rear and up to
 *   two turrets (4-6 values, `BLKTankFile.java:181-186`);
 * - SupportTank: ordinary layout (`BLKSupportTankFile.java:119-126`);
 * - LargeSupportTank: six-side layout (`BLKLargeSupportTankFile.java:122-129`);
 * - VTOL, SupportVTOL: Front, Right, Left, Rear, Rotor, optional chin Turret
 *   (`BLKVTOLFile.java:127-133`, `BLKSupportVTOLFile.java:119-125`).
 * A length the loader rejects ("Incorrect armor array length") or a unit type
 * with no layout here gives undefined.
 */

import { VehicleLocation } from '@/types/construction/UnitLocation';
import {
  BLK_DUAL_TURRET_ARMOR_LOCATIONS,
  BLK_SUPERHEAVY_ARMOR_LOCATIONS,
  BLK_VTOL_ARMOR_LOCATIONS,
} from '@/types/formats/BlkFormat';

/**
 * Armor names the dual-turret pair Turret / Turret 2; equipment blocks name the
 * same two locations Rear Turret / Front Turret (`Tank.java:127-130`: LOC_TURRET
 * is the rear turret, LOC_TURRET_2 the front one; `BLKTankFile.java:219-220,
 * 233-234` loads the blocks into them). Neither block is rear-facing.
 */
const EQUIPMENT_BLOCK_TO_ARMOR_KEY: Readonly<Record<string, string>> = {
  'rear turret': VehicleLocation.TURRET,
  'front turret': VehicleLocation.TURRET_2,
};

/**
 * The armor location an equipment block name (`Rear Turret` from
 * `<Rear Turret Equipment>`) loads into. MegaMek finds a block in any letter
 * case (`BuildingBlock.java:148,184`), so the lookup does too.
 */
export function blkEquipmentBlockLocation(blockName: string): string {
  return EQUIPMENT_BLOCK_TO_ARMOR_KEY[blockName.toLowerCase()] ?? blockName;
}

/** Heaviest weight a motion type can carry before MegaMek builds a SuperHeavyTank. */
const SUPERHEAVY_ABOVE_TONS: Readonly<Record<string, number>> = {
  hover: 50,
  naval: 300,
  submarine: 300,
  tracked: 100,
  wheeled: 80,
  wige: 80,
  glider: 80, // EntityMovementMode.parseFromString alias of WiGE
};

/** MegaMek builds a SuperHeavyTank above these weights (`BLKTankFile.java:94-123`). */
export function isSuperHeavyTank(
  motionType: string | undefined,
  tonnage: number,
): boolean {
  const limit = SUPERHEAVY_ABOVE_TONS[(motionType ?? '').toLowerCase()];
  return limit !== undefined && tonnage > limit;
}

interface ArmorLayout {
  readonly locations: readonly string[];
  /** Accepted `<armor>` lengths, inclusive (the loaders' "Incorrect armor array length"). */
  readonly lengths: readonly [number, number];
}

const STANDARD: ArmorLayout = {
  locations: BLK_DUAL_TURRET_ARMOR_LOCATIONS,
  lengths: [4, 6],
};
const SIX_SIDE: ArmorLayout = {
  locations: BLK_SUPERHEAVY_ARMOR_LOCATIONS,
  lengths: [6, 8],
};
const ROTOR: ArmorLayout = {
  locations: BLK_VTOL_ARMOR_LOCATIONS,
  lengths: [5, 6],
};

function layoutFor(
  blkUnitType: string,
  motionType: string | undefined,
  tonnage: number,
): ArmorLayout | undefined {
  switch (blkUnitType) {
    case 'LargeSupportTank':
      return SIX_SIDE;
    case 'Tank':
    case 'Naval':
    case 'Hydrofoil':
    case 'Surface':
      return isSuperHeavyTank(motionType, tonnage) ? SIX_SIDE : STANDARD;
    case 'SupportTank':
      return STANDARD;
    case 'VTOL':
    case 'SupportVTOL':
      return ROTOR;
    default:
      return undefined;
  }
}

const accepts = (layout: ArmorLayout, length: number) =>
  length >= layout.lengths[0] && length <= layout.lengths[1];

export function resolveBlkVehicleArmor(
  blkUnitType: string,
  motionType: string | undefined,
  tonnage: number,
  armor: readonly number[],
): Readonly<Record<string, number>> | undefined {
  const layout = layoutFor(blkUnitType, motionType, tonnage);
  if (!layout || !accepts(layout, armor.length)) return undefined;
  return Object.fromEntries(
    armor.map((value, index) => [layout.locations[index], value]),
  );
}

const lengthMessage = (length: number) =>
  `Incorrect armor array length (${length} values): MegaMek refuses to load it`;

/**
 * The error for an `<armor>` array the loader refuses, undefined when it is
 * accepted. The unit still loads for inspection; its validation reports this.
 */
export function blkVehicleArmorLengthError(
  blkUnitType: string,
  motionType: string | undefined,
  tonnage: number,
  armor: readonly number[],
): string | undefined {
  const layout = layoutFor(blkUnitType, motionType, tonnage);
  return layout && !accepts(layout, armor.length)
    ? lengthMessage(armor.length)
    : undefined;
}

/**
 * Armor from an array MegaMek refuses to load, placed in the unit type's
 * layout order so the unit can still be inspected. Values past the layout's
 * last location are named in the warning and left out; the caller keeps the
 * whole source array.
 */
export function placeRejectedBlkVehicleArmor(
  blkUnitType: string,
  motionType: string | undefined,
  tonnage: number,
  armor: readonly number[],
): { byLocation: Readonly<Record<string, number>>; warning: string } {
  const locations = (layoutFor(blkUnitType, motionType, tonnage) ?? STANDARD)
    .locations;
  const extra = armor.slice(locations.length);
  return {
    byLocation: Object.fromEntries(
      armor.slice(0, locations.length).map((v, i) => [locations[i], v]),
    ),
    warning:
      `${lengthMessage(armor.length)}, ` +
      `so the values are placed ${locations.join(', ')} in order` +
      (extra.length > 0
        ? `; the extra values ${extra.join(', ')} are not placed (see armor)`
        : ''),
  };
}
