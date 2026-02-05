/**
 * IValuedComponent - Economic properties interface
 * Components with economic value SHALL implement IValuedComponent.
 *
 * @spec core-entity-types/spec.md
 */

/**
 * Interface for components that have economic value.
 * Provides cost in C-Bills and Battle Value for army construction.
 */
export interface IValuedComponent {
  /**
   * Cost of the component in C-Bills.
   * MUST be >= 0.
   */
  readonly cost: number;

  /**
   * Battle Value of the component.
   * Used for balancing in games.
   * MUST be >= 0.
   */
  readonly battleValue: number;
}

/**
 * Type guard to check if an object implements IValuedComponent
 */
export function isValuedComponent(obj: unknown): obj is IValuedComponent {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as IValuedComponent).cost === 'number' &&
    (obj as IValuedComponent).cost >= 0 &&
    typeof (obj as IValuedComponent).battleValue === 'number' &&
    (obj as IValuedComponent).battleValue >= 0
  );
}
