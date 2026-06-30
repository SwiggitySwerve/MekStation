import type { CritScan } from './validate-bv-crit-scan';
import type { UnitData } from './validate-bv-types';

import { toMechLoc } from './validate-bv-normalizers';
import { isArmLoc } from './validate-bv-unit-derived';

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
  // Machine Gun Array (MGA): MegaMek counts individual MGs at full BV, then adds
  // MGA bonus = sum(linked MG BVs) × 0.67 as a separate weapon entry with heat=0.
  // MGA links to up to 4 MGs of matching type at the same location.
  // Track consumed MGs so each MG is only linked to one MGA.
  const mgaConsumed = new Set<number>(); // indices of weapons already linked to an MGA
  for (const eq of unit.equipment) {
    // Strip quantity prefix (e.g., "1-islmga" → "islmga")
    const rawId = eq.id.toLowerCase().replace(/^\d+-/, '');
    let mgType: string | null = null;
    if (
      rawId === 'machine-gun-array' ||
      rawId === 'ismga' ||
      rawId === 'clmga' ||
      rawId.endsWith('-mga')
    )
      mgType = 'machine-gun';
    else if (
      rawId === 'light-machine-gun-array' ||
      rawId === 'islmga' ||
      rawId === 'cllmga' ||
      rawId.endsWith('-lmga') ||
      rawId === 'islightmga' ||
      rawId === 'cllightmga'
    )
      mgType = 'light-machine-gun';
    else if (
      rawId === 'heavy-machine-gun-array' ||
      rawId === 'ishmga' ||
      rawId === 'clhmga' ||
      rawId.endsWith('-hmga') ||
      rawId === 'isheavymga' ||
      rawId === 'clheavymga'
    )
      mgType = 'heavy-machine-gun';
    if (!mgType) continue;

    const mgLoc = eq.location.split(',')[0].toUpperCase();
    // Link up to 4 unconsumed MGs of matching type at the same location
    let linkedMGBV = 0;
    let linkedCount = 0;
    for (let wi = 0; wi < weapons.length; wi++) {
      if (linkedCount >= 4) break;
      if (mgaConsumed.has(wi)) continue;
      const w = weapons[wi];
      const wLoc = w.location.split(',')[0].toUpperCase();
      if (wLoc !== mgLoc) continue;
      const wid = w.name.replace(/^\d+-/, '');
      const isMatch =
        (mgType === 'machine-gun' &&
          (wid === 'machine-gun' ||
            wid === 'clmg' ||
            wid === 'ismg' ||
            wid === 'ismachine-gun' ||
            wid === 'clmachine-gun')) ||
        (mgType === 'light-machine-gun' &&
          (wid === 'light-machine-gun' ||
            wid === 'islightmg' ||
            wid === 'cllightmg' ||
            wid === 'islmg' ||
            wid === 'islightmachine-gun' ||
            wid === 'cllightmachine-gun')) ||
        (mgType === 'heavy-machine-gun' &&
          (wid === 'heavy-machine-gun' ||
            wid === 'isheavymg' ||
            wid === 'clheavymg' ||
            wid === 'clhmg' ||
            wid === 'isheavymachine-gun' ||
            wid === 'clheavymachine-gun'));
      if (isMatch) {
        linkedMGBV += w.bv;
        linkedCount++;
        mgaConsumed.add(wi);
      }
    }
    if (linkedMGBV > 0) {
      const mgaBV = linkedMGBV * 0.67;
      weapons.push({
        id: 'mga-bonus',
        name: rawId,
        heat: 0,
        bv: mgaBV,
        rear: false,
        hasAES: false,
        isDirectFire: false,
        location: eq.location,
      });
    }
  }

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
        w.bv = Math.round(w.bv * 1.15);
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
      laserInLoc.bv = laserInLoc.bv * 1.15;
      laserInLoc.heat += 2;
      laserInLoc.riscLPMApplied = true;
    }
  }

  // MGA: MegaMek documentation says MGA replaces individual MGs with sum(BV) × 0.67, but
  // MUL reference BVs do NOT apply this reduction — they use full individual MG BV.
  // Applying ×0.67 causes massive regression (units drop 5-10% further below reference).
  // Keep individual MGs at full BV with no MGA reduction to match MUL reference values.

  // determineFront — use fully-modified BV (with TC, rear ×0.5) per MegaMek
  // Turret-mounted weapons are excluded from front/rear comparison per MegaMek
  let fBV = 0,
    rBV = 0;
  for (const w of weapons) {
    if (isArmLoc(w.location) || w.isTurret) continue;
    let modBV = w.bv;
    if (w.hasAES) modBV *= 1.25;
    if (hasTC && w.isDirectFire) modBV *= 1.25;
    if (w.rear) {
      rBV += modBV * 0.5;
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
