import type { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';

interface IEquipmentMutationPolicy {
  readonly instanceId: string;
  readonly isRemovable: boolean;
  readonly isOmniPodMounted?: boolean;
}

type EquipmentMutationSnapshot = ReadonlyMap<
  string,
  readonly [isRemovable: boolean, isOmniPodMounted: boolean | undefined]
>;

export function captureEquipmentMutationPolicy(
  equipment: readonly IEquipmentMutationPolicy[],
): EquipmentMutationSnapshot {
  return new Map(
    equipment.map((item) => [
      item.instanceId,
      [item.isRemovable, item.isOmniPodMounted] as const,
    ]),
  );
}

export function matchesEquipmentMutationPolicy(
  snapshot: EquipmentMutationSnapshot,
  equipment: readonly IEquipmentMutationPolicy[],
): boolean {
  return (
    equipment.length === snapshot.size &&
    new Set(equipment.map((item) => item.instanceId)).size === snapshot.size &&
    equipment.every((item) => {
      const policy = snapshot.get(item.instanceId);
      return (
        policy !== undefined &&
        policy[0] === item.isRemovable &&
        policy[1] === item.isOmniPodMounted
      );
    })
  );
}

/** @spec openspec/specs/omnimech-system/spec.md */
export function isFixedOmniEquipment(
  isOmni: boolean,
  equipment: Pick<IMountedEquipmentInstance, 'isOmniPodMounted'>,
): boolean {
  return isOmni && equipment.isOmniPodMounted === false;
}

export function canChangeEquipmentMount(
  isOmni: boolean,
  equipment: Pick<IMountedEquipmentInstance, 'isOmniPodMounted' | 'location'>,
): boolean {
  return !equipment.location || !isFixedOmniEquipment(isOmni, equipment);
}

export function hasFixedOmniMountConflict(
  isOmni: boolean,
  equipment: readonly IMountedEquipmentInstance[],
  location: IMountedEquipmentInstance['location'],
  slots: readonly number[],
): boolean {
  return (
    isOmni &&
    equipment.some(
      (item) =>
        isFixedOmniEquipment(isOmni, item) &&
        item.location === location &&
        item.slots?.some((slot) => slots.includes(slot)),
    )
  );
}
