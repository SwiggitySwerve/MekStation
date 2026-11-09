import { EquipmentCategory, IEquipmentItem } from '@/types/equipment';
import profiles from '@/types/equipment/sourceWeaponMountProfiles.json';

interface ISourceWeaponSlot {
  readonly index: number;
  readonly equipmentId?: string;
  readonly equipmentDef?: Pick<IEquipmentItem, 'category'>;
}

const mountProfiles: Readonly<
  Record<
    string,
    { grouping: string; recover: boolean; aliases?: readonly string[] }
  >
> = profiles;
const identityAliases = new Map(
  Object.entries(mountProfiles).flatMap(([id, profile]) =>
    (profile.aliases ?? []).map((alias) => [alias, id] as const),
  ),
);

/** Native and legacy Claw records join as one Java type; mounted IDs stay intact. */
export function sourceWeaponIdentity(equipmentId: string): string {
  return identityAliases.get(equipmentId) ?? equipmentId;
}

/** Keep the existing admission guard separate from source grouping. */
export function canRecoverSourcePhysicalWeapon(equipmentId: string): boolean {
  const profile = mountProfiles[sourceWeaponIdentity(equipmentId)];
  return profile?.grouping === 'location' && profile.recover;
}

export function takeSourceWeaponSlots<T extends ISourceWeaponSlot>(
  slots: readonly T[],
  claimed: ReadonlySet<number>,
  equipmentId: string,
  count: number,
  isAmmo = false,
): readonly T[] {
  const identity = sourceWeaponIdentity(equipmentId);
  return slots
    .filter(
      (slot) =>
        !claimed.has(slot.index) &&
        sourceWeaponIdentity(slot.equipmentId ?? '') === identity &&
        (slot.equipmentDef?.category === EquipmentCategory.AMMUNITION) ===
          isAmmo,
    )
    .slice(0, count);
}

/** Group complete native entries without changing the caller's claimed slots. */
export function groupSourcePhysicalMounts<T extends ISourceWeaponSlot>(
  slots: readonly T[],
  claimed: ReadonlySet<number>,
  equipmentId: string,
  count: number,
  existingMounts: number,
): { claimed: readonly T[]; mounts: readonly (readonly T[])[] } {
  if (count <= 0) return { claimed: [], mounts: [] };
  const identity = sourceWeaponIdentity(equipmentId);
  const group = slots.filter(
    (slot) => sourceWeaponIdentity(slot.equipmentId ?? '') === identity,
  );
  const occupied = new Set(claimed);
  const reserved = group.filter((slot) => occupied.has(slot.index)).length;
  const newlyClaimed = [
    ...takeSourceWeaponSlots(
      slots,
      occupied,
      equipmentId,
      Math.max(0, existingMounts * count - reserved),
    ),
  ];
  newlyClaimed.forEach((slot) => occupied.add(slot.index));
  const missing = Math.max(
    0,
    Math.floor(group.length / count) - existingMounts,
  );
  const mounts: (readonly T[])[] = [];
  for (let n = 0; n < missing; n++) {
    const matching = takeSourceWeaponSlots(slots, occupied, equipmentId, count);
    if (matching.length !== count) break;
    matching.forEach((slot) => occupied.add(slot.index));
    newlyClaimed.push(...matching);
    mounts.push(matching);
  }
  return { claimed: newlyClaimed, mounts };
}
