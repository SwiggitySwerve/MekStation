import type { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';
import type { SlotAssignment } from '@/utils/construction/slotOperations';

export function buildPlacementFingerprint(
  equipment: readonly IMountedEquipmentInstance[],
): string {
  return equipment
    .filter((eq) => eq.location !== undefined)
    .map(
      (eq) => `${eq.instanceId}:${eq.location}:${(eq.slots || []).join(',')}`,
    )
    .sort()
    .join('|');
}

export function wouldAssignmentsChange(
  assignments: readonly SlotAssignment[],
  equipment: readonly IMountedEquipmentInstance[],
): boolean {
  return assignments.some((assignment) => {
    const eq = equipment.find(
      (item) => item.instanceId === assignment.instanceId,
    );
    if (!eq) return false;
    if (eq.location !== assignment.location) return true;
    const currentSlots = eq.slots || [];
    if (currentSlots.length !== assignment.slots.length) return true;
    return currentSlots.some((slot, index) => slot !== assignment.slots[index]);
  });
}
