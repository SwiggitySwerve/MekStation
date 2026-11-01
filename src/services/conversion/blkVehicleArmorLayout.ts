/**
 * Per-location armor for BLK combat and support vehicles, in MegaMek's layout.
 *
 * The `<armor>` array is positional and its meaning depends on the Java class
 * the loader builds, so the layout is chosen the way the loaders choose it:
 * - Tank and Naval (both loaded by BLKTankFile, `MekFileParser.java:233`):
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
  'Rear Turret': VehicleLocation.TURRET,
  'Front Turret': VehicleLocation.TURRET_2,
};

/** The armor location an equipment block name (`Rear Turret` from `<Rear Turret Equipment>`) loads into. */
export function blkEquipmentBlockLocation(blockName: string): string {
  return EQUIPMENT_BLOCK_TO_ARMOR_KEY[blockName] ?? blockName;
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

export function resolveBlkVehicleArmor(
  blkUnitType: string,
  motionType: string | undefined,
  tonnage: number,
  armor: readonly number[],
): Readonly<Record<string, number>> | undefined {
  const layout = layoutFor(blkUnitType, motionType, tonnage);
  if (!layout) return undefined;
  const [min, max] = layout.lengths;
  if (armor.length < min || armor.length > max) return undefined;
  return Object.fromEntries(
    armor.map((value, index) => [layout.locations[index], value]),
  );
}
