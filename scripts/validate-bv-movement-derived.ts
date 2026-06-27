import type { CritScan } from './validate-bv-crit-scan';
import type { UnitData } from './validate-bv-types';

export interface BvHeatAndMovement {
  effectiveHSCount: number;
  heatDiss: number;
  bvWalk: number;
  runMP: number;
  jumpMP: number;
  partialWingJumpBonus: number;
}

function deriveEffectiveHeatSinkCount(unit: UnitData, cs: CritScan): number {
  const engineIntegratedHS = Math.min(10, Math.floor(unit.engine.rating / 25));
  const critBasedHSCount = engineIntegratedHS + cs.critDHSCount;
  return Math.max(unit.heatSinks.count, critBasedHSCount);
}

function deriveHeatDissipation(
  unit: UnitData,
  cs: CritScan,
  effectiveHSCount: number,
): number {
  const isDHS =
    unit.heatSinks.type.toUpperCase().includes('DOUBLE') ||
    unit.heatSinks.type.toUpperCase().includes('LASER');

  let heatDiss: number;
  if (isDHS) {
    heatDiss = effectiveHSCount * 2;
  } else if (cs.critLaserHSCount > 0 || cs.critProtoDHSCount > 0) {
    const doubleHSCount = cs.critLaserHSCount + cs.critProtoDHSCount;
    const singleHS = effectiveHSCount - doubleHSCount;
    heatDiss = singleHS + doubleHSCount * 2;
  } else {
    heatDiss = effectiveHSCount;
  }

  if (cs.hasRadicalHS) heatDiss += Math.ceil(effectiveHSCount * 0.4);
  if (cs.hasPartialWing) heatDiss += 3;
  return heatDiss;
}

function deriveBvWalkMP(unit: UnitData, cs: CritScan): number {
  const walkMP = unit.movement.walk;
  let bvWalk = cs.hasTSM ? walkMP + 1 : walkMP;
  if (cs.hasMediumShield || cs.hasLargeShield) bvWalk = Math.max(0, bvWalk - 1);
  return bvWalk;
}

function deriveRunMP(bvWalk: number, cs: CritScan, armorType: string): number {
  let runMP =
    cs.hasMASC && cs.hasSupercharger
      ? Math.ceil(bvWalk * 2.5)
      : cs.hasMASC || cs.hasSupercharger
        ? bvWalk * 2
        : Math.ceil(bvWalk * 1.5);
  if (armorType === 'hardened') runMP = Math.max(0, runMP - 1);
  return runMP;
}

function deriveJumpMP(
  unit: UnitData,
  cs: CritScan,
): { jumpMP: number; partialWingJumpBonus: number } {
  const baseJumpMP = unit.movement.jump || 0;
  const jjMountsFromCrits =
    cs.standardJJCrits +
    Math.floor(cs.improvedJJCrits / 2) +
    cs.prototypeIJJCrits;
  const partialWingJumpBonus =
    cs.hasPartialWing && baseJumpMP > 0 ? (unit.tonnage <= 55 ? 2 : 1) : 0;

  if (jjMountsFromCrits > 0 && jjMountsFromCrits >= baseJumpMP) {
    return {
      jumpMP: jjMountsFromCrits + partialWingJumpBonus,
      partialWingJumpBonus,
    };
  }
  if (
    cs.hasPartialWing &&
    jjMountsFromCrits > 0 &&
    baseJumpMP === jjMountsFromCrits + partialWingJumpBonus
  ) {
    return { jumpMP: baseJumpMP, partialWingJumpBonus };
  }
  return {
    jumpMP: baseJumpMP + partialWingJumpBonus,
    partialWingJumpBonus,
  };
}

export function deriveBvHeatAndMovement(
  unit: UnitData,
  cs: CritScan,
  armorType: string,
): BvHeatAndMovement {
  const effectiveHSCount = deriveEffectiveHeatSinkCount(unit, cs);
  const heatDiss = deriveHeatDissipation(unit, cs, effectiveHSCount);
  const bvWalk = deriveBvWalkMP(unit, cs);
  const runMP = deriveRunMP(bvWalk, cs, armorType);
  const { jumpMP, partialWingJumpBonus } = deriveJumpMP(unit, cs);

  return {
    effectiveHSCount,
    heatDiss,
    bvWalk,
    runMP,
    jumpMP,
    partialWingJumpBonus,
  };
}
