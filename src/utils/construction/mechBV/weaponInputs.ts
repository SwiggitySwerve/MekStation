import type { CritScan } from '../../../../scripts/validate-bv-crit-scan';
import type {
  UnitData,
  ValidationResult,
} from '../../../../scripts/validate-bv-types';
import type { OffensiveBVConfig } from '../battleValueOffensiveTypes';

import {
  applyWeaponPostScanModifiers,
  type WeaponEntry,
} from '../../../../scripts/validate-bv-calculator-weapons';
import { consumeCritWeaponMount } from '../../../../scripts/validate-bv-crit-weapon-mounts';
import {
  isRearLoc,
  normalizeEquipId,
} from '../../../../scripts/validate-bv-normalizers';
import {
  calculatePhysicalWeaponBV,
  getPhysicalWeaponBVHeat,
} from '../../../../scripts/validate-bv-physical-weapons';
import {
  countISEquipTokensAtLocation,
  isClanEquipAtLocation,
} from '../../../../scripts/validate-bv-unit-derived';
import {
  isDefEquip,
  isWeaponEquip,
  resolveWeaponForUnit,
} from '../../../../scripts/validate-bv-weapon-resolution';
import {
  calculateAmmoBVPools,
  getMechDiagnosticAmmoBVGroup,
  getNativeAmmoBVGroup,
  normalizeWeaponKey,
  projectMechAmmoBVPools,
} from '../battleValueAmmo';
import {
  hasBVActuatorEnhancement,
  isDirectFireBVWeapon,
} from '../battleValueWeapons';
import {
  isOneShotBVWeapon,
  isOneShotMissileBVWeapon,
} from '../equipmentBV/weaponHeat';
import { getEquipmentEntry } from '../equipmentBVResolver';

/** Builds mounted weapon BV inputs without changing the source critical grid. */
export function buildMechBVWeapons(
  unit: UnitData,
  cs: CritScan,
  issues: string[],
): {
  weapons: WeaponEntry[];
  hasTC: boolean;
  ammoCapWeapons: NonNullable<OffensiveBVConfig['ammoCapWeapons']>;
  ammoCapProjectionWeapons?: NonNullable<OffensiveBVConfig['ammoCapWeapons']>;
  ammoDiagnosticCapWeapons?: NonNullable<OffensiveBVConfig['ammoCapWeapons']>;
} {
  // Weapons
  const weapons: WeaponEntry[] = [];
  const ammoDiagnosticCapWeapons: { id: string; bv: number }[] = [];
  const recordDiagnosticCap = (id: string, bv: number, resolved: boolean) => {
    if (
      resolved &&
      Number.isFinite(bv) &&
      bv >= 0 &&
      !isOneShotBVWeapon(id) &&
      getMechDiagnosticAmmoBVGroup(id)
    )
      ammoDiagnosticCapWeapons.push({ id, bv });
  };
  const torpedoSourceIds = new Map<WeaponEntry, string>();
  const unresolvedWeapons: string[] = [];
  let hasTC = cs.hasTC;

  // Pre-consume rearWeaponCountByLoc for equipment entries with explicit rear locations.
  // This prevents the secondary crit check from incorrectly marking front weapons as rear
  // when a matching rear weapon exists at the same location (e.g., ML front + ML (R) both at LT).
  for (const eq of unit.equipment) {
    if (eq.category !== undefined && !isWeaponEquip(eq.id, eq.category))
      continue;
    if (!isRearLoc(eq.location)) continue;
    // Strip rear marker to get the base location (e.g., "LEFT_TORSO_(R)" → "LEFT_TORSO")
    const rawLoc = eq.location
      .split(',')[0]
      .toUpperCase()
      .replace(/[_(]R[)]/gi, '')
      .replace(/_$/, '')
      .replace(/\s*REAR\s*/i, '')
      .trim();
    const locRearMap = cs.rearWeaponCountByLoc.get(rawLoc);
    if (!locRearMap) continue;
    consumeCritWeaponMount(locRearMap, eq.id);
  }

  const isMountsLeft = new Map<string, number>();
  for (const eq of unit.equipment) {
    // Strip numeric prefix from equipment ID (e.g., "1-iseherppc" → "iseherppc")
    const qtyMatch = eq.id.match(/^(\d+)-/);
    const qty =
      qtyMatch && parseInt(qtyMatch[1], 10) > 1 ? parseInt(qtyMatch[1], 10) : 1;
    const resolveId = qtyMatch ? eq.id.replace(/^\d+-/, '') : eq.id;

    const lo = resolveId.toLowerCase();
    if (
      lo.includes('targeting-computer') ||
      lo.includes('targeting computer')
    ) {
      hasTC = true;
      continue;
    }
    if (lo.includes('tsm') || lo.includes('triple-strength-myomer')) continue;
    if (isDefEquip(resolveId)) {
      if (
        getMechDiagnosticAmmoBVGroup(resolveId) &&
        isWeaponEquip(resolveId, eq.category)
      ) {
        const res = resolveWeaponForUnit(resolveId, unit.techBase);
        for (let i = 0; i < qty; i++)
          recordDiagnosticCap(resolveId, res.battleValue, res.resolved);
      }
      continue;
    }
    if (!isWeaponEquip(resolveId, eq.category)) continue;

    let clanDetected =
      unit.techBase === 'MIXED' &&
      isClanEquipAtLocation(resolveId, eq.location, unit.criticalSlots);
    // Fallback: if crit data is missing for this location (e.g., quad leg weapons),
    // scan ALL crit locations for a matching CL-prefixed entry of this weapon.
    if (!clanDetected && unit.techBase === 'MIXED' && unit.criticalSlots) {
      const locKey = eq.location.split(',')[0].toUpperCase();
      const hasLocCrits =
        !!unit.criticalSlots[locKey] || !!unit.criticalSlots[eq.location];
      if (!hasLocCrits) {
        // Location crits missing — check all locations globally
        for (const loc of Object.keys(unit.criticalSlots)) {
          if (isClanEquipAtLocation(resolveId, loc, unit.criticalSlots)) {
            clanDetected = true;
            break;
          }
        }
      }
    }
    // MtfFile.java:1052 (48fcb2f6) builds one mount per crit token, so a location
    // that also names the IS side (ISERMediumLaser beside CLERMediumLaser) keeps
    // that many of its list entries IS.
    if (clanDetected) {
      const key = `${eq.location}|${normalizeEquipId(resolveId)}`;
      const isMounts =
        isMountsLeft.get(key) ??
        Math.floor(
          countISEquipTokensAtLocation(
            resolveId,
            eq.location,
            unit.criticalSlots,
          ) / (getEquipmentEntry(resolveId)?.criticalSlots || 1),
        );
      if (isMounts > 0) clanDetected = false;
      isMountsLeft.set(key, Math.max(0, isMounts - 1));
    }
    const res = resolveWeaponForUnit(resolveId, unit.techBase, clanDetected);
    if (!res.resolved || res.battleValue === 0) unresolvedWeapons.push(eq.id);

    const wid = eq.id.toLowerCase();
    const isIOS = isOneShotMissileBVWeapon(eq.id);

    // IOS weapons use 1/5 of base weapon BV (aliases must point to BASE weapon entries)
    const effectiveBV = isIOS
      ? Math.round(res.battleValue / 5.0)
      : res.battleValue;

    const isRear = isRearLoc(eq.location);

    for (let i = 0; i < qty; i++) {
      let thisRear = isRear;
      if (!thisRear && unit.criticalSlots) {
        const rawLoc = eq.location.split(',')[0].toUpperCase();
        const locRearMap = cs.rearWeaponCountByLoc.get(rawLoc);
        thisRear = consumeCritWeaponMount(locRearMap, eq.id);
      }
      // Turret-mounted detection: (T) suffix in crits — excluded from determineFront
      let thisTurret = false;
      if (unit.criticalSlots) {
        const rawLoc = eq.location.split(',')[0].toUpperCase();
        const locTurretMap = cs.turretWeaponCountByLoc.get(rawLoc);
        if (consumeCritWeaponMount(locTurretMap, eq.id)) {
          thisTurret = true;
          thisRear = false;
        }
      }

      const weaponLocUpper = eq.location.split(',')[0].toUpperCase();
      const weaponHasAES = hasBVActuatorEnhancement(cs.aesLocs, weaponLocUpper);
      const weapon: WeaponEntry = {
        id: normalizeWeaponKey(eq.id),
        name: wid,
        heat: res.heat,
        bv: effectiveBV,
        rear: thisRear,
        isTurret: thisTurret,
        hasAES: weaponHasAES,
        isDirectFire: isDirectFireBVWeapon(wid),
        location: eq.location,
      };
      weapons.push(weapon);
      recordDiagnosticCap(resolveId, effectiveBV, res.resolved);
      // Diagnostic identity only: retain the compatibility id used by arithmetic.
      const nativeGroup = getNativeAmmoBVGroup(resolveId);
      if (res.resolved && /^(?:LRM|SRM)_TORPEDO:/.test(nativeGroup ?? ''))
        torpedoSourceIds.set(weapon, resolveId);
    }
  }
  // HeatTrackingBVCalculator.java:89-103 (48fcb2f64): active blades share
  // the sorted weapon heat budget, including mounted AES but no TC bonus.
  for (const physical of cs.physicalWeapons) {
    const heat = getPhysicalWeaponBVHeat(physical.type);
    if (heat === 0) continue;
    weapons.push({
      id: physical.type,
      name: physical.type,
      heat,
      bv: calculatePhysicalWeaponBV(physical.type, unit.tonnage, cs.hasTSM),
      location: physical.location,
      rear: false,
      isTurret: false,
      hasAES: hasBVActuatorEnhancement(cs.aesLocs, physical.location),
      isDirectFire: false,
    });
  }
  if (unresolvedWeapons.length > 0)
    issues.push(`Unresolved weapons (0 BV): ${unresolvedWeapons.join(', ')}`);

  // BVCalculator.java:1230 (48fcb2f64): F_ONE_SHOT weapons supply no ammo cap.
  const capMounts = weapons.filter(({ name }) => !isOneShotBVWeapon(name));
  const ammoCapWeapons = capMounts.map(({ id, bv }) => ({ id, bv }));
  const ammoCapProjectionWeapons = capMounts.some((w) =>
    torpedoSourceIds.has(w),
  )
    ? capMounts.map((w) => ({ id: torpedoSourceIds.get(w) ?? w.id, bv: w.bv }))
    : undefined;
  applyWeaponPostScanModifiers(unit, cs, weapons, hasTC);

  return {
    weapons,
    hasTC,
    ammoCapWeapons,
    ...(ammoCapProjectionWeapons && { ammoCapProjectionWeapons }),
    ...(ammoDiagnosticCapWeapons.length > 0 && { ammoDiagnosticCapWeapons }),
  };
}

/** Plain weapon inputs for the shared offensive calculator. */
export function buildMechBVOffensiveInputs(
  unit: UnitData,
  cs: CritScan,
  issues: string[],
): Pick<
  OffensiveBVConfig,
  'weapons' | 'ammoCapWeapons' | 'hasTargetingComputer'
> & {
  ammoProjection?: Pick<
    NonNullable<ValidationResult['breakdown']>,
    | 'ammoCapProjectionWeapons'
    | 'ammoAvailableProjectionBins'
    | 'ammoDiagnosticPools'
  >;
} {
  const {
    weapons,
    hasTC,
    ammoCapWeapons,
    ammoCapProjectionWeapons,
    ammoDiagnosticCapWeapons,
  } = buildMechBVWeapons(unit, cs, issues);
  const diagnosticBins = [...cs.ammo, ...(cs.ammoDiagnosticBins ?? [])].filter(
    ({ id }) => getMechDiagnosticAmmoBVGroup(id),
  );
  const ammoDiagnosticPools =
    ammoDiagnosticCapWeapons || diagnosticBins.length
      ? projectMechAmmoBVPools(
          calculateAmmoBVPools(ammoCapWeapons, cs.ammo),
          ammoCapProjectionWeapons,
          cs.ammoAvailableProjectionBins,
          { weapons: ammoDiagnosticCapWeapons ?? [], bins: diagnosticBins },
        )
      : undefined;
  const ammoProjection = {
    ...(ammoCapProjectionWeapons && { ammoCapProjectionWeapons }),
    ...(cs.ammoAvailableProjectionBins && {
      ammoAvailableProjectionBins: cs.ammoAvailableProjectionBins,
    }),
    ...(ammoDiagnosticPools && { ammoDiagnosticPools }),
  };
  return {
    weapons,
    ammoCapWeapons,
    hasTargetingComputer: hasTC,
    ...(Object.keys(ammoProjection).length > 0 && { ammoProjection }),
  };
}
