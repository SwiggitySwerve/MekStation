/**
 * Movement and speed-factor coverage for the Vehicle Battle Value calculator.
 *
 * Broader defensive, offensive, final BV, and canonical scenario coverage lives
 * in sibling test files to keep each suite focused and under scanner limits.
 */

import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';

import {
  calculateVehicleSpeedFactor,
  calculateVehicleTMM,
  getVehicleEffectiveMP,
} from '../vehicleBV';
import { baseInput } from './vehicleBV.test.helpers';

describe('Vehicle TMM', () => {
  it('tracked flank 6 -> TMM 2', () => {
    const tmm = calculateVehicleTMM(
      baseInput({ motionType: GroundMotionType.TRACKED, flankMP: 6 }),
    );
    expect(tmm).toBe(2);
  });

  it('hover flank 12 -> TMM 4', () => {
    const tmm = calculateVehicleTMM(
      baseInput({ motionType: GroundMotionType.HOVER, flankMP: 12 }),
    );
    expect(tmm).toBe(4);
  });

  it('VTOL flank 15 -> TMM 5 (4 base + 1 altitude)', () => {
    const tmm = calculateVehicleTMM(
      baseInput({ motionType: GroundMotionType.VTOL, flankMP: 15 }),
    );
    expect(tmm).toBe(5);
  });

  it('tracked flank 2 -> TMM 0', () => {
    const tmm = calculateVehicleTMM(
      baseInput({ motionType: GroundMotionType.TRACKED, flankMP: 2 }),
    );
    expect(tmm).toBe(0);
  });

  it('submarine uses submarineMP override when provided', () => {
    const mp = getVehicleEffectiveMP(
      baseInput({
        motionType: GroundMotionType.SUBMARINE,
        flankMP: 6,
        submarineMP: 3,
      }),
    );
    expect(mp).toBe(3);
  });
});

describe('Vehicle speed factor', () => {
  it('tracked flank 6 -> sf ~= 1.12', () => {
    const sf = calculateVehicleSpeedFactor(
      baseInput({ motionType: GroundMotionType.TRACKED, flankMP: 6 }),
    );
    expect(sf).toBeCloseTo(1.12, 2);
  });

  it('VTOL flank 15 -> sf ~= 2.30', () => {
    const sf = calculateVehicleSpeedFactor(
      baseInput({ motionType: GroundMotionType.VTOL, flankMP: 15 }),
    );
    expect(sf).toBeCloseTo(2.3, 2);
  });

  it('flank 5 -> sf = 1.00 (baseline)', () => {
    const sf = calculateVehicleSpeedFactor(
      baseInput({ motionType: GroundMotionType.TRACKED, flankMP: 5 }),
    );
    expect(sf).toBeCloseTo(1.0, 2);
  });
});
