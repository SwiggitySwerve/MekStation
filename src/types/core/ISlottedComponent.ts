/**
 * ISlottedComponent - Critical slot interface
 * Components that occupy critical slots SHALL implement this interface.
 *
 * @spec core-entity-types/spec.md
 */

/**
 * Interface for components that occupy critical slots.
 * Critical slots represent physical space in a mech's structure.
 */
export interface ISlottedComponent {
  /**
   * Number of critical slots this component occupies.
   * MUST be an integer >= 0.
   */
  readonly criticalSlots: number;
}

/**
 * Type guard to check if an object implements ISlottedComponent
 */
export function isSlottedComponent(obj: unknown): obj is ISlottedComponent {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as ISlottedComponent).criticalSlots === 'number' &&
    Number.isInteger((obj as ISlottedComponent).criticalSlots) &&
    (obj as ISlottedComponent).criticalSlots >= 0
  );
}

/**
 * Validates that a critical slots value is valid.
 * @param slots - The slots value to validate
 * @returns true if slots is a non-negative integer
 */
export function isValidCriticalSlots(slots: unknown): slots is number {
  return typeof slots === 'number' && Number.isInteger(slots) && slots >= 0;
}
