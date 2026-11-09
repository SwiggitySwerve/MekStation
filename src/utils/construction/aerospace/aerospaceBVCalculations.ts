import { getPilotSkillModifier } from '@/types/validation/BattleValue';

import type {
  IAerospaceBVAmmo,
  IAerospaceBVEquipment,
} from './aerospaceBVTypes';

import {
  addBVToAmmoCapGroup,
  getMechDiagnosticAmmoBVGroup,
  getNativeAmmoBVGroup,
  resolveNativeAmmoBin,
  sumCappedAmmoBV,
} from '../battleValueAmmo';
import { getOffensiveBVRole } from '../battleValueEquipment';
import { calculateAdjustedBV } from '../battleValuePilot';
import { calculateBaseBV, getCockpitModifier } from '../battleValueTotals';
import { isAmmunitionEquipmentId } from '../equipmentBV/catalogLoader';
import { isOneShotBVWeapon } from '../equipmentBV/weaponHeat';
import {
  getAmmunitionEntry,
  getEquipmentEntry,
  resolveEquipmentBV,
} from '../equipmentBVResolver';
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

export interface IAerospaceAmmoBVPools {
  readonly total: number;
  readonly available: Readonly<Record<string, number>>;
  readonly cap: Readonly<Record<string, number>>;
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
  return calculateAerospaceAmmoBVPools(equipment, ammo, nativeGroups).total;
}

/** Existing capped total and source-backed native diagnostics before FCS/speed.
 * Supplemental native identities affect diagnostics only, never ammo arithmetic.
 * @spec establish-all-unit-data-parity: Aerospace ammunition diagnostics
 */
export function calculateAerospaceAmmoBVPools(
  equipment: readonly IAerospaceBVEquipment[],
  ammo: readonly IAerospaceBVAmmo[],
  nativeGroups = false,
): IAerospaceAmmoBVPools {
  // Bucket weapon BV by normalized equipment id so ammo entries can match.

  const weaponBVByType: Record<string, number> = {};
  const available: Record<string, number> = {};
  const cap: Record<string, number> = {};
  const supplementalAvailable: Record<string, number> = {};

  for (const item of equipment) {
    if (nativeGroups && (item.isAmmo ?? isAmmunitionEquipmentId(item.id)))
      continue;
    const resolved = resolveEquipmentBV(item.id);

    if (!resolved.resolved) continue;

    // BVCalculator.java:1190-1240: native ammo type/rack crosses tech bases.
    const entry = nativeGroups ? getEquipmentEntry(item.id) : undefined;
    // Some native zero-BV bins arrive as miscellaneous equipment. Retain only
    // a usable physical bin confirmed by its existing ammunition catalog entry.
    const binEntry = entry ? getAmmunitionEntry(entry.name) : undefined;
    const bin = binEntry
      ? resolveNativeAmmoBin(item.id.replace(/^[^:]+/, binEntry.id))
      : undefined;
    const binGroup = binEntry
      ? getMechDiagnosticAmmoBVGroup(binEntry.id)
      : undefined;
    if (binGroup && binEntry?.battleValue === 0 && bin && bin.shots > 0)
      addBVToAmmoCapGroup(
        supplementalAvailable,
        binGroup,
        binEntry.battleValue,
      );
    // Reuse the shared diagnostic identities, including primitive AC and AMS;
    // they must not expand the compatibility groups used by the numeric API.
    const nativeGroup = nativeGroups
      ? (getNativeAmmoBVGroup(item.id) ??
        getNativeAmmoBVGroup(entry?.id ?? '') ??
        getNativeAmmoBVGroup(entry?.name ?? ''))
      : undefined;
    const diagnosticGroup = nativeGroups
      ? (getMechDiagnosticAmmoBVGroup(item.id) ?? nativeGroup)
      : undefined;
    if (
      diagnosticGroup &&
      ![item.id, entry?.id ?? '', entry?.name ?? ''].some(isOneShotBVWeapon) &&
      Number.isFinite(resolved.battleValue) &&
      resolved.battleValue >= 0
    )
      addBVToAmmoCapGroup(cap, diagnosticGroup, resolved.battleValue);
    if (getAerospaceDefensiveEquipmentKind(item.id)) continue;
    const key = nativeGroup ?? item.id.toLowerCase();

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
    const nativeGroup = nativeGroups
      ? (getNativeAmmoBVGroup(entry.weaponType) ??
        getNativeAmmoBVGroup(entry.id))
      : undefined;
    const diagnosticGroup = nativeGroups
      ? (getMechDiagnosticAmmoBVGroup(entry.id) ??
        getMechDiagnosticAmmoBVGroup(entry.weaponType) ??
        nativeGroup)
      : undefined;
    if (diagnosticGroup)
      addBVToAmmoCapGroup(available, diagnosticGroup, entry.bv);
    const key = nativeGroup ?? entry.weaponType.toLowerCase();

    addBVToAmmoCapGroup(ammoBVByType, key, entry.bv);
  }
  for (const [group, value] of Object.entries(supplementalAvailable))
    if (!Object.hasOwn(available, group)) available[group] = value;

  // Cap each bucket at the matching weapon BV total.

  const total = sumCappedAmmoBV(ammoBVByType, (key) => {
    const weaponBV = weaponBVByType[key] ?? 0;

    return weaponBV === 0 ? undefined : weaponBV;
  });
  return { total, available, cap };
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

/** BVCalculator.java:990-1038: positive offensive misc stays outside arcs. */
export function isAerospaceOffensiveMisc(item: IAerospaceBVEquipment): boolean {
  return (
    !isAerospaceAmmo(item) &&
    !getAerospaceDefensiveEquipmentKind(item.id) &&
    getOffensiveBVRole(item.id) === 'equipment' &&
    resolveEquipmentBV(item.id).battleValue > 0
  );
}
