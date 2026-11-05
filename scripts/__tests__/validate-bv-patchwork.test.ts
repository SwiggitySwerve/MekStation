import type { UnitData } from '../validate-bv-types';

import { calculateUnitBV } from '../validate-bv-calculator';

const unit: UnitData = {
  id: 'patchwork',
  chassis: 'Test',
  model: 'Patchwork',
  unitType: 'BattleMech',
  configuration: 'Biped',
  techBase: 'INNER_SPHERE',
  tonnage: 50,
  engine: { type: 'FUSION', rating: 200 },
  gyro: { type: 'STANDARD' },
  cockpit: 'STANDARD',
  structure: { type: 'STANDARD' },
  armor: {
    type: 'PATCHWORK',
    allocation: { HEAD: 9, CENTER_TORSO: { front: 30, rear: 5 }, LEFT_LEG: 10 },
    locationTypes: {
      HEAD: 'STANDARD',
      CENTER_TORSO: 'HARDENED',
      LEFT_LEG: 'REACTIVE',
    },
  },
  heatSinks: { type: 'SINGLE', count: 10 },
  movement: { walk: 4, jump: 0 },
  equipment: [],
};

// BVCalculator.java:359-420 (48fcb2f64): sum each location using its own type/BAR.
it('uses the torso type for front and rear armor without a global critical override', () => {
  const input = { ...unit, criticalSlots: { LEFT_LEG: ['IS Reactive'] } };
  expect(calculateUnitBV(input).breakdown?.armorBV).toBe(235);
});

it('uses local commercial BAR without lowering the other locations', () => {
  expect(
    calculateUnitBV({
      ...unit,
      armor: {
        type: 'PATCHWORK',
        allocation: { HEAD: 9, LEFT_LEG: 10 },
        locationTypes: { HEAD: 'STANDARD', LEFT_LEG: 'COMMERCIAL' },
      },
    }).breakdown?.armorBV,
  ).toBe(35);
});

it('keeps torso-cockpit armor at the center torso type', () => {
  expect(
    calculateUnitBV({ ...unit, cockpit: 'TORSO_MOUNTED' }).breakdown?.armorBV,
  ).toBe(410);
});

it('applies local armor type to modular armor', () => {
  expect(
    calculateUnitBV({ ...unit, criticalSlots: { LEFT_LEG: ['Modular Armor'] } })
      .breakdown?.armorBV,
  ).toBe(272.5);
});

it('retains modular armor in an otherwise empty location', () => {
  expect(
    calculateUnitBV({
      ...unit,
      criticalSlots: { RIGHT_ARM: ['Modular Armor'] },
    }).breakdown?.armorBV,
  ).toBe(260);
});

it('retains the additive Blue Shield armor multiplier on every section', () => {
  expect(
    calculateUnitBV({ ...unit, criticalSlots: { LEFT_LEG: ['Blue Shield'] } })
      .breakdown?.armorBV,
  ).toBeCloseTo(262, 8);
});

it('uses the local type for a HarJel bonus', () => {
  expect(
    calculateUnitBV({ ...unit, criticalSlots: { CENTER_TORSO: ['HarJel II'] } })
      .breakdown?.harjelBonus,
  ).toBeCloseTo(17.5, 8);
});
