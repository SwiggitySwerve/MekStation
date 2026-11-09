/**
 * Canonical bytes shared by unit-save fingerprints.
 *
 * Adding a persisted editable field:
 * 1. Add it to its owning state/persisted projection and editable snapshot once.
 * 2. Keep an absent optional value undefined in the fingerprint projection.
 *    JSON omits undefined object members, so older stored fingerprints retain
 *    exactly the same bytes even when the new snapshot spells out that key.
 * 3. Do not substitute null, an empty collection, or a default for old absence.
 *    If a default is needed at runtime, preserve old absence in the projection
 *    or introduce a reviewed loader shim and a literal old-draft regression.
 * 4. Extend the literal compatibility tests for absence and meaningful edits.
 *
 * Preserve locale key ordering, array order, and existing ID/link normalization.
 * Never regenerate old literal fingerprints to accommodate a new projection.
 * No version prefix or new hash is introduced by this extraction.
 */
function orderedJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(orderedJson);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, orderedJson(item)]),
    );
  return value;
}

export function stringifyUnitSaveFingerprint(value: unknown): string {
  return JSON.stringify(orderedJson(value));
}

interface IEquipmentSaveIdentity {
  readonly instanceId: string;
  readonly linkedAmmoId?: string;
}

/** Temporary identity is positional; linked IDs outside the draft stay intact. */
export function normalizeUnitSaveEquipmentIds<T extends IEquipmentSaveIdentity>(
  equipment: readonly T[],
): readonly (Omit<T, 'instanceId' | 'linkedAmmoId'> &
  IEquipmentSaveIdentity)[] {
  const ids = new Map(
    equipment.map((item, index) => [item.instanceId, `equipment-${index}`]),
  );
  return equipment.map((item, index) => ({
    ...item,
    instanceId: `equipment-${index}`,
    linkedAmmoId: item.linkedAmmoId
      ? (ids.get(item.linkedAmmoId) ?? item.linkedAmmoId)
      : undefined,
  }));
}
