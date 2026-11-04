import { HeatSinkType } from '../../src/types/construction/HeatSinkType';
import { UnitType } from '../../src/types/unit/BattleMechInterfaces';
import { calculateLargeAerospaceBV } from '../../src/utils/construction/aerospace/dropShipComplete';
import { largeAerospaceBVTerms } from '../../src/utils/construction/aerospace/largeBVTrace';

test('large aerospace exposes summary before rounding and preserves incomplete scope', () => {
  const unit = {
    unitType: UnitType.DROPSHIP as const,
    structuralIntegrity: 11,
    totalArmorPoints: 644,
    equipment: [],
  };
  expect(calculateLargeAerospaceBV(unit)).toMatchObject({
    calculationScope: 'defensive-only',
    final: undefined,
    typeModifier: 1,
  });
  expect(
    calculateLargeAerospaceBV({
      ...unit,
      maxThrust: 5,
      cockpit: 'SMALL',
      heatSinks: { type: HeatSinkType.SINGLE, count: 10 },
    }),
  ).toMatchObject({
    calculationScope: 'complete',
    summaryModifier: 0.95,
  });
});

test('capital trace uses the complete arc pool without requiring an aircraft fuselage', () => {
  const b = calculateLargeAerospaceBV({
    unitType: UnitType.DROPSHIP,
    structuralIntegrity: 1,
    totalArmorPoints: 1,
    maxThrust: 5,
    heatSinks: { type: HeatSinkType.SINGLE, count: 10 },
    equipment: [{ equipmentId: 'medium-laser', location: 'NOSE' }],
  });
  expect(b.calculationScope).toBe('complete');
  if (b.calculationScope !== 'complete') throw new Error('Incomplete probe');
  expect(largeAerospaceBVTerms(b)).toMatchObject({
    weaponBV: b.weaponFirePoolBV,
    offensiveEquipmentBV: 0,
    weightBV: 0,
    offensiveTypeModifier: 1,
    adjustment: 0,
  });
  expect(b.weaponFirePoolBV).toBeGreaterThan(0);
});
