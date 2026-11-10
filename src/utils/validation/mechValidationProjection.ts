/** React-free owner of editor construction selections and validation inputs. */
import type { UnitState } from '@/stores/unitState';
import type { IComponentSelections } from '@/stores/useMultiUnitStore.types';
import type { IValidatableUnit } from '@/types/validation/UnitValidationInterfaces';

import { getTotalAllocatedArmor } from '@/stores/unitState';
import { RulesLevel, Era, getEraForYear, TechBase } from '@/types/enums';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { getMaxTotalArmor } from '@/utils/construction/armorCalculations';
import { getEquipmentSlotIssues } from '@/utils/construction/slotOperations/placement';
import { getEquipmentPayloadWeight } from '@/utils/equipment/equipmentWeightAccounting';

import { buildArmorByLocation } from './armorValidationUtils';
import { buildSlotsByLocation } from './slotValidationUtils';

export type MechConstructionSelections = IComponentSelections &
  Pick<
    UnitState,
    | 'configuration'
    | 'lamType'
    | 'techBaseMode'
    | 'techBase'
    | 'tonnage'
    | 'armorTonnage'
  >;

/** Shared facts for weight, validity and the campaign construction adapter. */
export function getMechConstructionSelections(
  state: MechConstructionSelections,
): MechConstructionSelections {
  return {
    tonnage: state.tonnage,
    techBase: state.techBase,
    configuration: state.configuration,
    frankenStructure: state.frankenStructure,
    lamType: state.lamType,
    techBaseMode: state.techBaseMode,
    engineType: state.engineType,
    engineRating: state.engineRating,
    gyroType: state.gyroType,
    internalStructureType: state.internalStructureType,
    cockpitType: state.cockpitType,
    heatSinkType: state.heatSinkType,
    heatSinkCount: state.heatSinkCount,
    armorType: state.armorType,
    armorTonnage: state.armorTonnage,
    jumpMP: state.jumpMP,
    jumpJetType: state.jumpJetType,
  };
}

export function projectMechMetadata(
  state: Pick<
    UnitState,
    'id' | 'name' | 'unitType' | 'techBase' | 'rulesLevel' | 'year'
  > & {
    extinctionYear?: number;
    cost?: number;
    battleValue?: number;
  },
) {
  return {
    id: state.id || 'new-unit',
    name: state.name || 'Unnamed',
    unitType: state.unitType || UnitType.BATTLEMECH,
    techBase: state.techBase || TechBase.INNER_SPHERE,
    rulesLevel: state.rulesLevel || RulesLevel.STANDARD,
    year: state.year || 3025,
    era: state.year ? getEraForYear(state.year) : Era.DARK_AGE,
    extinctionYear: state.extinctionYear,
    cost: state.cost ?? 0,
    battleValue: state.battleValue ?? 0,
  };
}

export function projectMechArmor(
  state: Pick<UnitState, 'tonnage' | 'configuration' | 'armorAllocation'>,
) {
  const tonnage = state.tonnage || 20;
  return {
    totalArmorPoints: getTotalAllocatedArmor(
      state.armorAllocation,
      state.configuration,
    ),
    maxArmorPoints: getMaxTotalArmor(tonnage, state.configuration),
    armorByLocation: buildArmorByLocation(
      state.armorAllocation,
      tonnage,
      state.configuration,
    ),
  };
}

export function projectMechStructure(selections: MechConstructionSelections) {
  return {
    engineType: selections.engineType,
    gyroType: selections.gyroType,
    cockpitType: selections.cockpitType,
    internalStructureType: selections.internalStructureType,
    armorType: selections.armorType,
    techBaseMode: selections.techBaseMode,
    heatSinkCount: selections.heatSinkCount,
    heatSinkType: selections.heatSinkType,
  };
}

export interface MechEquipmentDependencies {
  equipmentRegistryReady: boolean;
  equipmentCatalog: NonNullable<IValidatableUnit['equipmentCatalog']>;
}

export function projectMechEquipment(
  state: Pick<
    UnitState,
    | 'equipment'
    | 'configuration'
    | 'engineType'
    | 'gyroType'
    | 'cockpitType'
    | 'armActuators'
  >,
  dependencies: MechEquipmentDependencies,
) {
  return {
    mountedEquipment: state.equipment,
    equipmentCatalog: dependencies.equipmentRegistryReady
      ? dependencies.equipmentCatalog
      : [],
    slotsByLocation: buildSlotsByLocation(state.equipment, state.configuration),
    equipmentSlotIssues: getEquipmentSlotIssues(
      state.equipment,
      state.configuration,
      state.engineType,
      state.gyroType,
      state.armActuators,
      state.cockpitType,
    ),
  };
}

export function projectMechWeight(
  state: Pick<UnitState, 'tonnage' | 'equipment'>,
  totalStructuralWeight: number,
) {
  const maxWeight = state.tonnage || 20;
  const equipmentWeight = getEquipmentPayloadWeight(state.equipment);
  const allocatedWeight = totalStructuralWeight + equipmentWeight;
  return {
    allocatedWeight,
    maxWeight,
    structuralWeight: totalStructuralWeight,
    equipmentWeight,
    remainingWeight: maxWeight - allocatedWeight,
    isValid: allocatedWeight <= maxWeight,
  };
}

/** Weight remains supplied by useUnitCalculations; its complete sum has no pure owner. */
export interface MechValidationDependencies extends MechEquipmentDependencies {
  totalStructuralWeight: number;
}

export function projectMechValidation(
  state: UnitState,
  dependencies: MechValidationDependencies,
): IValidatableUnit {
  const selections = getMechConstructionSelections(state);
  const metadata = projectMechMetadata(state);
  const weight = projectMechWeight(
    { tonnage: selections.tonnage, equipment: state.equipment },
    dependencies.totalStructuralWeight,
  );
  return {
    id: metadata.id,
    name: metadata.name,
    unitType: metadata.unitType,
    techBase: metadata.techBase,
    rulesLevel: metadata.rulesLevel,
    era: metadata.era,
    introductionYear: metadata.year,
    extinctionYear: metadata.extinctionYear,
    weight: weight.maxWeight,
    cost: metadata.cost,
    battleValue: metadata.battleValue,
    ...projectMechStructure(selections),
    ...projectMechArmor({
      ...selections,
      armorAllocation: state.armorAllocation,
    }),
    allocatedWeight: weight.allocatedWeight,
    maxWeight: weight.maxWeight,
    ...projectMechEquipment(
      {
        ...selections,
        equipment: state.equipment,
        armActuators: state.armActuators,
      },
      dependencies,
    ),
  };
}
