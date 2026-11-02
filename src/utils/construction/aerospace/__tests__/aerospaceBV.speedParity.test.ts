import { AerospaceSubType } from '@/types/unit/AerospaceInterfaces';

import {
  calculateAerospaceBV,
  calculateAerospaceSpeedFactor,
} from '../aerospaceBV';
import { calculateMaxThrust } from '../thrustCalculations';

/**
 * MegaMek 48fcb2f64: AeroBVCalculator.java:183-186;
 * Entity.java:4015-4017; BVCalculator.java:1129-1132.
 * @spec establish-all-unit-data-parity: Aerospace Speed Factor
 */
describe('aerospace airborne run-MP speed parity', () => {
  it.each([
    [AerospaceSubType.AEROSPACE_FIGHTER, false],
    [AerospaceSubType.CONVENTIONAL_FIGHTER, false],
    [AerospaceSubType.CONVENTIONAL_FIGHTER, true],
    [AerospaceSubType.SMALL_CRAFT, false],
  ] as const)(
    '%s (support %s) consumes upward-rounded max thrust',
    (subType, isSupportVehicle) => {
      for (const [safeThrust, maxThrust, speedFactor] of [
        [0, 0, 0.44],
        [3, 5, 1],
        [5, 8, 1.37],
        [11, 17, 2.58],
      ]) {
        expect(calculateMaxThrust(safeThrust)).toBe(maxThrust);
        const result = calculateAerospaceBV({
          subType,
          isSupportVehicle,
          safeThrust,
          maxThrust,
          tonnage: 25,
          structuralIntegrity: 5,
          totalArmorPoints: 10,
          armorType: 'standard',
          equipment: [],
          offensiveEquipmentBV: 100,
        });
        expect(result.avgThrust).toBe((safeThrust + maxThrust) / 2);
        expect(result.speedFactor).toBe(speedFactor);
        expect(result.offensive).toBeCloseTo(100 * speedFactor, 10);
        expect(result.final).toBe(
          Math.round(result.defensive + result.offensive),
        );
      }
    },
  );

  it('does not let the compatibility mean affect speed at fixed max thrust', () => {
    expect(calculateAerospaceSpeedFactor(5, 8).speedFactor).toBe(1.37);
    expect(calculateAerospaceSpeedFactor(4, 8).speedFactor).toBe(1.37);
  });
});
