import { calculateMechRunMP } from '@/utils/construction/mechMovement';

import type { CritScan } from './critScan';
import type { UnitData } from './types';

export interface BvHeatAndMovement {
  effectiveHSCount: number;
  heatDiss: number;
  bvWalk: number;
  runMP: number;
  jumpMP: number;
  jumpHeatMP: number;
  partialWingJumpBonus: number;
}

function deriveEffectiveHeatSinkCount(unit: UnitData, cs: CritScan): number {
  // Capacity does not create undeclared sinks (MtfFile.java:570-598;
  // Mek.java:2198-2210, pin 48fcb2f64).
  const engineIntegratedHS = Math.min(
    unit.heatSinks.count,
    10,
    Math.floor(unit.engine.rating / 25),
  );
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
  if (cs.hasChainDrape) bvWalk = Math.max(0, bvWalk - 1);
  return bvWalk;
}

function partialWingBonus(
  unit: UnitData,
  cs: CritScan,
  baseJumpMP: number,
): number {
  return cs.hasPartialWing && baseJumpMP > 0 ? (unit.tonnage <= 55 ? 2 : 1) : 0;
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
  const partialWingJumpBonus = partialWingBonus(unit, cs, baseJumpMP);

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
  const runMP = calculateMechRunMP(bvWalk, {
    masc: cs.hasMASC,
    supercharger: cs.hasSupercharger,
    hardenedArmor: armorType === 'hardened',
  });
  const jets = deriveJumpMP(unit, cs);
  const boosterMP = cs.mechanicalJumpBoosterMP ?? 0;
  const mechanicalJumpMP = cs.hasLargeShield
    ? 0
    : Math.max(
        0,
        boosterMP +
          partialWingBonus(unit, cs, boosterMP) -
          (cs.hasMediumShield ? Math.max(1, cs.shieldArms.length) : 0),
      );

  return {
    effectiveHSCount,
    heatDiss,
    bvWalk,
    runMP,
    jumpMP: Math.max(jets.jumpMP, mechanicalJumpMP),
    jumpHeatMP: Math.max(0, jets.jumpMP - jets.partialWingJumpBonus),
    partialWingJumpBonus: jets.partialWingJumpBonus,
  };
}
