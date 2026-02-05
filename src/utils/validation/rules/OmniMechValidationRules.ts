import {
  IValidationRuleDefinition,
  IValidationRuleResult,
  IValidationContext,
  ValidationCategory,
  ValidationSeverity,
} from '../../../types/validation/rules/ValidationRuleInterfaces';
import { pass, fail, warn } from './validationHelpers';

export const OmniMechBaseHeatSinksRule: IValidationRuleDefinition = {
  id: 'configuration.omnimech.base_heat_sinks',
  name: 'OmniMech Base Heat Sinks',
  description:
    'Validates that base chassis heat sinks do not exceed total heat sinks',
  category: ValidationCategory.CONSTRUCTION,
  priority: 10,

  canValidate(context: IValidationContext): boolean {
    const unit = context.unit as Record<string, unknown>;
    return unit.isOmni === true;
  },

  validate(context: IValidationContext): IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const baseChassisHeatSinks = unit.baseChassisHeatSinks as
      | number
      | undefined;
    const heatSinkCount = unit.heatSinkCount as number | undefined;

    if (baseChassisHeatSinks === undefined || baseChassisHeatSinks === -1) {
      return pass(this.id);
    }

    if (heatSinkCount !== undefined && baseChassisHeatSinks > heatSinkCount) {
      return fail(this.id, [
        {
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.ERROR,
          category: this.category,
          message: `Base chassis heat sinks (${baseChassisHeatSinks}) cannot exceed total heat sinks (${heatSinkCount})`,
          path: 'baseChassisHeatSinks',
          expected: `<= ${heatSinkCount}`,
          actual: `${baseChassisHeatSinks}`,
          suggestion:
            'Reduce base chassis heat sinks or increase total heat sink count',
        },
      ]);
    }

    return pass(this.id);
  },
};

export const OmniMechBaseHeatSinksValidRule: IValidationRuleDefinition = {
  id: 'configuration.omnimech.base_heat_sinks_valid',
  name: 'OmniMech Base Heat Sinks Valid',
  description: 'Validates that base chassis heat sinks value is valid',
  category: ValidationCategory.CONSTRUCTION,
  priority: 10,

  canValidate(context: IValidationContext): boolean {
    const unit = context.unit as Record<string, unknown>;
    return unit.isOmni === true;
  },

  validate(context: IValidationContext): IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const baseChassisHeatSinks = unit.baseChassisHeatSinks as
      | number
      | undefined;

    if (baseChassisHeatSinks === undefined || baseChassisHeatSinks === -1) {
      return pass(this.id);
    }

    if (baseChassisHeatSinks < 0) {
      return fail(this.id, [
        {
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.ERROR,
          category: this.category,
          message: `Base chassis heat sinks cannot be negative (got ${baseChassisHeatSinks})`,
          path: 'baseChassisHeatSinks',
          expected: '>= 0 or -1 for auto',
          actual: `${baseChassisHeatSinks}`,
          suggestion:
            'Set base chassis heat sinks to 0 or higher, or use -1 for auto',
        },
      ]);
    }

    return pass(this.id);
  },
};

export const OmniMechFixedEquipmentRule: IValidationRuleDefinition = {
  id: 'configuration.omnimech.fixed_equipment',
  name: 'OmniMech Fixed Equipment',
  description: 'Warns if OmniMech has no fixed equipment defined',
  category: ValidationCategory.CONSTRUCTION,
  priority: 50,

  canValidate(context: IValidationContext): boolean {
    const unit = context.unit as Record<string, unknown>;
    return unit.isOmni === true;
  },

  validate(context: IValidationContext): IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const equipment = unit.equipment as
      | Array<Record<string, unknown>>
      | undefined;

    if (!equipment || equipment.length === 0) {
      return pass(this.id);
    }

    const hasFixedEquipment = equipment.some(
      (item) => item.isOmniPodMounted !== true,
    );

    if (!hasFixedEquipment) {
      return warn(this.id, [
        {
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.WARNING,
          category: this.category,
          message: 'OmniMech has no fixed (chassis-mounted) equipment',
          path: 'equipment',
          suggestion:
            'Mark some equipment as fixed to define the base chassis configuration',
        },
      ]);
    }

    return pass(this.id);
  },
};

export const OmniMechValidationRules = [
  OmniMechBaseHeatSinksRule,
  OmniMechBaseHeatSinksValidRule,
  OmniMechFixedEquipmentRule,
];
