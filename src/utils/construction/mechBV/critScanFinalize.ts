import type { MechLocation } from '@/utils/construction/battleValueCalculations';

import type { CritScan } from './critScanTypes';
import type { UnitData } from './types';

import { hasClanChassis } from './chassis';
import {
  countCritHeatSinks,
  detectCritArmorType,
  detectCritGyroType,
} from './critDerived';
import { countCritWeaponMounts } from './critWeaponMounts';
import { toMechLoc } from './normalizers';

export function finalizeCritScan(
  unit: UnitData,
  unitId: string | undefined,
  r: CritScan,
): void {
  const allSlots = Object.values(unit.criticalSlots ?? {})
    .flat()
    .filter((s): s is string => !!s && typeof s === 'string');
  const allSlotsLo = allSlots.map((s) => s.toLowerCase());
  r.detectedArmorType = detectCritArmorType(allSlotsLo);
  r.detectedGyroType = detectCritGyroType(unit);

  const { rearWeaponCountByLoc, turretWeaponCountByLoc } =
    countCritWeaponMounts(unit);
  r.rearWeaponCountByLoc = rearWeaponCountByLoc;
  r.turretWeaponCountByLoc = turretWeaponCountByLoc;

  const { critDHSCount, critProtoDHSCount, critLaserHSCount } =
    countCritHeatSinks(unit);
  r.critDHSCount = critDHSCount;
  r.critProtoDHSCount = critProtoDHSCount;
  r.critLaserHSCount = critLaserHSCount;

  applyClanCaseProtection(unit, unitId, r);
  detectCockpitAndDroneState(unit, allSlotsLo, r);
  addExplosivePpcSlots(unit, r);
}

function applyClanCaseProtection(
  unit: UnitData,
  unitId: string | undefined,
  r: CritScan,
): void {
  // Clan mechs have built-in CASE in all non-head locations (torsos, arms, legs, CT).
  // Mixed Clan-chassis units get the same implicit protection in MegaMek.
  const allNonHeadLocs: MechLocation[] = [
    'LT',
    'RT',
    'LA',
    'RA',
    'CT',
    'LL',
    'RL',
  ];
  if (!hasClanChassis(unit, unitId)) return;

  for (const loc of allNonHeadLocs) {
    if (!r.caseLocs.includes(loc) && !r.caseIILocs.includes(loc)) {
      r.caseLocs.push(loc);
    }
  }
}

function detectCockpitAndDroneState(
  unit: UnitData,
  allSlotsLo: string[],
  r: CritScan,
): void {
  if (unit.cockpit && unit.cockpit.toUpperCase().includes('SMALL')) {
    r.detectedSmallCockpit = true;
  }

  const headSlots = unit.criticalSlots?.HEAD;
  if (
    !r.detectedSmallCockpit &&
    Array.isArray(headSlots) &&
    headSlots.length >= 4
  ) {
    const slot4 = headSlots[3];
    const lsCount = headSlots.filter(
      (s: string | null) => s && s.includes('Life Support'),
    ).length;
    if (
      slot4 &&
      typeof slot4 === 'string' &&
      slot4.includes('Sensors') &&
      lsCount === 1
    ) {
      r.detectedSmallCockpit = true;
    }
  }

  // Interface Cockpit detection: HEAD has 2 "Cockpit" entries and no gyro anywhere.
  if (Array.isArray(headSlots)) {
    let cockpitCount = 0;
    for (const hs of headSlots) {
      if (
        hs &&
        typeof hs === 'string' &&
        hs.toLowerCase().includes('cockpit')
      ) {
        cockpitCount++;
      }
    }
    if (cockpitCount >= 2) {
      const hasGyroAnywhere = allSlotsLo.some((s) => s.includes('gyro'));
      if (!hasGyroAnywhere) r.detectedInterfaceCockpit = true;
    }
  }

  if (
    allSlotsLo.some(
      (s) =>
        s.includes('droneoperatingsystem') ||
        s.includes('drone operating system'),
    )
  ) {
    r.detectedDroneOS = true;
  }
}

function addExplosivePpcSlots(unit: UnitData, r: CritScan): void {
  if (r.ppcCapLocs.length === 0 || !unit.criticalSlots) return;

  const uniqueCapLocs = [...new Set(r.ppcCapLocs)];
  for (const capLoc of uniqueCapLocs) {
    const locSlots =
      unit.criticalSlots[capLoc] || unit.criticalSlots[capLoc.toUpperCase()];
    if (!Array.isArray(locSlots)) continue;
    const ml = toMechLoc(capLoc);
    if (!ml) continue;
    for (const s of locSlots) {
      if (!s || typeof s !== 'string') continue;
      const slo = s
        .toLowerCase()
        .replace(/\s*\(omnipod\)/gi, '')
        .trim();
      if (
        slo.includes('ppc') &&
        !slo.includes('capacitor') &&
        !slo.includes('ammo')
      ) {
        r.explosive.push({
          location: ml,
          slots: 1,
          penaltyCategory: 'reduced',
        });
      }
    }
  }
}
