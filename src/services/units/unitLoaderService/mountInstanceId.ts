/**
 * Loader-minted mount ids (0c-UUID-001).
 *
 * The id names the mount by what the committed unit says: location, equipment
 * and either its source ordinal (equipment array) or every critical-slot cell
 * it occupies (recovered from the critical-slot table). Two loads of one unit
 * therefore give one id, so VAL-UNIV-015 issue fields
 * (`criticalSlots.<instanceId>`) are reproducible. Ids only need to be unique
 * within one unit: source ids start `mount:<location>:`, recovered ids start
 * `mount:recovered:`, and recovered mounts never share a cell, so no two
 * collide.
 */

/** `ordinal` counts same-location, same-id entries in source order, from 0. */
export function sourceMountInstanceId(
  location: string | undefined,
  equipmentId: string,
  ordinal: number,
): string {
  return `mount:${location ?? 'unplaced'}:${equipmentId}:${ordinal}`;
}

/**
 * `parts` are the mount's cells per location (as getSlotParts returns them).
 * A mount that occupies no cell cannot be named uniquely, so that is a hard
 * failure here rather than a shared id.
 */
export function recoveredMountInstanceId(
  equipmentId: string,
  parts: readonly { location: string; slots: readonly number[] }[],
): string {
  if (!parts.some((part) => part.slots.length > 0))
    throw new Error(`Recovered mount ${equipmentId} occupies no critical slot`);
  const cells = parts
    .map(
      ({ location, slots }) =>
        `${location}@${[...slots].sort((a, b) => a - b).join(',')}`,
    )
    .join('|');
  return `mount:recovered:${equipmentId}:${cells}`;
}
