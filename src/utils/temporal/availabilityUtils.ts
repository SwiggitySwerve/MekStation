/**
 * Temporal Availability Utilities
 *
 * Functions for filtering components and equipment by temporal availability.
 *
 * @spec openspec/specs/era-temporal-system/spec.md
 */

import { ITemporalEntity } from '../../types/core/ITemporalEntity';
import { Era, ERA_DEFINITIONS } from '../../types/temporal/Era';
import { getEraForYear } from './eraUtils';

/**
 * Minimal temporal properties required for availability checking.
 * This is a subset of ITemporalEntity, allowing both full ITemporalEntity
 * instances and simpler objects with just introductionYear to be used.
 */
export type MinimalTemporalEntity = Pick<
  ITemporalEntity,
  'introductionYear' | 'extinctionYear'
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
export function isAvailableInYear(
  entity: MinimalTemporalEntity,
  year: number,
): boolean {
  if (!Number.isFinite(year) || !Number.isFinite(entity.introductionYear)) {
    return false;
  }

  if (year < entity.introductionYear) {
    return false;
  }

  if (entity.extinctionYear !== undefined && year > entity.extinctionYear) {
    return false;
  }

  return true;
}

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

  // Entity must have been introduced by the end of the era
  if (entity.introductionYear > eraDef.endYear) {
    return false;
  }

  // Entity must not be extinct before the start of the era
  if (
    entity.extinctionYear !== undefined &&
    entity.extinctionYear < eraDef.startYear
  ) {
    return false;
  }

  return true;
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
