import type { MechLocation } from '@/utils/construction/battleValueCalculations';

import {
  getMechDiagnosticAmmoBVGroup,
  getNativeAmmoBVGroup,
  normalizeMechBVSourceName,
  resolveNativeAmmoBin,
} from '@/utils/construction/battleValueAmmo';
import { isNonExplosiveAmmo } from '@/utils/construction/battleValueExplosivePenalties';
import {
  getAmmunitionEntry,
  resolveAmmoBV,
} from '@/utils/construction/equipmentBVResolver';

import type { CritScan } from './critScanTypes';

import { normalizeWeaponKey, resolveAmmoByPattern } from './ammoResolution';

export function processCritAmmoSlot(args: {
  r: CritScan;
  clean: string;
  lo: string;
  loc: string;
  ml: MechLocation | null;
  unitTechBase: string;
}): void {
  const { r, clean, lo, loc, ml, unitTechBase } = args;
  // Legacy NARC facts retain raw source ids; supplemental facts use the shared
  // qualifier cleanup. Both retain the same real, usable, resolved-zero guard.
  const legacyNarc = ['NARC:1', 'INARC:1'].includes(
    getNativeAmmoBVGroup(clean) ?? '',
  );
  const diagnosticId = legacyNarc ? clean : normalizeMechBVSourceName(clean);
  if (legacyNarc || getMechDiagnosticAmmoBVGroup(diagnosticId)) {
    const ammo = resolveAmmoBV(diagnosticId);
    const bin = resolveNativeAmmoBin(diagnosticId);
    if (ammo.resolved && ammo.battleValue === 0 && bin && bin.shots > 0) {
      const fact = {
        id: diagnosticId,
        bv: ammo.battleValue,
        weaponType: ammo.weaponType,
        location: loc,
      };
      const facts = legacyNarc
        ? (r.ammoAvailableProjectionBins ??= [])
        : (r.ammoDiagnosticBins ??= []);
      facts.push(fact);
    }
  }
  // Ammo
  if (lo.includes('ammo') && !lo.includes('ammo feed')) {
    // Per MegaMek AmmoType.java: Gauss-type ammo (including HAG) is non-explosive.
    // HAG crit names like "CLHAG20 Ammo" don't contain "gauss", so check 'hag' separately.
    // SB Gauss abbreviated crit name "ISSBGR Ammo" also lacks "gauss".
    if (ml && !isNonExplosiveAmmo(lo))
      r.explosive.push({
        location: ml,
        slots: 1,
        penaltyCategory: 'standard',
      });
    // Half-ton ammo bins (crit names like "IS Machine Gun Ammo - Half") get half BV.
    // The lookup/pattern resolution returns the full-ton BV; we halve it here for half-ton bins.
    // A record that is itself the half-ton bin (0.5 t, BV 0.5, as pinned Java
    // defines the half-ton MG types) already carries the half-ton BV: do not halve twice.
    const isHalfTonAmmo = lo.includes('half');
    const record = getAmmunitionEntry(clean.replace(/\s*\(omnipod\)/gi, ''));
    const binScale =
      isHalfTonAmmo && !(record?.weight === 0.5 && record.battleValue === 0.5)
        ? 0.5
        : 1;
    const pr = resolveAmmoByPattern(clean, unitTechBase);
    if (pr && pr.bv > 0) {
      r.ammo.push({
        id: clean,
        bv: pr.bv * binScale,
        weaponType: pr.weaponType,
        location: loc,
      });
    } else {
      const ar = resolveAmmoBV(clean);
      if (ar.resolved && ar.battleValue > 0) {
        r.ammo.push({
          id: clean,
          bv: ar.battleValue * binScale,
          weaponType: normalizeWeaponKey(ar.weaponType),
          location: loc,
        });
      } else if (pr) {
        r.ammo.push({
          id: clean,
          bv: pr.bv * binScale,
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
