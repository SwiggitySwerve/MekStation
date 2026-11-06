/** @spec openspec/specs/unit-validation-framework/spec.md */
import { ARMOR_DEFINITIONS } from '@/types/construction/ArmorType';
import {
  COCKPIT_DEFINITIONS,
  getCockpitIntroductionYear,
} from '@/types/construction/CockpitType';
import { ENGINE_DEFINITIONS } from '@/types/construction/EngineType';
import { GYRO_DEFINITIONS } from '@/types/construction/GyroType';
import { INTERNAL_STRUCTURE_DEFINITIONS } from '@/types/construction/InternalStructureType';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { EquipmentCategory } from '@/types/equipment/EquipmentCategory';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { ValidationCategory } from '@/types/validation/rules/ValidationRuleInterfaces';
import {
  IValidatableUnit,
  IUnitValidationRuleDefinition,
  UnitValidationSeverity,
} from '@/types/validation/UnitValidationInterfaces';

import { createRuleError, createRuleResult } from '../ruleResults';

/** One live date accessor; catalog date corrections need no validator changes. */
export function getMechComponentIntroductionDates(
  unit: IValidatableUnit,
): readonly { name: string; introductionYear?: number }[] {
  const mixed = unit.techBaseMode === TechBaseMode.MIXED;
  const components: { name: string; introductionYear?: number }[] = [];
  const catalog = new Map((unit.equipmentCatalog ?? []).map((e) => [e.id, e]));
  for (const id of new Set(
    (unit.mountedEquipment ?? []).map((e) => e.equipmentId),
  )) {
    const equipment = catalog.get(id);
    if (!equipment || equipment.category === EquipmentCategory.AMMUNITION)
      continue;
    // Retrofittable EI/DNI cockpit modifications: TestEntity.java:1493-1497.
    if (
      /^(?:ei[- ]?interface|.*dni.*cockpit)/i.test(
        equipment.id + ' ' + equipment.name,
      )
    )
      continue;
    // A single-tech unit asks for its own date side (:1500-1503).
    if (!mixed && equipment.techBase !== unit.techBase) continue;
    components.push(equipment);
  }
  const cockpit = COCKPIT_DEFINITIONS.find((e) => e.type === unit.cockpitType);
  if (cockpit)
    components.push({
      name: cockpit.name,
      introductionYear: getCockpitIntroductionYear(
        cockpit.type,
        unit.techBase,
        mixed,
      ),
    });
  for (const definition of [
    INTERNAL_STRUCTURE_DEFINITIONS.find(
      (e) => e.type === unit.internalStructureType,
    ),
    ARMOR_DEFINITIONS.find((e) => e.type === unit.armorType),
    GYRO_DEFINITIONS.find((e) => e.type === unit.gyroType),
    ENGINE_DEFINITIONS.find((e) => e.type === unit.engineType),
  ]) {
    if (definition) components.push(definition);
  }
  return components;
}

// MegaMek 48fcb2f64 TestEntity.java:1471-1622. The verifier's margin is
// separate from the effective introduction dates owned by each definition.
export const BattleMechIntroductionYear: IUnitValidationRuleDefinition = {
  id: 'VAL-BM-011',
  name: 'Component Introduction Years',
  description:
    'Mech components must be introduced within five years of the validation year',
  category: ValidationCategory.ERA,
  priority: 20,
  applicableUnitTypes: [UnitType.BATTLEMECH, UnitType.OMNIMECH],
  validate({ unit, campaignYear }) {
    const year =
      campaignYear !== undefined && campaignYear > 0
        ? campaignYear
        : unit.introductionYear;
    const errors = getMechComponentIntroductionDates(unit)
      .filter(
        (e) =>
          e.introductionYear !== undefined && e.introductionYear > year + 5,
      )
      .map((e) =>
        createRuleError(
          this,
          UnitValidationSeverity.ERROR,
          `${e.name} has intro date of ${e.introductionYear}`,
          {
            field: 'introductionYear',
            expected: `<= ${year + 5}`,
            actual: String(e.introductionYear),
          },
        ),
      );
    return createRuleResult(this, { errors });
  },
};
