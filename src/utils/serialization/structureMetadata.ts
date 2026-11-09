import type { ISerializedStructure } from '@/types/unit/UnitSerialization';

/** Own donor maps at import, draft, duplicate and save boundaries. */
export function cloneSerializedStructure(
  structure: ISerializedStructure | undefined,
): ISerializedStructure | undefined {
  if (structure === undefined) return undefined;
  return {
    ...structure,
    ...(structure.locationTonnage !== undefined
      ? { locationTonnage: { ...structure.locationTonnage } }
      : {}),
    ...(structure.typeByLocation !== undefined
      ? { typeByLocation: { ...structure.typeByLocation } }
      : {}),
  };
}
