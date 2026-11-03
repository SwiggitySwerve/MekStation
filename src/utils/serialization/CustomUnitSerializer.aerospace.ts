import type { AerospaceState } from '@/stores/aerospaceState';

/** Canonical support metadata; ordinary aerospace payloads keep their shape. */
export function aerospaceSupportSaveFields(
  state: AerospaceState,
  armorType: string,
): {
  metadata: { structuralTechRating?: number; engineTechRating?: number };
  armor: { type: string; barRating?: number };
} {
  return {
    metadata: state.isFixedWingSupport
      ? {
          structuralTechRating: state.structuralTechRating,
          engineTechRating: state.engineTechRating,
        }
      : {},
    armor: {
      type:
        state.isFixedWingSupport && state.barRating !== undefined
          ? 'BAR'
          : armorType,
      ...(state.isFixedWingSupport ? { barRating: state.barRating } : {}),
    },
  };
}
