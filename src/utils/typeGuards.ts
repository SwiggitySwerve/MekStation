/**
 * Type Guards
 *
 * Type guard implementations for safe type narrowing.
 *
 * @spec openspec/specs/validation-patterns/spec.md
 */

import { RulesLevel } from '../types/enums/RulesLevel';
import { TechBase } from '../types/enums/TechBase';
import { Era } from '../types/temporal/Era';

/**
 * Check if value is a valid Entity
 *
 * Entities have id and name properties.
 */
export function isEntity(
  value: unknown,
): value is { id: string; name: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    typeof (value as { id: unknown }).id === 'string' &&
    typeof (value as { name: unknown }).name === 'string'
  );
}

/**
 * Check if value is a valid WeightedComponent
 *
 * WeightedComponents have a weight property >= 0.
 */
export function isWeightedComponent(
  value: unknown,
): value is { weight: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'weight' in value &&
    typeof (value as { weight: unknown }).weight === 'number' &&
    Number.isFinite((value as { weight: number }).weight) &&
    (value as { weight: number }).weight >= 0
  );
}

/**
 * Check if value is a valid SlottedComponent
 *
 * SlottedComponents have criticalSlots as a non-negative integer.
 */
export function isSlottedComponent(
  value: unknown,
): value is { criticalSlots: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'criticalSlots' in value &&
    typeof (value as { criticalSlots: unknown }).criticalSlots === 'number' &&
    Number.isInteger((value as { criticalSlots: number }).criticalSlots) &&
    (value as { criticalSlots: number }).criticalSlots >= 0
  );
}

/**
 * Check if value is a valid PlaceableComponent
 *
 * PlaceableComponents have both weight and criticalSlots.
 */
export function isPlaceableComponent(
  value: unknown,
): value is { weight: number; criticalSlots: number } {
  return isWeightedComponent(value) && isSlottedComponent(value);
}

/**
 * Check if value is a valid TechBaseEntity
 *
 * TechBaseEntities have techBase and rulesLevel properties.
 */
export function isTechBaseEntity(
  value: unknown,
): value is { techBase: TechBase; rulesLevel: RulesLevel } {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as { techBase?: unknown; rulesLevel?: unknown };

  return (
    'techBase' in obj &&
    'rulesLevel' in obj &&
    Object.values(TechBase).includes(obj.techBase as TechBase) &&
    Object.values(RulesLevel).includes(obj.rulesLevel as RulesLevel)
  );
}

/**
 * Check if value is a valid TemporalEntity
 *
 * TemporalEntities have introductionYear and optionally extinctionYear.
 */
export function isTemporalEntity(
  value: unknown,
): value is { introductionYear: number; extinctionYear?: number } {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as { introductionYear?: unknown; extinctionYear?: unknown };

  if (
    !('introductionYear' in obj) ||
    typeof obj.introductionYear !== 'number'
  ) {
    return false;
  }

  if (!Number.isFinite(obj.introductionYear)) {
    return false;
  }

  if ('extinctionYear' in obj && obj.extinctionYear !== undefined) {
    if (
      typeof obj.extinctionYear !== 'number' ||
      !Number.isFinite(obj.extinctionYear)
    ) {
      return false;
    }
    if (obj.extinctionYear < obj.introductionYear) {
      return false;
    }
  }

  return true;
}

/**
 * Check if value is a valid ValuedComponent
 *
 * ValuedComponents have cost and battleValue properties.
 */
export function isValuedComponent(
  value: unknown,
): value is { costCBills: number; battleValue: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'costCBills' in value &&
    'battleValue' in value &&
    typeof (value as { costCBills: unknown }).costCBills === 'number' &&
    typeof (value as { battleValue: unknown }).battleValue === 'number' &&
    (value as { costCBills: number }).costCBills >= 0 &&
    (value as { battleValue: number }).battleValue >= 0
  );
}

/**
 * Check if value is a valid DocumentedEntity
 *
 * DocumentedEntities have optional sourceBook and pageReference.
 */
export function isDocumentedEntity(
  value: unknown,
): value is { sourceBook?: string; pageReference?: number } {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as { sourceBook?: unknown; pageReference?: unknown };

  if (
    'sourceBook' in obj &&
    obj.sourceBook !== undefined &&
    typeof obj.sourceBook !== 'string'
  ) {
    return false;
  }

  if ('pageReference' in obj && obj.pageReference !== undefined) {
    if (
      typeof obj.pageReference !== 'number' ||
      !Number.isInteger(obj.pageReference)
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Check if a string is a valid TechBase enum value
 */
export function isValidTechBase(value: string): value is TechBase {
  return Object.values(TechBase).includes(value as TechBase);
}

/**
 * Check if a string is a valid RulesLevel enum value
 */
export function isValidRulesLevel(value: string): value is RulesLevel {
  return Object.values(RulesLevel).includes(value as RulesLevel);
}

/**
 * Check if a string is a valid Era enum value
 */
export function isValidEra(value: string): value is Era {
  return Object.values(Era).includes(value as Era);
}

/**
 * Assert that a value is an Entity, throwing if not
 */
export function assertEntity(
  value: unknown,
  context?: string,
): asserts value is { id: string; name: string } {
  if (!isEntity(value)) {
    throw new Error(
      `${context ? context + ': ' : ''}Value is not a valid Entity`,
    );
  }
}

/**
 * Assert that a value is a WeightedComponent, throwing if not
 */
export function assertWeightedComponent(
  value: unknown,
  context?: string,
): asserts value is { weight: number } {
  if (!isWeightedComponent(value)) {
    throw new Error(
      `${context ? context + ': ' : ''}Value is not a valid WeightedComponent`,
    );
  }
}

/**
 * Assert that a value is a TechBaseEntity, throwing if not
 */
export function assertTechBaseEntity(
  value: unknown,
  context?: string,
): asserts value is { techBase: TechBase; rulesLevel: RulesLevel } {
  if (!isTechBaseEntity(value)) {
    throw new Error(
      `${context ? context + ': ' : ''}Value is not a valid TechBaseEntity`,
    );
  }
}
