import { getPilotSkillModifier } from '@/types/validation/BattleValue';

import type {
  IAerospaceBVAmmo,
  IAerospaceBVEquipment,
} from './aerospaceBVTypes';

import {
  addBVToAmmoCapGroup,
  getNativeAmmoBVGroup,
  sumCappedAmmoBV,
} from '../battleValueAmmo';
import { calculateAdjustedBV } from '../battleValuePilot';
import { calculateBaseBV, getCockpitModifier } from '../battleValueTotals';
import { isAmmunitionEquipmentId } from '../equipmentBV/catalogLoader';
import { getEquipmentEntry, resolveEquipmentBV } from '../equipmentBVResolver';
import { getAerospaceDefensiveEquipmentKind } from './aerospaceBVEquipment';

export function sumWeaponBV(items: readonly IAerospaceBVEquipment[]): number {
  let total = 0;

  for (const item of items) {
    if (getAerospaceDefensiveEquipmentKind(item.id)) continue;
    const resolved = resolveEquipmentBV(item.id);

    if (resolved.resolved) {
      total += resolved.battleValue;
    }
  }

  return total;
}

/**

 * Cap ammo BV against matching weapon BV, per TechManual.

 * The aerospace calculator reuses the same bucket-by-weapon-type approach

 * as the mech offensive calculator — weapons in ALL arcs count toward the

 * cap, since ammo serves any launcher regardless of firing arc.

 */

export function calculateAerospaceAmmoBV(
  equipment: readonly IAerospaceBVEquipment[],

  ammo: readonly IAerospaceBVAmmo[],
  nativeGroups = false,
): number {
  if (ammo.length === 0) return 0;

  // Bucket weapon BV by normalized equipment id so ammo entries can match.

  const weaponBVByType: Record<string, number> = {};

  for (const item of equipment) {
    if (nativeGroups && (item.isAmmo ?? isAmmunitionEquipmentId(item.id)))
      continue;
    if (getAerospaceDefensiveEquipmentKind(item.id)) continue;
    const resolved = resolveEquipmentBV(item.id);

    if (!resolved.resolved) continue;

    // BVCalculator.java:1190-1240: native ammo type/rack crosses tech bases.
    const entry = nativeGroups ? getEquipmentEntry(item.id) : undefined;
    const key =
      (nativeGroups
        ? (getNativeAmmoBVGroup(item.id) ??
          getNativeAmmoBVGroup(entry?.id ?? '') ??
          getNativeAmmoBVGroup(entry?.name ?? ''))
        : undefined) ?? item.id.toLowerCase();

    addBVToAmmoCapGroup(weaponBVByType, key, resolved.battleValue);
  }

  // Bucket ammo BV by weapon type.

  const ammoBVByType: Record<string, number> = {};

  for (const entry of ammo) {
    if (
      getAerospaceDefensiveEquipmentKind(entry.id) ||
      getAerospaceDefensiveEquipmentKind(entry.weaponType)
    )
      continue;
    const key =
      (nativeGroups
        ? (getNativeAmmoBVGroup(entry.weaponType) ??
          getNativeAmmoBVGroup(entry.id))
        : undefined) ?? entry.weaponType.toLowerCase();

    addBVToAmmoCapGroup(ammoBVByType, key, entry.bv);
  }

  // Cap each bucket at the matching weapon BV total.

  return sumCappedAmmoBV(ammoBVByType, (key) => {
    const weaponBV = weaponBVByType[key] ?? 0;

    return weaponBV === 0 ? undefined : weaponBV;
  });
}

/** Shared crew table with G4/P5 defaults. */
export function getAerospacePilotMultiplier(
  gunnery: number | undefined,
  piloting: number | undefined,
): number {
  const g = gunnery ?? 4;
  const p = piloting ?? 5;
  return getPilotSkillModifier(g, p);
}

export interface IAerospaceFinalOptions {
  readonly gunnery?: number;
  readonly piloting?: number;
  readonly cockpit?: string;
  readonly hasDroneOperatingSystem?: boolean;
}

/** Pinned BVCalculator/Aero summary, then BVCalculator.adjustBV. */
export function calculateAerospaceFinalBV(
  defensive: number,
  offensive: number,
  options: IAerospaceFinalOptions = {},
): {
  baseBV: number;
  pilotMultiplier: number;
  final: number;
  summaryModifier: number;
} {
  const drone = options.hasDroneOperatingSystem;
  const aeroCockpit =
    options.cockpit === 'SMALL' || options.cockpit === 'COMMAND_CONSOLE';
  const summaryFactors = [
    getCockpitModifier(drone ? 'drone-operating-system' : 'standard'),
    getCockpitModifier(
      aeroCockpit ? 'small' : drone ? 'drone-operating-system' : 'standard',
    ),
  ];
  const baseBV = calculateBaseBV(defensive, offensive, summaryFactors);
  // Crew.java:233-234 and BVCalculator.java:1307-1313 default to G4/P5.
  return {
    baseBV,
    summaryModifier: summaryFactors.reduce(
      (product, factor) => product * factor,
      1,
    ),
    pilotMultiplier: getAerospacePilotMultiplier(
      options.gunnery,
      options.piloting,
    ),
    final: calculateAdjustedBV(
      baseBV,
      options.gunnery ?? 4,
      options.piloting ?? 5,
    ),
  };
}

/** Explicit ammunition facts and physical source-bin identity are additive. */
export function isAerospaceAmmo(item: IAerospaceBVEquipment): boolean {
  return item.isAmmo === true || isAmmunitionEquipmentId(item.id);
}
