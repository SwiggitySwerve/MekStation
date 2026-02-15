import { ISelectionMemory } from '@/stores/unitState';
import { TechBaseComponent } from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';

import type {
  ComponentSelections,
  ComponentValidator,
} from './techBaseValidation';

import { COMPONENT_VALIDATORS } from './techBaseValidation';
import { COMPONENT_AFFECTED_SELECTIONS } from './techBaseValidation.mapping';

export function getValueWithMemory<T>(
  validator: ComponentValidator<T>,
  currentValue: T,
  techBase: TechBase,
  memoryValue?: T,
): T {
  if (memoryValue !== undefined && validator.isValid(memoryValue, techBase)) {
    return memoryValue;
  }

  if (validator.isValid(currentValue, techBase)) {
    return currentValue;
  }

  return validator.getDefault(techBase);
}

export function getValidatedSelectionUpdates(
  component: TechBaseComponent,
  newTechBase: TechBase,
  currentSelections: ComponentSelections,
): Partial<ComponentSelections> {
  const updates: Partial<ComponentSelections> = {};
  const affectedSelections = COMPONENT_AFFECTED_SELECTIONS[component];

  if (!affectedSelections || affectedSelections.length === 0) {
    return updates;
  }

  for (const selectionKey of affectedSelections) {
    switch (selectionKey) {
      case 'engineType':
        if (
          !COMPONENT_VALIDATORS.engine.isValid(
            currentSelections.engineType,
            newTechBase,
          )
        ) {
          updates.engineType =
            COMPONENT_VALIDATORS.engine.getDefault(newTechBase);
        }
        break;
      case 'gyroType':
        if (
          !COMPONENT_VALIDATORS.gyro.isValid(
            currentSelections.gyroType,
            newTechBase,
          )
        ) {
          updates.gyroType = COMPONENT_VALIDATORS.gyro.getDefault(newTechBase);
        }
        break;
      case 'internalStructureType':
        if (
          !COMPONENT_VALIDATORS.structure.isValid(
            currentSelections.internalStructureType,
            newTechBase,
          )
        ) {
          updates.internalStructureType =
            COMPONENT_VALIDATORS.structure.getDefault(newTechBase);
        }
        break;
      case 'cockpitType':
        if (
          !COMPONENT_VALIDATORS.cockpit.isValid(
            currentSelections.cockpitType,
            newTechBase,
          )
        ) {
          updates.cockpitType =
            COMPONENT_VALIDATORS.cockpit.getDefault(newTechBase);
        }
        break;
      case 'heatSinkType':
        if (
          !COMPONENT_VALIDATORS.heatSink.isValid(
            currentSelections.heatSinkType,
            newTechBase,
          )
        ) {
          updates.heatSinkType =
            COMPONENT_VALIDATORS.heatSink.getDefault(newTechBase);
        }
        break;
      case 'armorType':
        if (
          !COMPONENT_VALIDATORS.armor.isValid(
            currentSelections.armorType,
            newTechBase,
          )
        ) {
          updates.armorType =
            COMPONENT_VALIDATORS.armor.getDefault(newTechBase);
        }
        break;
    }
  }

  return updates;
}

export function getSelectionWithMemory(
  component: TechBaseComponent,
  newTechBase: TechBase,
  currentSelections: ComponentSelections,
  memory: ISelectionMemory,
): Partial<ComponentSelections> {
  const updates: Partial<ComponentSelections> = {};
  const affectedSelections = COMPONENT_AFFECTED_SELECTIONS[component];

  if (!affectedSelections || affectedSelections.length === 0) {
    return updates;
  }

  for (const selectionKey of affectedSelections) {
    switch (selectionKey) {
      case 'engineType': {
        const memoryValue = memory.engine[newTechBase];
        const newValue = getValueWithMemory(
          COMPONENT_VALIDATORS.engine,
          currentSelections.engineType,
          newTechBase,
          memoryValue,
        );
        if (newValue !== currentSelections.engineType) {
          updates.engineType = newValue;
        }
        break;
      }
      case 'gyroType': {
        const memoryValue = memory.gyro[newTechBase];
        const newValue = getValueWithMemory(
          COMPONENT_VALIDATORS.gyro,
          currentSelections.gyroType,
          newTechBase,
          memoryValue,
        );
        if (newValue !== currentSelections.gyroType) {
          updates.gyroType = newValue;
        }
        break;
      }
      case 'internalStructureType': {
        const memoryValue = memory.structure[newTechBase];
        const newValue = getValueWithMemory(
          COMPONENT_VALIDATORS.structure,
          currentSelections.internalStructureType,
          newTechBase,
          memoryValue,
        );
        if (newValue !== currentSelections.internalStructureType) {
          updates.internalStructureType = newValue;
        }
        break;
      }
      case 'cockpitType': {
        const memoryValue = memory.cockpit[newTechBase];
        const newValue = getValueWithMemory(
          COMPONENT_VALIDATORS.cockpit,
          currentSelections.cockpitType,
          newTechBase,
          memoryValue,
        );
        if (newValue !== currentSelections.cockpitType) {
          updates.cockpitType = newValue;
        }
        break;
      }
      case 'heatSinkType': {
        const memoryValue = memory.heatSink[newTechBase];
        const newValue = getValueWithMemory(
          COMPONENT_VALIDATORS.heatSink,
          currentSelections.heatSinkType,
          newTechBase,
          memoryValue,
        );
        if (newValue !== currentSelections.heatSinkType) {
          updates.heatSinkType = newValue;
        }
        break;
      }
      case 'armorType': {
        const memoryValue = memory.armor[newTechBase];
        const newValue = getValueWithMemory(
          COMPONENT_VALIDATORS.armor,
          currentSelections.armorType,
          newTechBase,
          memoryValue,
        );
        if (newValue !== currentSelections.armorType) {
          updates.armorType = newValue;
        }
        break;
      }
    }
  }

  return updates;
}
