/**
 * IIdentifiable - Base interface for types with unique identity
 * Use when an entity has an ID but no natural display name.
 * For entities with both id and name, use IEntity (which extends this).
 *
 * @example Transaction, ILoan — have identity but no display name
 */

/**
 * Base interface for types with unique identity.
 * Provides universal identification for entities that may not have a display name.
 */
export interface IIdentifiable {
  /**
   * Unique identifier for this entity.
   * Must be unique within its entity type.
   */
  readonly id: string;
}

/**
 * Type guard to check if an object implements IIdentifiable
 */
export function isIdentifiable(value: unknown): value is IIdentifiable {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof (value as IIdentifiable).id === 'string'
  );
}
