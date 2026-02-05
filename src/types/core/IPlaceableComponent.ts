/**
 * IPlaceableComponent - Composition interface
 * Components with both weight and slots SHALL use IPlaceableComponent composition.
 *
 * @spec core-entity-types/spec.md
 */

import { ISlottedComponent } from './ISlottedComponent';
import { IWeightedComponent } from './IWeightedComponent';

/**
 * Interface for components that can be placed in a mech.
 * Combines both physical weight and critical slot requirements.
 * Equipment requiring both weight and slots SHALL extend this interface.
 */
export interface IPlaceableComponent
  extends IWeightedComponent, ISlottedComponent {
  // Inherits:
  // - weight: number (from IWeightedComponent)
  // - criticalSlots: number (from ISlottedComponent)
}

/**
 * Type guard to check if an object implements IPlaceableComponent
 */
export function isPlaceableComponent(obj: unknown): obj is IPlaceableComponent {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as IPlaceableComponent).weight === 'number' &&
    Number.isFinite((obj as IPlaceableComponent).weight) &&
    (obj as IPlaceableComponent).weight >= 0 &&
    typeof (obj as IPlaceableComponent).criticalSlots === 'number' &&
    Number.isInteger((obj as IPlaceableComponent).criticalSlots) &&
    (obj as IPlaceableComponent).criticalSlots >= 0
  );
}
