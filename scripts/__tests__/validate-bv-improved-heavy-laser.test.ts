import type { UnitData } from '../validate-bv-types';

import { calculateUnitBV as calculateConstructionBV } from '../../src/utils/construction/mechBV/calculator';
import { calculateUnitBV } from '../validate-bv-calculator';
import { scanCrits } from '../validate-bv-crit-scan';

const unit: UnitData = {
  id: 'improved-heavy-laser',
  chassis: 'Test',
  model: 'Improved Heavy Laser',
  unitType: 'BattleMech',
  configuration: 'Biped',
  techBase: 'INNER_SPHERE',
  tonnage: 50,
  engine: { type: 'FUSION', rating: 200 },
  gyro: { type: 'STANDARD' },
  cockpit: 'STANDARD',
  structure: { type: 'STANDARD' },
  armor: { type: 'STANDARD', allocation: { HEAD: 9 } },
  heatSinks: { type: 'SINGLE', count: 10 },
  movement: { walk: 4, jump: 0 },
  equipment: [],
};

// MegaMek 48fcb2f64: CLImprovedHeavyLaserLarge.java:57-60,74,81-86;
// MekBVCalculator.java:204-215 charges one BV per exposed improved-laser slot.
it.each([
  ['CLImprovedHeavyLargeLaser', 3],
  ['Improved Heavy Large Laser', 3],
  ['Clan Improved Large Heavy Laser', 3],
  ['CLImprovedMediumHeavyLaser', 2],
  ['CLImprovedHeavyMediumLaser', 2],
  ['Improved Heavy Medium Laser', 2],
  ['CLImprovedSmallHeavyLaser', 1],
  ['CLImprovedHeavySmallLaser', 1],
  ['Improved Heavy Small Laser', 1],
] as const)('charges each critical of %s exactly once', (name, slots) => {
  const input = {
    ...unit,
    criticalSlots: { CENTER_TORSO: Array<string>(slots).fill(name) },
  };
  expect(scanCrits(input).explosive).toEqual(
    Array.from({ length: slots }, () => ({
      location: 'CT',
      slots: 1,
      penaltyCategory: 'reduced',
    })),
  );
  expect(calculateUnitBV(input).breakdown?.explosivePenalty).toBe(slots);
  expect(calculateConstructionBV(input).breakdown?.totalExplosivePenalty).toBe(
    slots,
  );
});

it('keeps ordinary heavy lasers nonexplosive and retains neighboring ammo', () => {
  const input = {
    ...unit,
    criticalSlots: {
      CENTER_TORSO: ['CLHeavyLargeLaser', 'IS AC/5 Ammo'],
    },
  };
  expect(calculateUnitBV(input).breakdown?.explosivePenalty).toBe(15);
});

it('retains local CASE II and transferred arm CASE protection', () => {
  for (const criticalSlots of [
    { CENTER_TORSO: ['CLImprovedHeavyLargeLaser', 'ISCASEII'] },
    { LEFT_ARM: ['CLImprovedHeavyLargeLaser'], LEFT_TORSO: ['ISCASE'] },
  ]) {
    expect(
      calculateUnitBV({ ...unit, criticalSlots }).breakdown?.explosivePenalty,
    ).toBe(0);
  }
});
