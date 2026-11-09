import type { AmmoBVPools } from '../battleValueOffensiveTypes';
import type { INativeInfantryClipFacts } from '../equipmentBV/nativeInfantryClipFacts';
import type { VehicleBVInput } from './vehicleBVTypes';

import {
  addBVToAmmoCapGroup,
  projectMechAmmoBVPools,
} from '../battleValueAmmo';
import { getDefensiveEquipmentKind } from '../battleValueEquipment';
import {
  getNativeInfantryClipFacts,
  NATIVE_INFANTRY_CLIP_AMMO,
} from '../equipmentBV/nativeInfantryClipFacts';
import { isOneShotBVWeapon } from '../equipmentBV/weaponHeat';
import {
  getEquipmentEntry,
  normalizeEquipmentId,
} from '../equipmentBVResolver';

interface IVehicleInfantryClip {
  group: string;
  battleValue: number;
  usableShots: number;
}

/** Fresh linked clips only; campaign damage and expended shots are not BV inputs. */
export function initializeVehicleInfantryClip(
  sourceId: string,
  facts: INativeInfantryClipFacts | undefined,
): IVehicleInfantryClip | undefined {
  if (
    !facts?.infantryWeapon ||
    !facts.oneShotAmmoAdmitted ||
    facts.oneShot ||
    facts.ammoType === 'NA' ||
    facts.clipShots <= 0
  )
    return undefined;
  // Entity.java:5145-5165 seeds size 1 before BLKFile.java:377-385 adjusts it.
  // A size <= 1 leaves that seed; larger sizes use Java's integer conversion.
  const size = Number(sourceId.split(/:size:/i)[1] ?? 1);
  const clips = size > 1 ? Math.min(2147483647, Math.trunc(size)) : 1;
  // BLKFile.java:384 multiplies Java ints, including signed overflow.
  const usableShots = Math.imul(facts.clipShots, clips);
  if (
    !Number.isFinite(size) ||
    !Number.isSafeInteger(usableShots) ||
    usableShots <= 0
  )
    return undefined;
  return { ...NATIVE_INFANTRY_CLIP_AMMO, usableShots };
}

/** Resolve identity through the existing catalog owner before native class lookup. */
export function resolveVehicleInfantryClip(
  sourceId: string,
  year?: number,
): IVehicleInfantryClip | undefined {
  const entry = getEquipmentEntry(sourceId);
  return initializeVehicleInfantryClip(
    sourceId,
    entry
      ? getNativeInfantryClipFacts(entry.name, entry.subType, year)
      : getNativeInfantryClipFacts(
          normalizeEquipmentId(sourceId),
          undefined,
          year,
        ),
  );
}

/** Vehicle diagnostic pools, separate from the offensive ammunition arithmetic. */
export function projectVehicleAmmoPools(
  input: VehicleBVInput,
  pools: AmmoBVPools,
  resolveMountBV: (mount: { id: string; bvOverride?: number }) => number,
): Pick<AmmoBVPools, 'available' | 'cap'> {
  // BVCalculator.assembleAmmo also records raw defensive launcher caps.
  // Reuse the shared diagnostic API, whose compatibility name retains Mech.
  const projected = projectMechAmmoBVPools(pools, undefined, undefined, {
    weapons: (input.defensiveEquipment ?? [])
      .filter(
        (entry) =>
          getDefensiveEquipmentKind(entry.id) === 'ams' &&
          !isOneShotBVWeapon(entry.id),
      )
      .map((entry) => ({
        id: entry.id,
        bv: resolveMountBV(entry),
      })),
    bins: [],
  });
  if (input.isSupportVehicle) {
    for (const weapon of input.weapons) {
      const clip = resolveVehicleInfantryClip(weapon.id, input.year);
      if (clip)
        addBVToAmmoCapGroup(projected.available, clip.group, clip.battleValue);
    }
  }
  return projected;
}
