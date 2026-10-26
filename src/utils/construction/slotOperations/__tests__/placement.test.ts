import type { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';

import { MechLocation } from '@/types/construction';
import { TechBase } from '@/types/enums';
import { EquipmentCategory } from '@/types/equipment';

import { getSlotPlacementSummary } from '../placement';

function mounted(
  instanceId: string,
  criticalSlots: number,
  placement?: { location: MechLocation; slots: number[] },
): IMountedEquipmentInstance {
  return {
    instanceId,
    equipmentId: instanceId,
    name: instanceId,
    category: EquipmentCategory.ENERGY_WEAPON,
    weight: 1,
    criticalSlots,
    heat: 0,
    techBase: TechBase.INNER_SPHERE,
    isRearMounted: false,
    isRemovable: true,
    isOmniPodMounted: false,
    ...placement,
  };
}

describe('getSlotPlacementSummary', () => {
  it('reports nothing for an empty loadout', () => {
    expect(getSlotPlacementSummary([])).toEqual({
      placedSlots: 0,
      pendingSlots: 0,
      unplacedItems: 0,
    });
  });

  it('splits slots into placed and pending by complete slot assignment', () => {
    const placed = mounted('large-laser', 2, {
      location: MechLocation.RIGHT_ARM,
      slots: [4, 5],
    });
    const unplaced = mounted('ppc', 3);
    expect(getSlotPlacementSummary([placed, unplaced])).toEqual({
      placedSlots: 2,
      pendingSlots: 3,
      unplacedItems: 1,
    });
  });

  it('treats a located item with an incomplete slot list as pending', () => {
    const partial = mounted('ppc', 3, {
      location: MechLocation.LEFT_ARM,
      slots: [4],
    });
    expect(getSlotPlacementSummary([partial])).toEqual({
      placedSlots: 0,
      pendingSlots: 3,
      unplacedItems: 1,
    });
  });

  it('counts a slotless item as placed once it has a location', () => {
    const slotless = mounted('targeting-computer-link', 0, {
      location: MechLocation.CENTER_TORSO,
      slots: [],
    });
    expect(getSlotPlacementSummary([slotless])).toEqual({
      placedSlots: 0,
      pendingSlots: 0,
      unplacedItems: 0,
    });
  });
});
