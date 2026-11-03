import type { AerospaceState } from '@/stores/aerospaceState';

import { serializeAerospaceArmorIdentity } from '@/types/unit/AerospaceSerialization';

/** Canonical support metadata; ordinary aerospace payloads keep their shape. */
export function aerospaceSupportSaveFields(
  state: AerospaceState,
  armorType: string,
): {
  metadata: { structuralTechRating?: number; engineTechRating?: number };
  armor: ReturnType<typeof serializeAerospaceArmorIdentity>;
} {
  return {
    metadata: state.isFixedWingSupport
      ? {
          structuralTechRating: state.structuralTechRating,
          engineTechRating: state.engineTechRating,
        }
      : {},
    armor: serializeAerospaceArmorIdentity(armorType, state),
  };
}
