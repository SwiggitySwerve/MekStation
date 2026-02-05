/**
 * Type Guard Factory
 *
 * Provides a factory function to eliminate boilerplate when creating type guards.
 * Supports property type checking with full TypeScript inference.
 */

/**
 * Type definitions for property type checking
 */
type PropertyTypeMap = {
  string: string;
  number: number;
  boolean: boolean;
  object: object;
  array: unknown[];
  function: (...args: unknown[]) => unknown;
};

type PropertyType = keyof PropertyTypeMap;

/**
 * Schema for defining property types
 * Maps property names to their expected types
 */
type PropertySchema<T> = {
  [K in keyof T]?: PropertyType | 'any';
};

/**
 * Creates a type guard function for the specified interface
 *
 * Eliminates boilerplate by automatically generating type guard functions
 * that check for required properties and their expected types.
 *
 * @template T - The interface/type to create a guard for
 * @param schema - Object mapping property names to expected types
 * @returns Type guard function that narrows unknown to T
 *
 * @example
 * // Define an interface
 * interface IPerson {
 *   name: string;
 *   age: number;
 *   active: boolean;
 * }
 *
 * // Create a type guard using the factory
 * const isPerson = createTypeGuard<IPerson>({
 *   name: 'string',
 *   age: 'number',
 *   active: 'boolean'
 * });
 *
 * // Use the type guard
 * const data: unknown = { name: 'Alice', age: 30, active: true };
 * if (isPerson(data)) {
 *   console.log(data.name); // TypeScript knows data is IPerson
 * }
 *
 * @example
 * // With optional properties using 'any'
 * interface IEntity {
 *   id: string;
 *   metadata?: Record<string, unknown>;
 * }
 *
 * const isEntity = createTypeGuard<IEntity>({
 *   id: 'string',
 *   metadata: 'any'
 * });
 *
 * @example
 * // With array properties
 * interface ICollection {
 *   items: unknown[];
 *   name: string;
 * }
 *
 * const isCollection = createTypeGuard<ICollection>({
 *   items: 'array',
 *   name: 'string'
 * });
 *
 * @remarks
 * Supported property types:
 * - 'string': checks typeof value === 'string'
 * - 'number': checks typeof value === 'number'
 * - 'boolean': checks typeof value === 'boolean'
 * - 'object': checks typeof value === 'object' (non-null)
 * - 'array': checks Array.isArray(value)
 * - 'function': checks typeof value === 'function'
 * - 'any': checks property exists (any type)
 */
export function createTypeGuard<T>(
  schema: PropertySchema<T>,
): (obj: unknown) => obj is T {
  return (obj: unknown): obj is T => {
    // First check: must be an object and not null
    if (typeof obj !== 'object' || obj === null) {
      return false;
    }

    // Check each property in the schema
    for (const [key, expectedType] of Object.entries(schema)) {
      const value = (obj as Record<string, unknown>)[key];

      // 'any' type: just check property exists
      if (expectedType === 'any') {
        if (!(key in (obj as object))) {
          return false;
        }
        continue;
      }

      // 'array' type: use Array.isArray for proper checking
      if (expectedType === 'array') {
        if (!Array.isArray(value)) {
          return false;
        }
        continue;
      }

      // All other types: use typeof check
      if (typeof value !== expectedType) {
        return false;
      }
    }

    return true;
  };
}
