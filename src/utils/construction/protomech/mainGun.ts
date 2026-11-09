/**
 * ProtoMech Main Gun and arm placement
 *
 * Slot and weight limits per location, the slot classification of a mount and
 * the weapon-legality test, all from the pinned MegaMek verifier:
 *   - TestProtoMek.java:606-629 maxSlotsByLocation
 *   - TestProtoMek.java:651-678 maxWeightByLocation
 *   - TestProtoMek.java:572-585 requiresSlot
 *   - TestProtoMek.java:296-380 hasIllegalEquipmentCombinations
 * (MegaMek 48fcb2f64, MAX_STD_TONNAGE = 9 at line 65.)
 *
 * Main Gun and arm placement includes slot and weight limits. Torso placement
 * includes the armor slot; variable miscellaneous mass remains separate.
 *
 * @spec openspec/changes/establish-all-unit-data-parity/specs/protomech-unit-system/spec.md
 */

import type { ProtoMechLocation } from '@/types/construction/UnitLocation';

import { ProtoLocation } from '@/types/unit/ProtoMechInterfaces';

import { getEquipmentEntry } from '../equipmentBV';
import { getProtoArmorDefinition, isProtoEDPArmorMount } from './armorType';
import { getProtoMountWeight } from './weight';
import { PROTO_MAX_STANDARD_TONNAGE } from './weightClass';

/** The store and the BV adapter name locations with identical strings. */
export type ProtoPlacementLocation = ProtoLocation | ProtoMechLocation;

export interface ProtoEquipmentPlacement {
  equipmentId: string;
  location: ProtoPlacementLocation;
}

/** Detect source/export contents that an absent mount cannot retain upstream. */
export function getProtoMainGunTopologyError(
  hasMainGun: boolean,
  equipmentLocations: readonly string[],
  armor: number,
): string | undefined {
  if (
    !hasMainGun &&
    (armor !== 0 || equipmentLocations.includes(ProtoLocation.MAIN_GUN))
  ) {
    return 'Main Gun equipment or armor requires a main-gun mount';
  }
  return undefined;
}

// =============================================================================
// Location limits
// =============================================================================

/** TestProtoMek.java:65, any ProtoMech above this mass is ultraheavy. */
export function isProtoUltraheavyTonnage(tonnage: number): boolean {
  return tonnage > PROTO_MAX_STANDARD_TONNAGE;
}

const MAIN_GUN: string = ProtoLocation.MAIN_GUN;
const ARMS: readonly string[] = [
  ProtoLocation.LEFT_ARM,
  ProtoLocation.RIGHT_ARM,
];

/**
 * Equipment slots in a location (TestProtoMek.java:606-629). A quad has no arm
 * slots, and a quad that is also ultraheavy has a second Main Gun slot.
 */
export function getProtoLocationSlotLimit(
  location: ProtoPlacementLocation,
  quad: boolean,
  ultra: boolean,
): number {
  if (location === ProtoLocation.TORSO) return (ultra ? 3 : 2) * (quad ? 2 : 1);
  if (location === MAIN_GUN) return quad && ultra ? 2 : 1;
  if (ARMS.includes(location)) return quad ? 0 : 1;
  throw new Error(`Slot limit is not defined for ${location}`);
}

/** TestProtoMek.java:299-349 excludes ArmorType mounts, then adds armor slots. */
export function getProtoArmorSlotErrors(
  tonnage: number,
  quad: boolean,
  armorType: number | undefined,
  placements: readonly ProtoEquipmentPlacement[],
): string[] {
  const armor = getProtoArmorDefinition(armorType);
  if (!armor) return [`Unsupported ProtoMech armor type: ${armorType}`];
  const used =
    armor.torsoSlots +
    placements.filter(
      (mount) =>
        mount.location === ProtoLocation.TORSO &&
        !isProtoEDPArmorMount(mount.equipmentId) &&
        protoMountTakesSlot(mount.equipmentId),
    ).length;
  const limit = getProtoLocationSlotLimit(
    ProtoLocation.TORSO,
    quad,
    isProtoUltraheavyTonnage(tonnage),
  );
  return used > limit
    ? [`Exceeds ${limit} slot limit in Torso (${used} mounted).`]
    : [];
}

/**
 * Tons a location can hold (TestProtoMek.java:651-678). The Main Gun has no
 * weight limit.
 */
export function getProtoLocationWeightLimit(
  location: ProtoPlacementLocation,
  quad: boolean,
  ultra: boolean,
): number {
  if (location === MAIN_GUN) return Infinity;
  if (ARMS.includes(location)) return quad ? 0 : ultra ? 1.0 : 0.5;
  throw new Error(`Weight limit is not defined for ${location}`);
}

// =============================================================================
// Mount classification
// =============================================================================

/**
 * Equipment that takes no slot (TestProtoMek.java:572-585): ammunition,
 * MASC (the myomer booster), UMU, jump jets and the EI interface. Matched on
 * the lowercase id with spaces and punctuation removed so that the BLK name
 * ("Clan Ammo SRM-2 (10)") and the catalog id ("clan-ammo-srm-2") agree.
 */
const NON_SLOT = /ammo|jumpjet|eiinterface|myomerbooster|umu/;

function compact(equipmentId: string): string {
  return equipmentId.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function protoMountTakesSlot(equipmentId: string): boolean {
  return !NON_SLOT.test(compact(equipmentId));
}

export { getProtoMountWeight } from './weight';

/**
 * True only when the catalog describes the weapon and excludes ProtoMechs
 * (TestProtoMek.java:309-313, the F_PROTO_WEAPON test). Most plain catalog
 * entries carry no unit-type list; an absent list is unknown, not illegal.
 */
export function isProtoMechExcludedWeapon(equipmentId: string): boolean {
  const allowed = getEquipmentEntry(equipmentId)?.allowedUnitTypes;
  return allowed !== undefined && !allowed.includes('ProtoMech');
}

// =============================================================================
// Placement check
// =============================================================================

/** Weights are catalog decimals; Java sums doubles, so ties need a tolerance. */
const WEIGHT_EPSILON = 1e-9;

const kg = (tons: number) => Math.round(tons * 1000);

/**
 * Errors for the Main Gun and both arms, worded as the pinned verifier words
 * them, plus any weapon the catalog excludes from ProtoMechs.
 */
export function getProtoPlacementErrors(
  tonnage: number,
  quad: boolean,
  placements: readonly ProtoEquipmentPlacement[],
): string[] {
  const ultra = isProtoUltraheavyTonnage(tonnage);
  const errors: string[] = [];

  for (const { equipmentId } of placements) {
    if (isProtoMechExcludedWeapon(equipmentId)) {
      errors.push(`"${equipmentId}" is not a legal ProtoMech weapon.`);
    }
  }

  for (const location of [
    ProtoLocation.MAIN_GUN,
    ProtoLocation.LEFT_ARM,
    ProtoLocation.RIGHT_ARM,
  ]) {
    const mounts = placements.filter(
      (p) => p.location === location && protoMountTakesSlot(p.equipmentId),
    );
    const slots = getProtoLocationSlotLimit(location, quad, ultra);
    if (mounts.length > slots) {
      errors.push(
        `Exceeds ${slots} slot limit in ${location} (${mounts.length} mounted).`,
      );
    }
    const limit = getProtoLocationWeightLimit(location, quad, ultra);
    const weights = mounts.map((m) => getProtoMountWeight(m.equipmentId));
    const known = weights.filter((w): w is number => w !== undefined);
    const total = known.reduce((sum, w) => sum + w, 0);
    if (total > limit + WEIGHT_EPSILON) {
      errors.push(`Exceeds ${kg(limit)} kg limit in ${location}.`);
    }
  }
  return errors;
}
