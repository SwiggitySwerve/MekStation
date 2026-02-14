import { EquipmentBehaviorFlag } from '@/types/enums/EquipmentFlag';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { ValidationCategory } from '@/types/validation/rules/ValidationRuleInterfaces';
import {
  IUnitValidationRuleDefinition,
  IUnitValidationContext,
  IUnitValidationRuleResult,
  UnitValidationSeverity,
  createUnitValidationError,
  createUnitValidationRuleResult,
  createPassingResult,
} from '@/types/validation/UnitValidationInterfaces';

import { IValidatableEquipmentItem } from './EquipmentUnitTypeRuleTypes';

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
  category: ValidationCategory.EQUIPMENT,
  priority: 103,
  applicableUnitTypes: 'ALL',

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
    const errors: ReturnType<typeof createUnitValidationError>[] = [];

    if (!unit.equipment || unit.equipment.length < 2) {
      return createPassingResult(this.id, this.name);
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

          errors.push(
            createUnitValidationError(
              this.id,
              this.name,
              UnitValidationSeverity.ERROR,
              this.category,
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
            ),
          );
        }
      }
    }

    return createUnitValidationRuleResult(
      this.id,
      this.name,
      errors,
      [],
      [],
      0,
    );
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
  category: ValidationCategory.EQUIPMENT,
  priority: 104,
  applicableUnitTypes: 'ALL',

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const unit = context.unit as {
      equipment?: readonly IValidatableEquipmentItem[];
      heatSinkCount?: number;
    };
    const warnings: ReturnType<typeof createUnitValidationError>[] = [];

    const unitType = context.unitType;

    for (const requirement of REQUIRED_EQUIPMENT) {
      if (!requirement.unitTypes.includes(unitType)) {
        continue;
      }

      if (requirement.requiredEquipment === EquipmentBehaviorFlag.HeatSink) {
        const heatSinkCount = unit.heatSinkCount ?? 0;

        if (heatSinkCount < requirement.minQuantity) {
          warnings.push(
            createUnitValidationError(
              this.id,
              this.name,
              UnitValidationSeverity.WARNING,
              this.category,
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
            ),
          );
        }
      }
    }

    return createUnitValidationRuleResult(
      this.id,
      this.name,
      [],
      warnings,
      [],
      0,
    );
  },
};
