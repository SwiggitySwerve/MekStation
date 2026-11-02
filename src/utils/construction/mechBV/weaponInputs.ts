import type { CritScan } from '../../../../scripts/validate-bv-crit-scan';
import type { UnitData } from '../../../../scripts/validate-bv-types';

import { normalizeWeaponKey } from '../../../../scripts/validate-bv-ammo-resolution';
import {
  applyWeaponPostScanModifiers,
  type WeaponEntry,
} from '../../../../scripts/validate-bv-calculator-weapons';
import {
  isRearLoc,
  normalizeEquipId,
} from '../../../../scripts/validate-bv-normalizers';
import { isClanEquipAtLocation } from '../../../../scripts/validate-bv-unit-derived';
import {
  isDefEquip,
  isWeaponEquip,
  resolveWeaponForUnit,
} from '../../../../scripts/validate-bv-weapon-resolution';
import { normalizeEquipmentId } from '../equipmentBVResolver';

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
    const eqNorm = normalizeEquipId(eq.id);
    for (const [critName, count] of Array.from(locRearMap.entries())) {
      if (
        count > 0 &&
        (critName === eqNorm ||
          critName.includes(eqNorm) ||
          eqNorm.includes(critName))
      ) {
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
    const widStripped = wid.replace(/^\d+-/, '');
    const isRocketLauncher =
      wid.includes('rocket-launcher') ||
      wid.includes('rl-') ||
      /^rl\d+$/.test(wid) ||
      widStripped.includes('rocketlauncher') ||
      /^(?:is|cl)rocketlauncher\d+$/.test(widStripped) ||
      /^rl\d+$/.test(widStripped);
    // I-OS (Improved One-Shot), OS (One-Shot), and "one-shot" suffix weapons
    const isIOS =
      /[- ]i-?os$/i.test(widStripped) ||
      /[- ]os$/i.test(widStripped) ||
      widStripped.includes('one-shot');
    const isOneShot = isRocketLauncher || isIOS;
    const effectiveHeat = isOneShot ? res.heat / 4 : res.heat;
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
          const eqNorm = normalizeEquipId(eq.id);
          const eqCanonical = normalizeEquipmentId(eq.id);
          // Sort-insensitive token match: handles word-order mismatches like
          // equipment "improved-heavy-medium-laser" vs crit "CLImprovedMediumHeavyLaser"
          // which normalize to "improvedheavymediumlaser" vs "improvedmediumheavylaser".
          const sortedEqNorm = eqNorm.split('').sort().join('');
          for (const [critName, count] of Array.from(locRearMap.entries())) {
            if (
              count > 0 &&
              (critName === eqNorm ||
                critName.includes(eqNorm) ||
                eqNorm.includes(critName) ||
                normalizeEquipmentId(critName) === eqCanonical ||
                critName.split('').sort().join('') === sortedEqNorm)
            ) {
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
          const eqNorm = normalizeEquipId(eq.id);
          const eqCanonical = normalizeEquipmentId(eq.id);
          const sortedEqNorm = eqNorm.split('').sort().join('');
          for (const [critName, count] of Array.from(locTurretMap.entries())) {
            if (
              count > 0 &&
              (critName === eqNorm ||
                critName.includes(eqNorm) ||
                eqNorm.includes(critName) ||
                normalizeEquipmentId(critName) === eqCanonical ||
                critName.split('').sort().join('') === sortedEqNorm)
            ) {
              thisTurret = true;
              thisRear = false; // turret weapons are never rear
              locTurretMap.set(critName, count - 1);
              break;
            }
          }
        }
      }

      const weaponLocUpper = eq.location.split(',')[0].toUpperCase();
      const weaponHasAES = cs.aesLocs.some(
        (aLoc) => aLoc.toUpperCase() === weaponLocUpper,
      );
      weapons.push({
        id: normalizeWeaponKey(eq.id),
        name: wid,
        heat: effectiveHeat,
        bv: effectiveBV,
        rear: thisRear,
        isTurret: thisTurret,
        hasAES: weaponHasAES,
        isDirectFire:
          !wid.includes('lrm') &&
          !wid.includes('srm') &&
          !wid.includes('mrm') &&
          !wid.includes('atm') &&
          !wid.includes('mml') &&
          !wid.includes('narc') &&
          !wid.includes('inarc') &&
          !wid.includes('lrt') &&
          !wid.includes('srt') &&
          !wid.includes('thunderbolt') &&
          !wid.includes('rocket') &&
          !wid.includes('arrow') &&
          !wid.includes('mortar') &&
          !wid.includes('sniper') &&
          !wid.includes('thumper') &&
          !wid.includes('long-tom') &&
          // Per MegaMek: MGs, Flamers, AMS and TAG do NOT have F_DIRECT_FIRE
          !wid.includes('machine-gun') &&
          !wid.includes('flamer') &&
          !wid.includes('anti-missile') &&
          !wid.includes('ams') &&
          wid !== 'tag' &&
          !wid.includes('light-tag') &&
          !wid.includes('clan-tag'),
        location: eq.location,
      });
    }
  }
  if (unresolvedWeapons.length > 0)
    issues.push(`Unresolved weapons (0 BV): ${unresolvedWeapons.join(', ')}`);

  applyWeaponPostScanModifiers(unit, cs, weapons, hasTC);

  return { weapons, hasTC };
}
