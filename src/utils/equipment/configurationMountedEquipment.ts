import type { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';

type ConfigurationMountedEquipmentDefaults = Pick<
  IMountedEquipmentInstance,
  | 'location'
  | 'slots'
  | 'isRearMounted'
  | 'linkedAmmoId'
  | 'isRemovable'
  | 'isOmniPodMounted'
>;
type ConfigurationMountedEquipmentInput = Omit<
  IMountedEquipmentInstance,
  keyof ConfigurationMountedEquipmentDefaults
> &
  Partial<Pick<IMountedEquipmentInstance, 'location' | 'slots'>>;

export const CONFIGURATION_MOUNTED_EQUIPMENT_DEFAULTS: ConfigurationMountedEquipmentDefaults =
  {
    location: undefined,
    slots: undefined,
    isRearMounted: false,
    linkedAmmoId: undefined,
    isRemovable: false,
    isOmniPodMounted: false,
  };

export function createConfigurationMountedEquipment(
  input: ConfigurationMountedEquipmentInput,
): IMountedEquipmentInstance {
  return {
    ...input,
    ...CONFIGURATION_MOUNTED_EQUIPMENT_DEFAULTS,
    location: input.location,
    slots: input.slots,
  };
}
