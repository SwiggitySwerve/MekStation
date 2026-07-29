import { mapEquipment } from '@/services/units/unitLoaderService/equipmentMapping';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment';

describe('mapEquipment', () => {
  it('preserves serialized placement metadata for unresolved equipment', () => {
    const [mapped] = mapEquipment(
      [
        {
          id: 'unknown-roundtrip-equipment',
          location: 'Left Arm',
          slots: [2],
          isRearMounted: true,
          linkedAmmo: 'unknown-roundtrip-ammo',
        },
      ],
      TechBase.INNER_SPHERE,
      TechBaseMode.INNER_SPHERE,
      undefined,
    );

    expect(mapped).toMatchObject({
      equipmentId: 'unknown-roundtrip-equipment',
      category: EquipmentCategory.MISC_EQUIPMENT,
      location: MechLocation.LEFT_ARM,
      slots: [2],
      isRearMounted: true,
      linkedAmmoId: 'unknown-roundtrip-ammo',
    });
  });
});
