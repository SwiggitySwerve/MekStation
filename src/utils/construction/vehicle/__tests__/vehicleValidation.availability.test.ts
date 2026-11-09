/** @spec openspec/changes/validate-combat-omni-turret-mechanisms/specs/vehicle-unit-system/spec.md */
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { EngineType } from '@/types/construction/EngineType';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';

import { VehicleStructureType } from '../structure';
import {
  validateVehicleConstruction,
  type VehicleValidationInput,
} from '../vehicleValidation';

const validationInput = (
  overrides: Partial<VehicleValidationInput>,
): VehicleValidationInput => ({
  tonnage: 50,
  motionType: GroundMotionType.TRACKED,
  engineType: EngineType.STANDARD,
  cruiseMP: 4,
  turretType: TurretType.SINGLE,
  turretEquipmentWeight: 10,
  turretStructureWeight: 1,
  secondaryTurretEquipmentWeight: 0,
  secondaryTurretStructureWeight: 0,
  armorType: ArmorTypeEnum.STANDARD,
  armorAllocation: {},
  crewSize: 4,
  energyWeaponWeight: 0,
  powerAmpWeight: 0,
  structureType: VehicleStructureType.STANDARD,
  ...overrides,
});

it('validates assigned Omni mass rather than ordinary derived equality', () => {
  const result = validateVehicleConstruction(
    validationInput({
      isOmni: true,
      baseChassisTurretWeight: 1,
      turretEquipmentWeight: 2.5,
      turretStructureWeight: 1,
    }),
  );
  expect(
    result.errors.filter((e) => e.ruleId === 'VAL-VEHICLE-TURRET'),
  ).toEqual([]);
});

it('checks raw allowance overload even when charged fractional mass matches', () => {
  const result = validateVehicleConstruction(
    validationInput({
      isOmni: true,
      baseChassisTurretWeight: 0.25,
      turretEquipmentWeight: 2.5,
      turretStructureWeight: 0.5,
    }),
  );
  expect(result.errors.some((e) => /allowance/i.test(e.message))).toBe(true);
});

it('validates explicitly installed secondary without requiring the primary DUAL label', () => {
  const result = validateVehicleConstruction(
    validationInput({
      turretType: TurretType.SINGLE,
      secondaryTurretType: TurretType.SINGLE,
      isOmni: true,
      baseChassisSecondaryTurretWeight: 0,
      secondaryTurretEquipmentWeight: 2.5,
      secondaryTurretStructureWeight: 0,
    }),
  );
  expect(
    result.errors.some((e) => /Secondary.*allowance/i.test(e.message)),
  ).toBe(true);
});

it('explicit absent secondary overrides a stale primary DUAL label', () => {
  const result = validateVehicleConstruction(
    validationInput({
      turretType: TurretType.DUAL,
      secondaryTurretType: TurretType.NONE,
      secondaryTurretEquipmentWeight: 20,
      secondaryTurretStructureWeight: 0,
    }),
  );
  expect(
    result.errors.filter((e) => e.ruleId === 'VAL-VEHICLE-TURRET'),
  ).toEqual([]);
});

it('retains known construction errors when dependent mass is incomplete', () => {
  const result = validateVehicleConstruction(
    validationInput({
      turretEquipmentWeight: null,
      turretStructureWeight: null,
      energyWeaponWeight: null,
      powerAmpWeight: null,
      crewSize: 0,
    }),
  );
  expect(result).toMatchObject({ isComplete: false, isValid: false });
  expect(result.errors.some((e) => e.ruleId === 'VAL-VEHICLE-CREW')).toBe(true);
  expect(
    result.errors.some(
      (e) =>
        e.ruleId === 'VAL-VEHICLE-TURRET' ||
        e.ruleId === 'VAL-VEHICLE-POWER-AMP',
    ),
  ).toBe(false);
});

it('never marks an otherwise valid incomplete configuration valid', () => {
  const result = validateVehicleConstruction(
    validationInput({
      secondaryTurretType: TurretType.SINGLE,
      secondaryTurretEquipmentWeight: null,
      secondaryTurretStructureWeight: null,
    }),
  );
  expect(result).toMatchObject({
    isComplete: false,
    isValid: false,
    errors: [],
  });
});

it.each([NaN, Infinity, -1])(
  'does not certify invalid amplifier mass %s',
  (mass) => {
    expect(
      validateVehicleConstruction(
        validationInput({ energyWeaponWeight: mass }),
      ),
    ).toMatchObject({ isComplete: false, isValid: false });
    expect(
      validateVehicleConstruction(validationInput({ powerAmpWeight: mass })),
    ).toMatchObject({ isComplete: false, isValid: false });
  },
);

it.each([NaN, Infinity, -1, null])(
  'does not certify invalid declared mechanism mass %s',
  (mass) => {
    const result = validateVehicleConstruction(
      validationInput({ turretStructureWeight: mass }),
    );
    expect(result).toMatchObject({ isComplete: false, isValid: false });
  },
);

it('reports absent-turret nonfinite allowance instead of certifying it', () => {
  const result = validateVehicleConstruction(
    validationInput({
      turretType: TurretType.NONE,
      isOmni: true,
      baseChassisTurretWeight: NaN,
    }),
  );
  expect(result).toMatchObject({ isComplete: false, isValid: false });
  expect(result.errors.some((e) => /allowance/i.test(e.message))).toBe(true);
});

it('keeps a known overload error while another dependent mass is unknown', () => {
  const result = validateVehicleConstruction(
    validationInput({
      isOmni: true,
      baseChassisTurretWeight: 0,
      turretStructureWeight: null,
      energyWeaponWeight: null,
    }),
  );
  expect(result).toMatchObject({ isComplete: false, isValid: false });
  expect(result.errors.some((e) => /allowance/i.test(e.message))).toBe(true);
});

it('marks complete ordinary and absent-turret Omni configurations complete', () => {
  expect(validateVehicleConstruction(validationInput({}))).toMatchObject({
    isComplete: true,
    isValid: true,
  });
  expect(
    validateVehicleConstruction(
      validationInput({
        turretType: TurretType.NONE,
        secondaryTurretType: TurretType.NONE,
        isOmni: true,
        baseChassisTurretWeight: 1,
        baseChassisSecondaryTurretWeight: 0.25,
        turretEquipmentWeight: null,
        secondaryTurretEquipmentWeight: null,
        turretStructureWeight: null,
        secondaryTurretStructureWeight: null,
      }),
    ),
  ).toMatchObject({ isComplete: true, isValid: true });
});

it('keeps a known charged mechanism incomplete while its allowance overload is unknown', () => {
  expect(
    validateVehicleConstruction(
      validationInput({
        isOmni: true,
        baseChassisTurretWeight: 1,
        turretEquipmentWeight: null,
        turretStructureWeight: 1,
      }),
    ),
  ).toMatchObject({ isComplete: false, isValid: false, errors: [] });
});

it('diagnoses a nonfinite secondary allowance even for an explicitly absent secondary', () => {
  const result = validateVehicleConstruction(
    validationInput({
      secondaryTurretType: TurretType.NONE,
      isOmni: true,
      baseChassisSecondaryTurretWeight: Infinity,
    }),
  );
  expect(result).toMatchObject({ isComplete: false, isValid: false });
  expect(
    result.errors.some((e) => /Secondary.*allowance/i.test(e.message)),
  ).toBe(true);
});

/** @spec openspec/changes/establish-all-unit-data-parity/specs/vehicle-unit-system/spec.md */
describe('pinned vehicle armor diagnostics', () => {
  const armorErrors = (overrides: Partial<VehicleValidationInput>) =>
    validateVehicleConstruction(validationInput(overrides)).errors.filter(
      (error) => error.ruleId.startsWith('VAL-VEHICLE-ARMOR'),
    );

  it('accepts a concentrated front allocation within the class total', () => {
    expect(armorErrors({ armorAllocation: { Front: 100 } })).toEqual([]);
  });

  it.each([
    [UnitType.VEHICLE, GroundMotionType.TRACKED, 50, 215],
    [UnitType.VTOL, GroundMotionType.VTOL, 30, 145],
    [UnitType.VEHICLE, GroundMotionType.TRACKED, 140, 530],
    [UnitType.SUPPORT_VEHICLE, GroundMotionType.TRACKED, 50, 104],
    [UnitType.SUPPORT_VEHICLE, GroundMotionType.NAVAL, 301, 19],
    [UnitType.SUPPORT_VEHICLE, GroundMotionType.SUBMARINE, 2, 4],
  ] as const)(
    'checks the class total for %s %s at %s tons',
    (unitType, motionType, tonnage, maximum) => {
      const input = { unitType, motionType, tonnage };
      expect(
        armorErrors({ ...input, armorAllocation: { Front: maximum } }),
      ).toEqual([]);
      expect(
        armorErrors({ ...input, armorAllocation: { Front: maximum + 1 } }),
      ).toEqual([
        expect.objectContaining({
          ruleId: 'VAL-VEHICLE-ARMOR-TOTAL',
          maximum,
          allocated: maximum + 1,
        }),
      ]);
    },
  );

  it('rejects three rotor armor while accepting two for combat and support VTOLs', () => {
    for (const unitType of [UnitType.VTOL, UnitType.SUPPORT_VEHICLE] as const) {
      const input = {
        unitType,
        motionType: GroundMotionType.VTOL,
        tonnage: 30,
      };
      expect(armorErrors({ ...input, armorAllocation: { Rotor: 2 } })).toEqual(
        [],
      );
      expect(armorErrors({ ...input, armorAllocation: { Rotor: 3 } })).toEqual([
        expect.objectContaining({
          ruleId: 'VAL-VEHICLE-ARMOR-LOC',
          location: 'Rotor',
          maximum: 2,
        }),
      ]);
    }
  });

  it('counts both installed turrets in one budget without separate turret maxima', () => {
    expect(
      armorErrors({
        secondaryTurretType: TurretType.SINGLE,
        armorAllocation: { Front: 15, Turret: 100, 'Turret 2': 100 },
      }),
    ).toEqual([]);
  });

  it('retains unavailable location guards', () => {
    expect(
      armorErrors({
        turretType: TurretType.NONE,
        turretEquipmentWeight: 0,
        turretStructureWeight: 0,
        armorAllocation: { Turret: 1 },
      }),
    ).toEqual([
      expect.objectContaining({
        ruleId: 'VAL-VEHICLE-ARMOR-LOC',
        location: 'Turret',
        maximum: 0,
      }),
    ]);
  });
});
