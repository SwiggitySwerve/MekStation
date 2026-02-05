/**
 * IWeightedComponent - Physical mass interface
 * Components with physical characteristics SHALL implement this interface.
 *
 * @spec core-entity-types/spec.md
 */

/**
 * Interface for components that have physical weight.
 * Weight is measured in tons and must be >= 0.
 */
export interface IWeightedComponent {
  /**
   * Weight of the component in tons.
   * MUST be a finite number >= 0.
   * Use "weight" not "tons" per BattleTech conventions.
   */
  readonly weight: number;
}

/**
 * Type guard to check if an object implements IWeightedComponent
 */
export function isWeightedComponent(obj: unknown): obj is IWeightedComponent {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as IWeightedComponent).weight === 'number' &&
    Number.isFinite((obj as IWeightedComponent).weight) &&
    (obj as IWeightedComponent).weight >= 0
  );
}

/**
 * Validates that a weight value is valid.
 * @param weight - The weight value to validate
 * @returns true if the weight is a finite number >= 0
 */
export function isValidWeight(weight: unknown): weight is number {
  return typeof weight === 'number' && Number.isFinite(weight) && weight >= 0;
}

/**
 * Rounds weight to standard BattleTech 0.5 ton increments.
 * @param weight - The weight to round
 * @returns Weight rounded to nearest 0.5 tons
 */
export function roundWeight(weight: number): number {
  return Math.round(weight * 2) / 2;
}
