import type { VehicleTurretKind } from '../vehicleBV';

import fixture from '../../../../../scripts/__tests__/fixtures/vehicle_aero_contract_bv.json';
import { calculateBattleValueForUnit } from '../../battleValueCalculations';
import {
  contractUnitToBVUnit,
  type IContractBVSource,
} from '../../contractBVUnitAdapter';
import { calculateVehicleOffensiveBV } from '../vehicleBV';
import { baseInput } from './vehicleBV.test.helpers';

/** @spec establish-all-unit-data-parity/battle-value-system */
describe('Pinned MegaMek combat-vehicle turret weapon BV', () => {
  it('Tamerlane (Flamer), Java BV 436: the two turret lasers retain their listed BV', () => {
    // UL-16 coord-r3/oracle/full.jsonl, vehicles/3075/Tamerlane Strike Sled
    // (Flamer).blk: Java defense 141.75, offense 293.76, total 436.
    // Only the turret term is asserted; other TS BV terms still differ.
    const result = calculateBattleValueForUnit(
      // The fixture's inferred JSON union is wider than the adapter input type.
      contractUnitToBVUnit(fixture.units[0].unit as IContractBVSource),
    );
    if (result?.kind !== 'vehicle') throw new Error('Expected vehicle BV');
    expect(result.breakdown.weaponBV).toBe(98); // Flamer 6 + 2 medium lasers at 46.
    expect(result.breakdown.turretModifier).toBe(1);
  });

  it.each<VehicleTurretKind>(['single', 'dual', 'chin'])(
    '%s turret preserves weapon BV and excludes the rear penalty',
    (kind) => {
      const result = calculateVehicleOffensiveBV(
        baseInput({
          turret: { kind },
          weapons: [
            {
              id: 'ppc',
              location: 'turret',
              bvOverride: 176,
              isTurretMounted: true,
              isRearMounted: true,
            },
          ],
        }),
      );
      expect(result.weaponBV).toBe(176);
      expect(result.turretModifier).toBe(1);
    },
  );
});
