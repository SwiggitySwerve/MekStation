/**
 * Loader-minted mount ids (0c-UUID-001).
 *
 * The id names the mount by what the committed unit says: location, equipment
 * and either its source ordinal (equipment array) or its first critical slot
 * (recovered from the critical-slot table). Two loads of one unit therefore
 * give one id, so VAL-UNIV-015 issue fields (`criticalSlots.<instanceId>`) are
 * reproducible. Ids only need to be unique within one unit: the two forms
 * cannot collide because an ordinal is numeric and a slot form is `slot<n>`.
 */
function mountInstanceId(
  location: string | undefined,
  equipmentId: string,
  discriminator: string,
): string {
  return `mount:${location ?? 'unplaced'}:${equipmentId}:${discriminator}`;
}

/** `ordinal` counts same-location, same-id entries in source order, from 0. */
export function sourceMountInstanceId(
  location: string | undefined,
  equipmentId: string,
  ordinal: number,
): string {
  return mountInstanceId(location, equipmentId, String(ordinal));
}

/** `slots` are the mount's slot indices in its first location. */
export function recoveredMountInstanceId(
  location: string | undefined,
  equipmentId: string,
  slots: readonly number[],
): string {
  return mountInstanceId(location, equipmentId, `slot${Math.min(...slots)}`);
}
