import {
  initializeUnitValidationRules,
  resetUnitValidationRules,
} from '@/services/validation/initializeUnitValidation';
/**
 * Owner ruling 5: turret mass has no independent generic capacity.
 * @spec openspec/changes/establish-all-unit-data-parity/specs/unit-validation-framework/spec.md
 */
import * as publicRules from '@/services/validation/rules';
import { getUnitValidationRegistry } from '@/services/validation/UnitValidationRegistry';
import { TechBase, RulesLevel, Era } from '@/types/enums';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  UnitCategory,
  type IUnitValidationContext,
} from '@/types/validation/UnitValidationInterfaces';

beforeEach(() => {
  resetUnitValidationRules();
  initializeUnitValidationRules();
});
afterEach(() => resetUnitValidationRules());

it('does not register or publicly export the retired capacity rule', () => {
  expect(getUnitValidationRegistry().getRule('VAL-VEH-003')).toBeUndefined();
  expect(publicRules).not.toHaveProperty('VehicleTurretCapacity');
});

it.each([UnitType.VEHICLE, UnitType.SUPPORT_VEHICLE, UnitType.VTOL])(
  '%s ignores legacy turret capacity while still rejecting total weight overflow',
  (unitType) => {
    const unit = {
      id: 'legacy-turret',
      name: 'Legacy turret vehicle',
      unitType,
      techBase: TechBase.INNER_SPHERE,
      rulesLevel: RulesLevel.STANDARD,
      introductionYear: 3025,
      era: Era.LATE_SUCCESSION_WARS,
      weight: 50,
      cost: 1000000,
      battleValue: 600,
      engine: { type: 'Fusion', rating: 200 },
      motiveSystem: { type: unitType === UnitType.VTOL ? 'VTOL' : 'Tracked' },
      rotor: { type: 'Standard' },
      // A persisted legacy payload is accepted, without making its shape a domain contract.
      turret: { capacity: 5, usedWeight: 20 },
      maxWeight: 50,
    };
    for (const [allocatedWeight, expectedOverflowErrors] of [
      [50, 0],
      [51, 1],
    ]) {
      const context: IUnitValidationContext = {
        unit: { ...unit, allocatedWeight },
        unitType,
        unitCategory: UnitCategory.VEHICLE,
        techBase: unit.techBase,
        options: {},
        cache: new Map(),
      };
      const errors = getUnitValidationRegistry()
        .getRulesForUnitType(unitType)
        .filter((rule) => rule.canValidate(context))
        .flatMap((rule) => rule.validate(context).errors);
      expect(errors.filter((error) => error.ruleId === 'VAL-VEH-003')).toEqual(
        [],
      );
      expect(
        errors.filter((error) => error.ruleId === 'VAL-UNIV-014'),
      ).toHaveLength(expectedOverflowErrors);
    }
  },
);
