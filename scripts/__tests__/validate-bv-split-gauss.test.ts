import type { UnitData } from '../validate-bv-types';

import { EngineType } from '../../src/types/construction/EngineType';
import { calculateExplosivePenalties } from '../../src/utils/construction/battleValueExplosivePenalties';
import { calculateUnitBV } from '../validate-bv-calculator';

const unit: UnitData = {
  id: 'split-gauss',
  chassis: 'Test',
  model: 'Split Gauss',
  unitType: 'BattleMech',
  configuration: 'Biped',
  techBase: 'INNER_SPHERE',
  tonnage: 100,
  engine: { type: 'FUSION', rating: 300 },
  gyro: { type: 'STANDARD' },
  cockpit: 'STANDARD',
  structure: { type: 'STANDARD' },
  armor: { type: 'STANDARD', allocation: { HEAD: 9 } },
  heatSinks: { type: 'DOUBLE', count: 10 },
  movement: { walk: 3, jump: 0 },
  equipment: [{ id: 'heavy-gauss-rifle', location: 'CENTER_TORSO' }],
};

// MegaMek 48fcb2f64 MekBVCalculator.java:196-198,238-250: protection of both
// locations is required; otherwise all criticals of the split mount are charged.
it.each(['LEFT_TORSO', 'RIGHT_TORSO'])(
  'charges all11slots when %s alone has CASE',
  (location) => {
    const b = calculateUnitBV({
      ...unit,
      criticalSlots: {
        CENTER_TORSO: ['ISHeavyGaussRifle', 'ISHeavyGaussRifle'],
        [location]: [...Array<string>(9).fill('ISHeavyGaussRifle'), 'ISCASE'],
      },
    }).breakdown;
    expect(b?.explosivePenalty).toBe(11);
  },
);

it('uses both locations even when the primary location is protected', () => {
  const equipment = [
    {
      location: 'CT' as const,
      additionalLocations: ['LT'] as const,
      slots: 11,
      penaltyCategory: 'gauss' as const,
    },
  ];
  expect(
    calculateExplosivePenalties({
      equipment,
      caseLocations: [],
      caseIILocations: ['CT'],
      engineType: EngineType.STANDARD,
    }).totalPenalty,
  ).toBe(11);
  expect(
    calculateExplosivePenalties({
      equipment,
      caseLocations: [],
      caseIILocations: ['CT', 'LT'],
      engineType: EngineType.STANDARD,
    }).totalPenalty,
  ).toBe(0);
});

it('retains independent protection for two separate mounts of the same type', () => {
  const b = calculateUnitBV({
    ...unit,
    equipment: [
      { id: 'heavy-gauss-rifle', location: 'LEFT_TORSO' },
      { id: 'heavy-gauss-rifle', location: 'RIGHT_TORSO' },
    ],
    criticalSlots: {
      LEFT_TORSO: [...Array<string>(11).fill('ISHeavyGaussRifle'), 'ISCASE'],
      RIGHT_TORSO: Array<string>(11).fill('ISHeavyGaussRifle'),
    },
  }).breakdown;
  expect(b?.explosivePenalty).toBe(11);
});
