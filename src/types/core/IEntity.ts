/**
 * IEntity - Base entity interface
 * All entities in the system SHALL extend from IEntity, providing universal identification.
 * 
 * @spec core-entity-types/spec.md
 */

/**
 * Base interface for all entities in the MekStation system.
 * Provides universal identification properties that all entities must have.
 */
export interface IEntity {
  /**
   * Unique identifier for this entity.
   * Must be unique within its entity type.
   */
  readonly id: string;

  /**
   * Display name for this entity.
   * Should be human-readable and suitable for UI display.
   */
  readonly name: string;
}

/**
 * Type guard to check if an object implements IEntity
 */
export function isEntity(obj: unknown): obj is IEntity {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as IEntity).id === 'string' &&
    typeof (obj as IEntity).name === 'string'
  );
}

