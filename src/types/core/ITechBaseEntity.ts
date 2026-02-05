/**
 * ITechBaseEntity - Tech base classification interface
 * All components and equipment SHALL implement ITechBaseEntity to declare their tech base.
 *
 * @spec core-entity-types/spec.md
 */

import { RulesLevel } from '../enums/RulesLevel';
import { TechBase } from '../enums/TechBase';

/**
 * Interface for entities that have a technology base classification.
 * Required for all equipment and components to determine compatibility.
 */
export interface ITechBaseEntity {
  /**
   * The technology base of this entity.
   * MUST be TechBase.INNER_SPHERE or TechBase.CLAN
   */
  readonly techBase: TechBase;

  /**
   * The rules level/complexity of this entity.
   * Determines which game modes this entity is available in.
   */
  readonly rulesLevel: RulesLevel;
}

/**
 * Type guard to check if an object implements ITechBaseEntity
 */
export function isTechBaseEntity(obj: unknown): obj is ITechBaseEntity {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as ITechBaseEntity).techBase === 'string' &&
    typeof (obj as ITechBaseEntity).rulesLevel === 'string'
  );
}
