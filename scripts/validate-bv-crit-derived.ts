import type { UnitData } from './validate-bv-types';

export interface CritHeatSinkCounts {
  critDHSCount: number;
  critProtoDHSCount: number;
  critLaserHSCount: number;
}

export function detectCritArmorType(allSlotsLo: string[]): string | null {
  if (allSlotsLo.some((s) => s.includes('ferro-lamellor')))
    return 'ferro-lamellor';
  if (
    allSlotsLo.some(
      (s) =>
        s.includes('ballistic-reinforced') ||
        s.includes('ballistic reinforced'),
    )
  )
    return 'ballistic-reinforced';
  if (allSlotsLo.some((s) => s.includes('reactive') && !s.includes('ferro')))
    return 'reactive';
  if (
    allSlotsLo.some(
      (s) =>
        (s.includes('reflective') || s.includes('laser-reflective')) &&
        !s.includes('ferro'),
    )
  )
    return 'reflective';
  if (
    allSlotsLo.some(
      (s) => s.includes('hardened armor') || s.includes('is hardened'),
    )
  )
    return 'hardened';
  if (
    allSlotsLo.some(
      (s) => s.includes('anti-penetrative') || s.includes('ablation'),
    )
  )
    return 'anti-penetrative';
  if (allSlotsLo.some((s) => s.includes('heat-dissipating')))
    return 'heat-dissipating';
  return null;
}

export function detectCritGyroType(unit: UnitData): string | null {
  const ctSlots =
    unit.criticalSlots?.['CENTER_TORSO'] || unit.criticalSlots?.['CT'] || [];
  const gyroSlotCount = (ctSlots as string[]).filter(
    (s: string) =>
      s && typeof s === 'string' && s.toLowerCase().includes('gyro'),
  ).length;
  if (gyroSlotCount === 6) return 'xl';
  if (gyroSlotCount === 2) return 'compact';
  // HD gyro also has 4 slots like Standard, so crit count alone cannot distinguish it.
  return null;
}

export function countCritHeatSinks(unit: UnitData): CritHeatSinkCounts {
  let dhsCritSlots = 0;
  let protoDHSCritSlots = 0;
  const isClanTech = unit.techBase === 'CLAN';

  for (const [, slots] of Object.entries(unit.criticalSlots || {})) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots) {
      if (!s || typeof s !== 'string') continue;
      const lo = s
        .replace(/\s*\(omnipod\)/gi, '')
        .trim()
        .toLowerCase();
      const isProto =
        lo === 'isdoubleheatsinkprototype' ||
        lo === 'cldoubleheatsinkprototype' ||
        lo === 'freezers' ||
        lo === 'isdoubleheatsinkfreezer' ||
        lo.includes('double heat sink prototype') ||
        lo.includes('double heat sink (freezer');
      if (
        isProto ||
        lo.includes('double heat sink') ||
        lo === 'isdoubleheatsink' ||
        lo === 'cldoubleheatsink'
      ) {
        dhsCritSlots++;
        if (isProto) protoDHSCritSlots++;
      }
    }
  }

  let slotsPerDHS = 3; // IS default
  if (isClanTech) {
    slotsPerDHS = 2;
  } else if (unit.techBase === 'MIXED') {
    const hasClanDHS = Object.values(unit.criticalSlots || {}).some(
      (slots) =>
        Array.isArray(slots) &&
        slots.some(
          (s) =>
            s &&
            typeof s === 'string' &&
            (s.startsWith('CLDouble') || s.includes('Clan Double Heat Sink')),
        ),
    );
    if (hasClanDHS) slotsPerDHS = 2;
  }

  let laserHSCritSlots = 0;
  for (const [, slots] of Object.entries(unit.criticalSlots || {})) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots) {
      if (!s || typeof s !== 'string') continue;
      if (
        s
          .toLowerCase()
          .replace(/\s*\(omnipod\)/gi, '')
          .trim()
          .includes('laser heat sink')
      )
        laserHSCritSlots++;
    }
  }

  return {
    critDHSCount: Math.round(dhsCritSlots / slotsPerDHS),
    critProtoDHSCount: Math.round(protoDHSCritSlots / 3),
    critLaserHSCount: Math.round(laserHSCritSlots / 2),
  };
}
