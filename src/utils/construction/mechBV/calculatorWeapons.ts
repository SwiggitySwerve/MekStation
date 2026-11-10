import { applyWeaponBVModifiers } from '@/utils/construction/battleValueHeatTracking';
import { getWeaponLinkBVMultiplier } from '@/utils/construction/equipmentBV/resolution';

import type { CritScan } from './critScan';
import type { UnitData } from './types';

import { applyMechMachineGunArrays } from './machineGunArrays';
import { toMechLoc } from './normalizers';
import { isArmLoc } from './unitDerived';

export type WeaponEntry = {
  id: string;
  name: string;
  heat: number;
  bv: number;
  rear?: boolean;
  isTurret?: boolean;
  hasAES?: boolean;
  isDirectFire?: boolean;
  location: string;
  artemisType?: 'iv' | 'v';
  riscLPMApplied?: boolean;
};

export function applyWeaponPostScanModifiers(
  unit: UnitData,
  cs: CritScan,
  weapons: WeaponEntry[],
  hasTC: boolean,
): void {
  applyMechMachineGunArrays(unit, weapons);

  // Drone Operating System: all weapon BVs × 0.8 (MegaMek processWeapons dBV *= 0.8)
  if (cs.detectedDroneOS) {
    for (const w of weapons) {
      w.bv *= 0.8;
    }
  }

  // Note: Shields do NOT halve weapon BV in MegaMek's BVCalculator.
  // Shield arm tracking (cs.shieldArms) is kept for potential future use, but
  // weapons in shield arms are counted at full BV per the MegaMek source code.

  // Artemis IV/V — location-aware assignment (Artemis links to missile weapon in same location)
  if (cs.artemisIVLocs.length > 0 || cs.artemisVLocs.length > 0) {
    const ivLocs = [...cs.artemisIVLocs];
    const vLocs = [...cs.artemisVLocs];
    for (const w of weapons) {
      const isMsl =
        w.name.includes('lrm') ||
        w.name.includes('srm') ||
        w.name.includes('mml') ||
        w.name.includes('atm') ||
        w.name.includes('lrt') ||
        w.name.includes('srt');
      if (!isMsl) continue;
      const wLoc = toMechLoc(w.location.split(',')[0]);
      if (!wLoc) continue;
      const vIdx = vLocs.indexOf(wLoc);
      if (vIdx >= 0) {
        w.artemisType = 'v';
        vLocs.splice(vIdx, 1);
      } else {
        const ivIdx = ivLocs.indexOf(wLoc);
        if (ivIdx >= 0) {
          w.artemisType = 'iv';
          ivLocs.splice(ivIdx, 1);
        }
      }
    }
  }

  if (cs.apollo > 0) {
    let a = cs.apollo;
    for (const w of weapons) {
      if (a <= 0) break;
      if (w.name.includes('mrm')) {
        w.bv *= getWeaponLinkBVMultiplier('apollo');
        a--;
      }
    }
  }

  if (cs.ppcCapLocs.length > 0) {
    // Track which weapon indices have already been matched by a capacitor.
    // Without this, weapons.find() always returns the FIRST match, so two caps
    // in the same location (e.g., two Light PPCs + two caps in LEFT_ARM) would
    // both augment the same weapon instead of one each.
    const capConsumed = new Set<number>();
    for (const capLoc of cs.ppcCapLocs) {
      // Find the NEXT unconsumed PPC weapon in the same location as the capacitor
      const ppcIdx = weapons.findIndex(
        (w, i) =>
          !capConsumed.has(i) &&
          w.name.includes('ppc') &&
          w.location.toUpperCase().replace(/[_\s-]+/g, '') ===
            capLoc.toUpperCase().replace(/[_\s-]+/g, ''),
      );
      if (ppcIdx < 0) continue;
      capConsumed.add(ppcIdx);
      const ppcInLoc = weapons[ppcIdx];
      const wlo = ppcInLoc.name.replace(/^\d+-/, '');
      // Check if the PPC in this location is Clan by examining crit slot names
      const locSlots = unit.criticalSlots?.[capLoc] || [];
      const hasClanPPC = (locSlots as string[]).some(
        (s: string) =>
          s &&
          typeof s === 'string' &&
          s.toUpperCase().startsWith('CL') &&
          s.toUpperCase().includes('PPC'),
      );
      let capBV = 44;
      if (wlo.includes('erppc') || wlo.includes('er-ppc')) {
        capBV =
          unit.techBase === 'CLAN' ||
          wlo.startsWith('cl') ||
          wlo.startsWith('clan') ||
          hasClanPPC
            ? 136
            : 114;
      } else if (wlo.includes('heavy') || wlo.includes('hppc')) {
        capBV = 53;
      } else if (wlo.includes('snub') || wlo.includes('snppc')) {
        capBV = 87;
      } else if (wlo.includes('light') || wlo.includes('lppc')) {
        capBV = 44;
      } else if (wlo.includes('ppc')) {
        capBV = 88;
      }
      // MegaMek processWeapon(): AES ×1.25 applies to BASE weapon BV, then cap BV
      // is added AFTER. Since applyWeaponBVModifiers applies AES later, pre-divide
      // capBV by 1.25 so that (baseBV + capBV/1.25) × 1.25 = baseBV×1.25 + capBV.
      ppcInLoc.bv += ppcInLoc.hasAES ? capBV / 1.25 : capBV;
      ppcInLoc.heat += 5;
    }
  }

  // RISC Laser Pulse Module: linked lasers get BV × 1.15 and heat + 2
  // per MegaMek BVCalculator.processWeapon() — same pattern as Apollo for missiles
  if (cs.riscLPMLocs.length > 0) {
    for (const lpmLoc of cs.riscLPMLocs) {
      // Find a laser weapon in the same location that hasn't already been boosted
      const laserInLoc = weapons.find(
        (w) =>
          !w.riscLPMApplied &&
          (w.name.toLowerCase().includes('laser') ||
            w.name.toLowerCase().includes('pulse')) &&
          w.location.toUpperCase().replace(/[_\s-]+/g, '') ===
            lpmLoc.toUpperCase().replace(/[_\s-]+/g, ''),
      );
      if (!laserInLoc) continue;
      laserInLoc.bv *= getWeaponLinkBVMultiplier('risc');
      laserInLoc.heat += 2;
      laserInLoc.riscLPMApplied = true;
    }
  }

  // determineFront compares modified BV before rear weighting (Java:690-699,764-765).
  // Turret-mounted weapons are excluded from front/rear comparison per MegaMek
  let fBV = 0,
    rBV = 0;
  for (const w of weapons) {
    if (isArmLoc(w.location) || w.isTurret) continue;
    const modBV = applyWeaponBVModifiers({ ...w, rear: false }, hasTC);
    if (w.rear) {
      rBV += modBV;
    } else {
      fBV += modBV;
    }
  }
  if (rBV > fBV) {
    for (const w of weapons) {
      if (!isArmLoc(w.location) && !w.isTurret) w.rear = !w.rear;
    }
  }
}
