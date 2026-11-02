/** @spec openspec/changes/validate-combat-omni-turret-mechanisms/specs/vehicle-unit-system/spec.md */
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { EngineType } from '@/types/construction/EngineType';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
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
