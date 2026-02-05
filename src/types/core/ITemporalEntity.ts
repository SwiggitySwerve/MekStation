/**
 * ITemporalEntity - Temporal availability interface
 * Components with introduction dates SHALL implement ITemporalEntity.
 *
 * @spec core-entity-types/spec.md
 */

import { Era } from '../enums/Era';

/**
 * Interface for entities that have temporal availability.
 * Used for era-based filtering and historical accuracy.
 */
export interface ITemporalEntity {
  /**
   * Year the entity was first introduced.
   * Used for era filtering.
   */
  readonly introductionYear: number;

  /**
   * Era classification of this entity.
   * Determined by introductionYear.
   */
  readonly era: Era;

  /**
   * Optional year when this entity was discontinued or became extinct.
   * If undefined, entity is still available.
   */
  readonly extinctionYear?: number;

  /**
   * Optional year when this entity was re-introduced after extinction.
   * Only applicable if extinctionYear is defined.
   */
  readonly reintroductionYear?: number;
}

/**
 * Type guard to check if an object implements ITemporalEntity
 */
export function isTemporalEntity(obj: unknown): obj is ITemporalEntity {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as ITemporalEntity).introductionYear === 'number' &&
    typeof (obj as ITemporalEntity).era === 'string'
  );
}

/**
 * Checks if an entity is available in a given year.
 * @param entity - The temporal entity to check
 * @param year - The year to check availability for
 * @returns true if the entity is available in the given year
 */
export function isAvailableInYear(
  entity: ITemporalEntity,
  year: number,
): boolean {
  // Not yet introduced
  if (year < entity.introductionYear) {
    return false;
  }

  // Check extinction
  if (entity.extinctionYear !== undefined && year >= entity.extinctionYear) {
    // Check for reintroduction
    if (
      entity.reintroductionYear !== undefined &&
      year >= entity.reintroductionYear
    ) {
      return true;
    }
    return false;
  }

  return true;
}
