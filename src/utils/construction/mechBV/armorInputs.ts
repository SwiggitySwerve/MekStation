import type { UnitData } from '../../../../scripts/validate-bv-types';
import type { DefensiveBVConfig } from '../battleValueDefensive';

import { scanCrits } from '../../../../scripts/validate-bv-crit-scan';
import { toMechLoc } from '../../../../scripts/validate-bv-normalizers';
import {
  calcTotalArmor,
  getArmorBAR,
} from '../../../../scripts/validate-bv-unit-derived';
import {
  getModularArmorBVPoints,
  getNativeArmorBVMultiplier,
  getNativeArmorName,
} from '../battleValueDefensive';

/** Project MTF patchwork source facts; BVCalculator.java:359-420 at 48fcb2f64.
 * The defensive owner applies the one armor formula. Existing setup/scanning
 * retain cockpit and modular points; rear armor uses the torso's native type.
 */
export function deriveMechArmorSections(
  unit: UnitData,
  setupArmorPoints: number,
): NonNullable<DefensiveBVConfig['armorSections']> {
  const torsoCockpitArmor =
    setupArmorPoints - calcTotalArmor(unit.armor.allocation);
  const locations = new Set([
    ...Object.keys(unit.armor.allocation),
    ...Object.keys(unit.criticalSlots ?? {}),
  ]);
  return [...locations].map((location) => {
    const points = calcTotalArmor({
      [location]: unit.armor.allocation[location] ?? 0,
    });
    const type = unit.armor.typeByLocation?.[location] ?? 0;
    const localScan = scanCrits({
      ...unit,
      criticalSlots: { [location]: unit.criticalSlots?.[location] ?? [] },
    });
    return {
      points:
        points +
        getModularArmorBVPoints(localScan.modularArmorSlots) +
        (toMechLoc(location) === 'CT' ? torsoCockpitArmor : 0),
      multiplier: getNativeArmorBVMultiplier(type),
      bar: getArmorBAR(getNativeArmorName(type)),
    };
  });
}
