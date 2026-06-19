import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';

import {
  computeCrewWeight,
  computeMinimumCrew,
  validateVehicleCrew,
} from '../crew';

const GROUND_CREW_MOTION_TYPES = [
  GroundMotionType.TRACKED,
  GroundMotionType.WHEELED,
  GroundMotionType.HOVER,
  GroundMotionType.WIGE,
  GroundMotionType.RAIL,
  GroundMotionType.MAGLEV,
] satisfies GroundMotionType[];

const NAVAL_CREW_MOTION_TYPES = [
  GroundMotionType.NAVAL,
  GroundMotionType.SUBMARINE,
  GroundMotionType.HYDROFOIL,
] satisfies GroundMotionType[];

describe('vehicle crew construction', () => {
  it.each(GROUND_CREW_MOTION_TYPES)(
    'uses the standard ground crew table for %s vehicles',
    (motionType) => {
      expect(computeMinimumCrew(10, motionType)).toBe(1);
      expect(computeMinimumCrew(20, motionType)).toBe(2);
      expect(computeMinimumCrew(40, motionType)).toBe(3);
      expect(computeMinimumCrew(80, motionType)).toBe(4);
      expect(computeMinimumCrew(100, motionType)).toBe(5);
      expect(computeMinimumCrew(101, motionType)).toBe(6);
    },
  );

  it('keeps VTOL minimum crew fixed regardless of tonnage', () => {
    expect(computeMinimumCrew(4, GroundMotionType.VTOL)).toBe(2);
    expect(computeMinimumCrew(30, GroundMotionType.VTOL)).toBe(2);
    expect(computeMinimumCrew(200, GroundMotionType.VTOL)).toBe(2);
  });

  it.each(NAVAL_CREW_MOTION_TYPES)(
    'adds naval crew growth above 100 tons for %s vehicles',
    (motionType) => {
      expect(computeMinimumCrew(100, motionType)).toBe(5);
      expect(computeMinimumCrew(199, motionType)).toBe(5);
      expect(computeMinimumCrew(200, motionType)).toBe(6);
      expect(computeMinimumCrew(300, motionType)).toBe(7);
    },
  );

  it('falls back to the standard ground crew table for unknown motion values', () => {
    const unknownMotionType = 'Experimental' as GroundMotionType;

    expect(computeMinimumCrew(50, unknownMotionType)).toBe(4);
  });

  it('keeps crew weight as a no-op construction value', () => {
    expect(computeCrewWeight(6)).toBe(0);
  });

  it('validates configured crew against the resolved minimum', () => {
    const validResult = validateVehicleCrew(50, GroundMotionType.TRACKED, 4);
    const invalidResult = validateVehicleCrew(50, GroundMotionType.TRACKED, 3);

    expect(validResult).toEqual({
      isValid: true,
      minimumCrew: 4,
      errors: [],
    });
    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.minimumCrew).toBe(4);
    expect(invalidResult.errors).toHaveLength(1);
    expect(invalidResult.errors[0]).toMatchObject({
      ruleId: 'VAL-VEHICLE-CREW',
      message: expect.stringContaining(
        'Vehicle requires at least 4 crew members',
      ),
    });
    expect(invalidResult.errors[0].message).toContain('only 3 configured');
  });
});
