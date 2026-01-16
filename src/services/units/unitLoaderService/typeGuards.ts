/**
 * Unit Loader Service - Type Guards
 *
 * Type guard functions for validating unit data structures.
 *
 * @spec openspec/specs/unit-services/spec.md
 */

import { IFullUnit } from '../CanonicalUnitService';

/**
 * Check if IFullUnit has the structure of ISerializedUnit
 * Since IFullUnit has [key: string]: unknown, we can check if it matches ISerializedUnit structure
 */
export function hasSerializedUnitStructure(data: IFullUnit): boolean {
  // Check required fields for ISerializedUnit
  return (
    typeof data.id === 'string' &&
    typeof data.chassis === 'string' &&
    typeof data.techBase === 'string' &&
    typeof data.tonnage === 'number'
  );
}
