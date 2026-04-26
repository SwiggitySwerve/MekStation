/**
 * Tech Base Validation - Shared Types & Validator Registry
 *
 * Leaf module that defines the public selection shape, the
 * `ComponentValidator<T>` contract, the `createValidator` factory,
 * and the `COMPONENT_VALIDATORS` registry. Both `techBaseValidation.helpers.ts`
 * and `techBaseValidation.mapping.ts` depend on this module instead of
 * the orchestrator (`techBaseValidation.ts`), which previously formed
 * a 3-way cycle: orchestrator <-> helpers <-> mapping <-> orchestrator.
 *
 * This file must not import from `./techBaseValidation`,
 * `./techBaseValidation.helpers`, or `./techBaseValidation.mapping` —
 * it is a leaf.
 *
 * @spec openspec/specs/component-configuration/spec.md
 * @spec openspec/specs/tech-base-integration/spec.md
 */

import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { CockpitType } from '@/types/construction/CockpitType';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import { TechBase } from '@/types/enums/TechBase';

import {
  filterArmorTypes,
  filterCockpitTypes,
  filterEngineTypes,
  filterGyroTypes,
  filterHeatSinkTypes,
  filterStructureTypes,
} from './techBaseValidation.filters';

// =============================================================================
// Component Selections Interface
// =============================================================================

export interface ComponentSelections {
  engineType: EngineType;
  gyroType: GyroType;
  internalStructureType: InternalStructureType;
  cockpitType: CockpitType;
  heatSinkType: HeatSinkType;
  armorType: ArmorTypeEnum;
}

// =============================================================================
// Component Validator Interface
// =============================================================================

export interface ComponentValidator<T> {
  getValidTypes: (techBase: TechBase) => T[];
  isValid: (value: T, techBase: TechBase) => boolean;
  getDefault: (techBase: TechBase) => T;
  fallbackDefault: T;
}

/**
 * Create a validator for a component type
 */
function createValidator<T>(
  filterFn: (techBase: TechBase) => T[],
  fallbackDefault: T,
): ComponentValidator<T> {
  return {
    getValidTypes: filterFn,
    isValid: (value: T, techBase: TechBase) =>
      filterFn(techBase).includes(value),
    getDefault: (techBase: TechBase) =>
      filterFn(techBase)[0] ?? fallbackDefault,
    fallbackDefault,
  };
}

// =============================================================================
// Component Validators Registry
// =============================================================================

/**
 * Registry of all component validators
 * Add new component types here to integrate them into the validation system
 */
export const COMPONENT_VALIDATORS = {
  engine: createValidator(filterEngineTypes, EngineType.STANDARD),
  gyro: createValidator(filterGyroTypes, GyroType.STANDARD),
  structure: createValidator(
    filterStructureTypes,
    InternalStructureType.STANDARD,
  ),
  cockpit: createValidator(filterCockpitTypes, CockpitType.STANDARD),
  heatSink: createValidator(filterHeatSinkTypes, HeatSinkType.SINGLE),
  armor: createValidator(filterArmorTypes, ArmorTypeEnum.STANDARD),
} as const;
