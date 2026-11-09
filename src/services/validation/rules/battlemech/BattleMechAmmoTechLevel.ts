/** @spec openspec/specs/unit-validation-framework/spec.md */
import { compareRulesLevels, RulesLevel } from '@/types/enums/RulesLevel';
import { EquipmentCategory } from '@/types/equipment/EquipmentCategory';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { ValidationCategory } from '@/types/validation/rules/ValidationRuleInterfaces';
import {
  IUnitValidationError,
  IUnitValidationRuleDefinition,
  UnitValidationSeverity,
} from '@/types/validation/UnitValidationInterfaces';

import {
  createEmptyRuleResult,
  createRuleError,
  createRuleResult,
} from '../ruleResults';

// MegaMek 48fcb2f64 TestEntity.java:1271-1286, called by TestMek.java:766.
export const BattleMechAmmoTechLevel: IUnitValidationRuleDefinition = {
  id: 'VAL-BM-012',
  name: 'Introductory Ammunition Tech Level',
  description: 'Introductory mechs must use introductory ammunition',
  category: ValidationCategory.EQUIPMENT,
  priority: 21,
  applicableUnitTypes: [UnitType.BATTLEMECH, UnitType.OMNIMECH],
  validate({ unit }) {
    if (unit.rulesLevel !== RulesLevel.INTRODUCTORY)
      return createEmptyRuleResult(this);
    const definitions = new Map(
      (unit.equipmentCatalog ?? []).map((item) => [item.id, item]),
    );
    const errors: IUnitValidationError[] = [];
    for (const mounted of unit.mountedEquipment ?? []) {
      const ammunition = definitions.get(mounted.equipmentId);
      if (
        ammunition?.category === EquipmentCategory.AMMUNITION &&
        compareRulesLevels(ammunition.rulesLevel, unit.rulesLevel) > 0
      ) {
        errors.push(
          createRuleError(
            this,
            UnitValidationSeverity.ERROR,
            `Ammo illegal at unit's tech level (${unit.rulesLevel}, ${unit.introductionYear}): ${ammunition.name}`,
            {
              field: 'mountedEquipment',
              expected: `<= ${unit.rulesLevel}`,
              actual: ammunition.rulesLevel,
              details: { equipmentId: ammunition.id },
            },
          ),
        );
      }
    }
    return createRuleResult(this, { errors });
  },
};
