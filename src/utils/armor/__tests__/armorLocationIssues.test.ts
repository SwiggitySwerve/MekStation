import type {
  IUnitValidationContext,
  IUnitValidationResult,
} from '@/types/validation/UnitValidationInterfaces';

import { ArmorAllocationValidation } from '@/services/validation/rules/universal/ArmorAllocationValidation';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { getArmorLocationIssues } from '@/utils/armor/armorLocationIssues';
import { buildArmorByLocation } from '@/utils/validation/armorValidationUtils';

/** An Atlas AS7-D allocation (max 307), with overrides. */
function atlasResult(
  overrides: Partial<Record<string, number>> = {},
): IUnitValidationResult {
  const allocation = {
    [MechLocation.HEAD]: 9,
    [MechLocation.CENTER_TORSO]: 47,
    centerTorsoRear: 14,
    [MechLocation.LEFT_TORSO]: 32,
    leftTorsoRear: 10,
    [MechLocation.RIGHT_TORSO]: 32,
    rightTorsoRear: 10,
    [MechLocation.LEFT_ARM]: 34,
    [MechLocation.RIGHT_ARM]: 34,
    [MechLocation.LEFT_LEG]: 41,
    [MechLocation.RIGHT_LEG]: 41,
    ...overrides,
  };
  const context = {
    unit: { armorByLocation: buildArmorByLocation(allocation, 100) },
  } as unknown as IUnitValidationContext;
  return {
    results: [ArmorAllocationValidation.validate(context)],
  } as unknown as IUnitValidationResult;
}

describe('getArmorLocationIssues', () => {
  it('flags nothing without a validation result or on a well-armored unit', () => {
    expect(getArmorLocationIssues(null)).toEqual({});
    expect(getArmorLocationIssues(atlasResult())).toEqual({});
  });

  it('marks the location the rule warns about (Left Arm 12 / 34, 35%)', () => {
    const result = atlasResult({ [MechLocation.LEFT_ARM]: 12 });
    expect(result.results[0].warnings[0].message).toBe(
      'Left Arm has low armor (12/34, 35%)',
    );
    expect(getArmorLocationIssues(result)).toEqual({
      [MechLocation.LEFT_ARM]: 'warning',
    });
  });

  it('marks critical armor as an error and a low rear face on its torso', () => {
    expect(
      getArmorLocationIssues(
        atlasResult({ [MechLocation.RIGHT_LEG]: 0, centerTorsoRear: 5 }),
      ),
    ).toEqual({
      [MechLocation.RIGHT_LEG]: 'error',
      [MechLocation.CENTER_TORSO]: 'warning',
    });
  });

  it('keeps the error when a torso has a critical front and a low rear', () => {
    expect(
      getArmorLocationIssues(
        atlasResult({ [MechLocation.LEFT_TORSO]: 2, leftTorsoRear: 3 }),
      ),
    ).toEqual({ [MechLocation.LEFT_TORSO]: 'error' });
  });
});
