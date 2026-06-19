import { EquipmentBehaviorFlag } from '@/types/enums/EquipmentFlag';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { ValidationCategory } from '@/types/validation/rules/ValidationRuleInterfaces';
import {
  IUnitValidationRuleDefinition,
  IUnitValidationContext,
  IUnitValidationRuleResult,
  IUnitValidationError,
  UnitValidationSeverity,
} from '@/types/validation/UnitValidationInterfaces';

import {
  createRuleResult,
  createEmptyRuleResult,
  addRuleDiagnostic,
} from '../ruleResults';
import { IValidatableEquipmentItem } from './EquipmentUnitTypeRuleTypes';

const EQUIPMENT_UNIT_TYPE_RULE_CONSTRAINT_CHECKS_EQUIPMENT_CATEGORY =
  ValidationCategory.EQUIPMENT;

interface IEquipmentIncompatibility {
  readonly source: string;
  readonly incompatibleWith: readonly string[];
  readonly reason: string;
}

const EQUIPMENT_INCOMPATIBILITIES: readonly IEquipmentIncompatibility[] = [
  {
    source: EquipmentBehaviorFlag.Masc,
    incompatibleWith: [
      EquipmentBehaviorFlag.Tsm,
      EquipmentBehaviorFlag.IndustrialTsm,
    ],
    reason: 'MASC cannot be combined with Triple Strength Myomer',
  },
  {
    source: EquipmentBehaviorFlag.Tsm,
    incompatibleWith: [EquipmentBehaviorFlag.IndustrialTsm],
    reason: 'Standard TSM cannot be combined with Industrial TSM',
  },
  {
    source: EquipmentBehaviorFlag.Stealth,
    incompatibleWith: [EquipmentBehaviorFlag.HeatSink],
    reason: 'Stealth armor has special heat sink requirements',
  },
  {
    source: EquipmentBehaviorFlag.C3s,
    incompatibleWith: [EquipmentBehaviorFlag.C3i],
    reason: 'C3 Slave cannot be combined with C3 Improved',
  },
];

export const IncompatibleEquipmentCheck: IUnitValidationRuleDefinition = {
  id: 'VAL-EQUIP-UNIT-004',
  name: 'Incompatible Equipment Check',
  description: 'Mutually exclusive equipment cannot be mounted together',
  category: EQUIPMENT_UNIT_TYPE_RULE_CONSTRAINT_CHECKS_EQUIPMENT_CATEGORY,
  applicableUnitTypes: 'ALL',
  priority: 103,

  canValidate(context: IUnitValidationContext): boolean {
    const unit = context.unit as {
      equipment?: readonly IValidatableEquipmentItem[];
    };
    return unit.equipment !== undefined && unit.equipment.length > 1;
  },

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const unit = context.unit as {
      equipment?: readonly IValidatableEquipmentItem[];
    };
    const errors: IUnitValidationError[] = [];

    if (!unit.equipment || unit.equipment.length < 2) {
      return createEmptyRuleResult(this);
    }

    const equipmentIds = new Set<string>();
    const equipmentFlags = new Set<string>();
    const equipmentByIdOrFlag = new Map<string, IValidatableEquipmentItem>();

    for (const item of unit.equipment) {
      equipmentIds.add(item.equipmentId);
      equipmentByIdOrFlag.set(item.equipmentId, item);

      if (item.flags) {
        for (const flag of item.flags) {
          equipmentFlags.add(flag);
          equipmentByIdOrFlag.set(flag, item);
        }
      }
    }

    for (const incompatibility of EQUIPMENT_INCOMPATIBILITIES) {
      const hasSource =
        equipmentIds.has(incompatibility.source) ||
        equipmentFlags.has(incompatibility.source);

      if (!hasSource) {
        continue;
      }

      for (const incompatible of incompatibility.incompatibleWith) {
        const hasIncompatible =
          equipmentIds.has(incompatible) || equipmentFlags.has(incompatible);

        if (hasIncompatible) {
          const sourceItem = equipmentByIdOrFlag.get(incompatibility.source);
          const incompatItem = equipmentByIdOrFlag.get(incompatible);

          addRuleDiagnostic(
            errors,
            this,
            UnitValidationSeverity.ERROR,
            incompatibility.reason,
            {
              field: 'equipment',
              expected: `Only one of: ${incompatibility.source} or ${incompatible}`,
              actual: 'Both present',
              suggestion: `Remove either ${sourceItem?.name || incompatibility.source} or ${incompatItem?.name || incompatible}`,
              details: {
                source: incompatibility.source,
                incompatible,
              },
            },
          );
        }
      }
    }

    return createRuleResult(this, { errors });
  },
};

interface IRequiredEquipment {
  readonly unitTypes: readonly UnitType[];
  readonly requiredEquipment: string;
  readonly minQuantity: number;
  readonly condition?: string;
  readonly suggestion: string;
}

const REQUIRED_EQUIPMENT: readonly IRequiredEquipment[] = [
  {
    unitTypes: [
      UnitType.BATTLEMECH,
      UnitType.OMNIMECH,
      UnitType.INDUSTRIALMECH,
    ],
    requiredEquipment: EquipmentBehaviorFlag.HeatSink,
    minQuantity: 10,
    condition: 'Unless using an engine with 10+ integral heat sinks',
    suggestion: 'Add heat sinks to meet the minimum requirement of 10',
  },
];

export const RequiredEquipmentCheck: IUnitValidationRuleDefinition = {
  id: 'VAL-EQUIP-UNIT-005',
  name: 'Required Equipment Check',
  description: 'Validates required equipment is present for unit type',
  category: EQUIPMENT_UNIT_TYPE_RULE_CONSTRAINT_CHECKS_EQUIPMENT_CATEGORY,
  applicableUnitTypes: 'ALL',
  priority: 104,

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const unit = context.unit as {
      equipment?: readonly IValidatableEquipmentItem[];
      heatSinkCount?: number;
    };
    const warnings: IUnitValidationError[] = [];

    const unitType = context.unitType;

    for (const requirement of REQUIRED_EQUIPMENT) {
      if (!requirement.unitTypes.includes(unitType)) {
        continue;
      }

      if (requirement.requiredEquipment === EquipmentBehaviorFlag.HeatSink) {
        const heatSinkCount = unit.heatSinkCount ?? 0;

        if (heatSinkCount < requirement.minQuantity) {
          addRuleDiagnostic(
            warnings,
            this,
            UnitValidationSeverity.WARNING,
            `${unitType} requires minimum ${requirement.minQuantity} heat sinks`,
            {
              field: 'heatSinkCount',
              expected: `>= ${requirement.minQuantity}`,
              actual: String(heatSinkCount),
              suggestion: requirement.suggestion,
              details: {
                condition: requirement.condition,
              },
            },
          );
        }
      }
    }

    return createRuleResult(this, { warnings });
  },
};
