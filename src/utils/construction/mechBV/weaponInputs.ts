import type { CritScan } from '../../../../scripts/validate-bv-crit-scan';
import type { UnitData } from '../../../../scripts/validate-bv-types';

import {
  applyWeaponPostScanModifiers,
  type WeaponEntry,
} from '../../../../scripts/validate-bv-calculator-weapons';
import {
  isRearLoc,
  normalizeEquipId,
} from '../../../../scripts/validate-bv-normalizers';
import {
  calculatePhysicalWeaponBV,
  getPhysicalWeaponBVHeat,
} from '../../../../scripts/validate-bv-physical-weapons';
import { isClanEquipAtLocation } from '../../../../scripts/validate-bv-unit-derived';
import {
  isDefEquip,
  isWeaponEquip,
  resolveWeaponForUnit,
} from '../../../../scripts/validate-bv-weapon-resolution';
import { normalizeWeaponKey } from '../battleValueAmmo';
import {
  hasBVActuatorEnhancement,
  isDirectFireBVWeapon,
} from '../battleValueWeapons';
import { isOneShotMissileBVWeapon } from '../equipmentBV/weaponHeat';
import { normalizeEquipmentId } from '../equipmentBVResolver';

function matchesMarkedWeapon(
  critName: string,
  id: string,
  aliases = true,
): boolean {
  const norm = normalizeEquipId(id);
  return (
    critName === norm ||
    critName.includes(norm) ||
    norm.includes(critName) ||
    (aliases &&
      (normalizeEquipmentId(critName) === normalizeEquipmentId(id) ||
        critName.split('').sort().join('') === norm.split('').sort().join('')))
  );
}

/** Builds mounted weapon BV inputs without changing the source critical grid. */
export function buildMechBVWeapons(
  unit: UnitData,
  cs: CritScan,
  issues: string[],
): { weapons: WeaponEntry[]; hasTC: boolean } {
  // Weapons
  const weapons: WeaponEntry[] = [];
  const unresolvedWeapons: string[] = [];
  let hasTC = cs.hasTC;

  // Pre-consume rearWeaponCountByLoc for equipment entries with explicit rear locations.
  // This prevents the secondary crit check from incorrectly marking front weapons as rear
  // when a matching rear weapon exists at the same location (e.g., ML front + ML (R) both at LT).
  for (const eq of unit.equipment) {
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
    for (const [critName, count] of Array.from(locRearMap.entries())) {
      if (count > 0 && matchesMarkedWeapon(critName, eq.id, false)) {
        locRearMap.set(critName, count - 1);
        break;
      }
    }
  }

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
    if (isDefEquip(resolveId)) continue;
    if (!isWeaponEquip(resolveId)) continue;

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
        if (locRearMap) {
          for (const [critName, count] of Array.from(locRearMap.entries())) {
            if (count > 0 && matchesMarkedWeapon(critName, eq.id)) {
              thisRear = true;
              locRearMap.set(critName, count - 1);
              break;
            }
          }
        }
      }
      // Turret-mounted detection: (T) suffix in crits — excluded from determineFront
      let thisTurret = false;
      if (unit.criticalSlots) {
        const rawLoc = eq.location.split(',')[0].toUpperCase();
        const locTurretMap = cs.turretWeaponCountByLoc.get(rawLoc);
        if (locTurretMap) {
          for (const [critName, count] of Array.from(locTurretMap.entries())) {
            if (count > 0 && matchesMarkedWeapon(critName, eq.id)) {
              thisTurret = true;
              thisRear = false; // turret weapons are never rear
              locTurretMap.set(critName, count - 1);
              break;
            }
          }
        }
      }

      const weaponLocUpper = eq.location.split(',')[0].toUpperCase();
      const weaponHasAES = hasBVActuatorEnhancement(cs.aesLocs, weaponLocUpper);
      weapons.push({
        id: normalizeWeaponKey(eq.id),
        name: wid,
        heat: res.heat,
        bv: effectiveBV,
        rear: thisRear,
        isTurret: thisTurret,
        hasAES: weaponHasAES,
        isDirectFire: isDirectFireBVWeapon(wid),
        location: eq.location,
      });
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

  applyWeaponPostScanModifiers(unit, cs, weapons, hasTC);

  return { weapons, hasTC };
}
