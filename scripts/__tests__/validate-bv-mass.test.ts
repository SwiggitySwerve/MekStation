import type { UnitData } from '../validate-bv-types';

import { resolveEquipmentBV } from '../../src/utils/construction/equipmentBVResolver';
import { calculateUnitBV } from '../validate-bv-calculator';

const unit: UnitData = {
  id: 'mass-defense',
  chassis: 'Test',
  model: 'MASS',
  unitType: 'BattleMech',
  configuration: 'Biped',
  techBase: 'INNER_SPHERE',
  tonnage: 50,
  engine: { type: 'FUSION', rating: 200 },
  gyro: { type: 'STANDARD' },
  cockpit: 'STANDARD',
  structure: { type: 'STANDARD' },
  armor: { type: 'STANDARD', allocation: { HEAD: 9, CENTER_TORSO: 20 } },
  heatSinks: { type: 'DOUBLE', count: 10 },
  movement: { walk: 4, jump: 0 },
  equipment: [],
};

// MegaMek 48fcb2f64: MiscType.java:4942-4956; BVCalculator.java:527-543.
it.each([
  'ISMASS',
  'ISMASS (OMNIPOD)',
  'IS Mass',
  'Clan Mass',
  'CLMass',
  'MechWarrior Aquatic Survival System (MASS)',
])('includes native MASS identity %s in defense', (slot) => {
  expect(resolveEquipmentBV('mass').battleValue).toBe(9);
  const before = calculateUnitBV(unit).breakdown;
  const after = calculateUnitBV({
    ...unit,
    criticalSlots: { HEAD: [slot] },
  }).breakdown;
  expect(after?.defEquipBV).toBe(9);
  expect(after?.defensiveBV).toBeCloseTo(
    (before?.defensiveBV ?? 0) + 9 * 1.2,
    10,
  );
  expect(after?.offensiveBV).toBe(before?.offensiveBV);
});

it('counts distinct one-slot MASS mounts separately', () => {
  const after = calculateUnitBV({
    ...unit,
    criticalSlots: { HEAD: ['ISMASS', 'ISMASS'] },
  }).breakdown;
  expect(after?.defEquipBV).toBe(18);
});

it('does not mistake unrelated mass text or ammo for MASS', () => {
  const after = calculateUnitBV({
    ...unit,
    criticalSlots: { HEAD: ['Mass Driver', 'ISMASS Ammo'] },
  }).breakdown;
  expect(after?.defEquipBV).toBe(0);
});
