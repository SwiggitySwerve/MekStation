/** @spec openspec/changes/validate-combat-omni-turret-mechanisms/specs/vehicle-unit-system/spec.md */
import { TurretType as T } from '@/types/unit/VehicleInterfaces';

import {
  computeVehicleTurretMechanismWeight as mechanism,
  validateTurretWeight,
} from '../turret';

it.each([T.SINGLE, T.DUAL, T.CHIN])(
  'keeps %s ordinary rounding and ignores non-Omni assignments',
  (type) => {
    expect(
      mechanism({ type, equipmentWeight: 7, baseChassisWeight: NaN }),
    ).toEqual({ weight: 1, allowanceOverloaded: false, issues: [] });
  },
);
it.each([undefined, -1, 0, 0.25, 20, NaN])(
  'ignores non-Omni assignment %s for installed and absent turrets',
  (baseChassisWeight) => {
    expect(
      mechanism({ type: T.SINGLE, equipmentWeight: 2.5, baseChassisWeight })
        .weight,
    ).toBe(0.5);
    expect(
      mechanism({ type: T.NONE, equipmentWeight: null, baseChassisWeight })
        .weight,
    ).toBe(0);
  },
);
it.each([
  [undefined, 0.5, false],
  [-1, 0.5, false],
  [0, 0, true],
  [0.25, 0.5, true],
  [1, 1, false],
] as const)(
  'charges assignment %s independently of required mass',
  (baseChassisWeight, weight, allowanceOverloaded) => {
    expect(
      mechanism({
        type: T.SINGLE,
        equipmentWeight: 2.5,
        isOmni: true,
        baseChassisWeight,
      }),
    ).toEqual({ weight, allowanceOverloaded, issues: [] });
  },
);
it.each([
  [undefined, 0],
  [-1, 0],
  [0, 0],
  [0.25, 0.5],
  [1, 1],
] as const)(
  'charges absent-turret assignment %s without requiring retained equipment',
  (baseChassisWeight, weight) => {
    expect(
      mechanism({
        type: T.NONE,
        equipmentWeight: null,
        isOmni: true,
        baseChassisWeight,
      }),
    ).toEqual({ weight, allowanceOverloaded: false, issues: [] });
  },
);
it('keeps a known assigned charge while overload remains unknown', () => {
  expect(
    mechanism({
      type: T.CHIN,
      equipmentWeight: null,
      isOmni: true,
      baseChassisWeight: 0.25,
    }),
  ).toEqual({ weight: 0.5, allowanceOverloaded: null, issues: [] });
  expect(mechanism({ type: T.SINGLE, equipmentWeight: null })).toEqual({
    weight: null,
    allowanceOverloaded: null,
    issues: [],
  });
});
it.each([NaN, Infinity, -Infinity])(
  'diagnoses nonfinite assignment %s even without a turret',
  (baseChassisWeight) => {
    const result = mechanism({
      type: T.NONE,
      equipmentWeight: null,
      isOmni: true,
      baseChassisWeight,
    });
    expect(result).toMatchObject({ weight: null, allowanceOverloaded: null });
    expect(result.issues.join('; ')).toMatch(/allowance.*nonfinite/i);
  },
);
it.each([NaN, Infinity, -1])(
  'diagnoses invalid qualifying mass %s',
  (equipmentWeight) => {
    const result = mechanism({ type: T.SINGLE, equipmentWeight });
    expect(result.weight).toBeNull();
    expect(result.issues.join('; ')).toMatch(/equipment mass.*invalid/i);
  },
);
it.each([T.SPONSON_LEFT, T.SPONSON_RIGHT])(
  'keeps non-Omni %s but diagnoses Omni context',
  (type) => {
    expect(mechanism({ type, equipmentWeight: 10 }).weight).toBe(0.5);
    const result = mechanism({ type, equipmentWeight: 10, isOmni: true });
    expect(result.weight).toBeNull();
    expect(result.issues.join('; ')).toMatch(/unsupported/i);
  },
);
it('diagnoses an assigned support mechanism even when absent', () => {
  const result = mechanism({
    type: T.NONE,
    equipmentWeight: null,
    isOmni: true,
    isSupportVehicle: true,
    baseChassisWeight: 1,
  });
  expect(result.weight).toBeNull();
  expect(result.issues.join('; ')).toMatch(/support.*unsupported/i);
});
it('keeps an absent unassigned support mechanism known zero', () => {
  expect(
    mechanism({
      type: T.NONE,
      equipmentWeight: null,
      isOmni: true,
      isSupportVehicle: true,
    }),
  ).toEqual({ weight: 0, allowanceOverloaded: false, issues: [] });
});
it('diagnoses overflow after rounding a finite allowance', () => {
  const result = mechanism({
    type: T.SINGLE,
    equipmentWeight: 0,
    isOmni: true,
    baseChassisWeight: Number.MAX_VALUE,
  });
  expect(result.weight).toBeNull();
  expect(result.issues.join('; ')).toMatch(/rounded.*nonfinite/i);
});
it('does not turn unresolved mass into a mismatch error, but retains a known overload', () => {
  expect(validateTurretWeight(T.SINGLE, null, null)).toEqual([]);
  expect(
    validateTurretWeight(T.SINGLE, 2.5, null, {
      isOmni: true,
      baseChassisWeight: 0,
    }).some((e) => /allowance/i.test(e.message)),
  ).toBe(true);
});
