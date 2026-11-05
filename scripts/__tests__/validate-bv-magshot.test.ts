import { calculateUnitBV } from '../validate-bv-calculator';
import { morpheus } from './fixtures/morpheus-mrp-3w';

// MegaMek 48fcb2f64: GaussWeapon.java:54-59; ISMagshotGaussRifle.java:59-77;
// MekBVCalculator.java:204-215 reduces F_GAUSS deductions to one per critical.
it.each(['ISMagshotGR', 'Magshot'])(
  'charges two reduced slots for %s without exploding its ammo',
  (name) => {
    const b = calculateUnitBV({
      ...morpheus,
      equipment: [],
      criticalSlots: {
        CENTER_TORSO: [name, name, 'ISMagshotGR Ammo'],
      },
    }).breakdown;
    expect(b?.explosivePenalty).toBe(2);
  },
);

it('retains unrelated normal and Gauss deductions', () => {
  const b = calculateUnitBV({
    ...morpheus,
    equipment: [],
    criticalSlots: {
      CENTER_TORSO: [
        'ISMagshotGR',
        'ISMagshotGR',
        'IS AC/5 Ammo',
        ...Array<string>(7).fill('ISGaussRifle'),
      ],
    },
  }).breakdown;
  expect(b?.explosivePenalty).toBe(24);
});

it('matches native Morpheus MRP-3W after the MASS prerequisite', () => {
  const result = calculateUnitBV(morpheus, morpheus.id);
  expect(result.breakdown?.defEquipBV).toBe(78);
  expect(result.breakdown?.defensiveBV).toBeCloseTo(885.95, 8);
  expect(result.bv).toBe(1299);
});
