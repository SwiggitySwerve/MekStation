import type { MechLocation } from '../src/utils/construction/battleValueCalculations';
import type { CritScan } from './validate-bv-crit-scan-types';

import { resolveAmmoBV } from '../src/utils/construction/equipmentBVResolver';
import {
  normalizeWeaponKey,
  resolveAmmoByPattern,
} from './validate-bv-ammo-resolution';

export function processCritAmmoSlot(args: {
  r: CritScan;
  clean: string;
  lo: string;
  loc: string;
  ml: MechLocation | null;
  unitTechBase: string;
}): void {
  const { r, clean, lo, loc, ml, unitTechBase } = args;
  // Ammo
  if (lo.includes('ammo') && !lo.includes('ammo feed')) {
    // Per MegaMek AmmoType.java: Gauss-type ammo (including HAG) is non-explosive.
    // HAG crit names like "CLHAG20 Ammo" don't contain "gauss", so check 'hag' separately.
    // SB Gauss abbreviated crit name "ISSBGR Ammo" also lacks "gauss".
    const isNonExplosiveAmmo =
      lo.includes('gauss') ||
      lo.includes('hag') ||
      lo.includes('sbgr') ||
      lo.includes('magshot') ||
      lo.includes('plasma') ||
      lo.includes('fluid') ||
      lo.includes('nail') ||
      lo.includes('rivet') ||
      lo.includes('c3') ||
      lo.includes('sensor') ||
      lo.includes('rail gun');
    if (ml && !isNonExplosiveAmmo)
      r.explosive.push({
        location: ml,
        slots: 1,
        penaltyCategory: 'standard',
      });
    // Half-ton ammo bins (crit names like "IS Machine Gun Ammo - Half") get half BV.
    // The lookup/pattern resolution returns the full-ton BV; we halve it here for half-ton bins.
    const isHalfTonAmmo = lo.includes('half');
    const pr = resolveAmmoByPattern(clean, unitTechBase);
    if (pr && pr.bv > 0) {
      r.ammo.push({
        id: clean,
        bv: isHalfTonAmmo ? pr.bv * 0.5 : pr.bv,
        weaponType: pr.weaponType,
        location: loc,
      });
    } else {
      const ar = resolveAmmoBV(clean);
      if (ar.resolved && ar.battleValue > 0) {
        r.ammo.push({
          id: clean,
          bv: isHalfTonAmmo ? ar.battleValue * 0.5 : ar.battleValue,
          weaponType: normalizeWeaponKey(ar.weaponType),
          location: loc,
        });
      } else if (pr) {
        r.ammo.push({
          id: clean,
          bv: isHalfTonAmmo ? pr.bv * 0.5 : pr.bv,
          weaponType: pr.weaponType,
          location: loc,
        });
      }
    }
    // AMS/APDS ammo — accumulate BV for defensive equipment (capped at AMS weapon BV)
    const isAmsAmmo =
      (lo.includes('ams') ||
        lo.includes('anti-missile') ||
        lo.includes('antimissile')) &&
      lo.includes('ammo');
    const isApdsAmmo = lo.includes('apds') && lo.includes('ammo');
    if (isAmsAmmo || isApdsAmmo) {
      // IS AMS ammo = 11 BV, Clan AMS ammo = 22 BV, APDS ammo = 22 BV
      let amsAmmoVal: number;
      if (isApdsAmmo) {
        amsAmmoVal = 22;
      } else if (lo.includes('cl') || unitTechBase === 'CLAN') {
        amsAmmoVal = 22;
      } else {
        amsAmmoVal = 11;
      }
      // Half-ton AMS/APDS ammo bins also get half BV
      if (isHalfTonAmmo) amsAmmoVal *= 0.5;
      r.amsAmmoBV += amsAmmoVal;
    }
  }
}
