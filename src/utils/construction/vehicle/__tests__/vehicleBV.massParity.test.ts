import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import fixture from '../../../../../scripts/__tests__/fixtures/vehicle_aero_contract_bv.json';
import { calculateBattleValueForUnit } from '../../battleValueCalculations';
import { contractUnitToBVUnit } from '../../contractBVUnitAdapter';
import { calculateVehicleOffensiveBV } from '../vehicleBV';
import { baseInput } from './vehicleBV.test.helpers';

/** @spec establish-all-unit-data-parity/battle-value-system */
describe('Pinned MegaMek vehicle offensive mass contribution', () => {
  it('Tamerlane (Flamer), Java total 436: offense equals the Java component', () => {
    // UL-16 coord-r3/oracle/full.jsonl: Java defense 141.75, offense 293.76.
    // The remaining TS defense difference is outside this mass term.
    const result = calculateBattleValueForUnit(
      contractUnitToBVUnit(fixture.units[0].unit),
    );
    if (result?.kind !== 'vehicle') throw new Error('Expected vehicle BV');
    expect(result.breakdown.weaponBV).toBe(98);
    expect(result.breakdown.speedFactor).toBe(2.72);
    expect(result.breakdown.offensive).toBeCloseTo(293.76, 8);
  });

  it('Ferret VTOL (Cargo): unarmed offense includes mass before speed', () => {
    // Pinned source vehicles/3039u/Ferret Light Scout VTOL (Cargo).blk:
    // 5 tons, cruise 15, flank 23, no armor or equipment; Java offense 8.6.
    const result = calculateBattleValueForUnit(
      contractUnitToBVUnit({
        id: 'ferret-light-scout-vtol-cargo',
        unitType: UnitType.VTOL,
        tonnage: 5,
        motionType: GroundMotionType.VTOL,
        movement: { cruiseMP: 15, flankMP: 23 },
        armor: { type: 'STANDARD', byLocation: { ROTOR: 0 } },
        equipment: [],
      }),
    );
    if (result?.kind !== 'vehicle') throw new Error('Expected vehicle BV');
    expect(result.breakdown.weaponBV).toBe(0);
    expect(result.breakdown.offensive).toBeCloseTo(8.6, 8);
  });

  it.each([0, 0.06, 4.5, 200])(
    'uses raw tonnage %s without rounding or a weapon requirement',
    (tonnage) => {
      const result = calculateVehicleOffensiveBV(
        baseInput({ tonnage, flankMP: 5, barRating: 5 }),
      );
      expect(result.total).toBe(tonnage / 2);
    },
  );
});
