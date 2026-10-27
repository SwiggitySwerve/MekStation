/**
 * Temporal Availability Utilities
 *
 * Functions for filtering components and equipment by temporal availability.
 *
 * @spec openspec/specs/era-temporal-system/spec.md
 */

import {
  ITemporalEntity,
  isAvailableInYear,
} from '../../types/core/ITemporalEntity';
import { Era, ERA_DEFINITIONS } from '../../types/temporal/Era';
import { getEraForYear } from './eraUtils';

/**
 * Minimal temporal properties required for availability checking.
 * This is a subset of ITemporalEntity, allowing both full ITemporalEntity
 * instances and simpler objects with just introductionYear to be used.
 */
export type MinimalTemporalEntity = Pick<
  ITemporalEntity,
  'introductionYear' | 'extinctionYear' | 'reintroductionYear'
>;

/**
 * Validate temporal properties of an entity
 *
 * @param entity - Entity with temporal properties
 * @returns Validation result with any errors
 */
export interface TemporalValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateTemporalProperties(
  entity: MinimalTemporalEntity,
): TemporalValidationResult {
  const errors: string[] = [];

  if (!Number.isFinite(entity.introductionYear)) {
    errors.push('introductionYear must be a finite number');
  }

  if (entity.extinctionYear !== undefined) {
    if (!Number.isFinite(entity.extinctionYear)) {
      errors.push('extinctionYear must be a finite number if provided');
    } else if (entity.extinctionYear < entity.introductionYear) {
      errors.push('extinctionYear must be >= introductionYear');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Check if an entity is available in a given year
 *
 * @param entity - Entity with temporal properties
 * @param year - Year to check availability
 * @returns True if entity is available in that year
 */
export { isAvailableInYear };

/**
 * Check if an entity is available in a given era
 *
 * @param entity - Entity with temporal properties
 * @param era - Era to check availability
 * @returns True if entity is available at any point during that era
 */
export function isAvailableInEra(
  entity: MinimalTemporalEntity,
  era: Era,
): boolean {
  const eraDef = ERA_DEFINITIONS.find((d) => d.era === era);
  if (!eraDef) {
    return false;
  }

  // Availability can start at introduction or resume at reintroduction.
  const firstYear = Math.max(eraDef.startYear, entity.introductionYear);
  return (
    (firstYear <= eraDef.endYear && isAvailableInYear(entity, firstYear)) ||
    (entity.reintroductionYear !== undefined &&
      entity.reintroductionYear >= eraDef.startYear &&
      entity.reintroductionYear <= eraDef.endYear &&
      isAvailableInYear(entity, entity.reintroductionYear))
  );
}

/**
 * Filter an array of temporal entities by year availability
 *
 * @param entities - Array of entities with temporal properties
 * @param year - Year to filter by
 * @returns Entities available in the given year
 */
export function filterByYear<T extends MinimalTemporalEntity>(
  entities: T[],
  year: number,
): T[] {
  return entities.filter((entity) => isAvailableInYear(entity, year));
}

/**
 * Filter an array of temporal entities by era availability
 *
 * @param entities - Array of entities with temporal properties
 * @param era - Era to filter by
 * @returns Entities available during the given era
 */
export function filterByEra<T extends MinimalTemporalEntity>(
  entities: T[],
  era: Era,
): T[] {
  return entities.filter((entity) => isAvailableInEra(entity, era));
}

/**
 * Get the introduction era for an entity
 *
 * @param entity - Entity with temporal properties
 * @returns The era in which the entity was introduced
 */
export function getIntroductionEra(
  entity: MinimalTemporalEntity,
): Era | undefined {
  return getEraForYear(entity.introductionYear);
}

/**
 * Get the extinction era for an entity
 *
 * @param entity - Entity with temporal properties
 * @returns The era in which the entity went extinct, or undefined if still available
 */
export function getExtinctionEra(
  entity: MinimalTemporalEntity,
): Era | undefined {
  if (entity.extinctionYear === undefined) {
    return undefined;
  }
  return getEraForYear(entity.extinctionYear);
}

/**
 * Get the eras during which an entity is available
 *
 * @param entity - Entity with temporal properties
 * @returns Array of eras during which the entity is available
 */
export function getAvailableEras(entity: MinimalTemporalEntity): Era[] {
  return ERA_DEFINITIONS.filter((def) => isAvailableInEra(entity, def.era)).map(
    (def) => def.era,
  );
}
