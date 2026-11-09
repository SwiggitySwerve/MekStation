import { useCallback, useMemo, type ChangeEvent } from 'react';

import type { IProtoMechMountedEquipment } from '@/types/unit/PersonnelInterfaces';

import { useProtoMechStore } from '@/stores/useProtoMechStore';
import { ProtoMechLocation } from '@/types/construction/UnitLocation';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';
import {
  getProtoLocationSlotLimit,
  getProtoMainGunTopologyError,
  getProtoPlacementErrors,
  isProtoUltraheavyTonnage,
  protoMountTakesSlot,
} from '@/utils/construction/protomech';

export interface ProtoMechMainGunTabControls {
  hasMainGun: boolean;
  /** Everything mounted in the Main Gun location, in mount order. */
  mounts: readonly IProtoMechMountedEquipment[];
  slotsUsed: number;
  slotLimit: number;
  /** Pinned placement findings plus the absent-mount topology error. */
  errors: readonly string[];
  handleMainGunChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleRemoveMount: (instanceId: string) => void;
}

/**
 * Main Gun mount, its contents and the placement findings. MegaMekLab 62bf193
 * PMChassisView offers the mount as a checkbox; the weapons are assigned from
 * its Equipment and Assign Criticals tabs, so this tab only removes them.
 */
export function useProtoMechMainGunTabControls(
  readOnly: boolean,
): ProtoMechMainGunTabControls {
  const hasMainGun = useProtoMechStore((s) => s.hasMainGun);
  const tonnage = useProtoMechStore((s) => s.tonnage);
  const chassisType = useProtoMechStore((s) => s.chassisType);
  const equipment = useProtoMechStore((s) => s.equipment);
  const mainGunArmor = useProtoMechStore(
    (s) => s.armorByLocation[ProtoMechLocation.MAIN_GUN] ?? 0,
  );
  const setMainGun = useProtoMechStore((s) => s.setMainGun);
  const removeEquipment = useProtoMechStore((s) => s.removeEquipment);
  const setMainGunWeaponId = useProtoMechStore((s) => s.setMainGunWeaponId);

  const quad = chassisType === ProtoChassis.QUAD;
  const mounts = useMemo(
    () => equipment.filter((m) => m.location === ProtoMechLocation.MAIN_GUN),
    [equipment],
  );
  const slotLimit = getProtoLocationSlotLimit(
    ProtoMechLocation.MAIN_GUN,
    quad,
    isProtoUltraheavyTonnage(tonnage),
  );
  const errors = useMemo(() => {
    const topology = getProtoMainGunTopologyError(
      hasMainGun,
      equipment.map((m) => m.location),
      mainGunArmor,
    );
    return [
      ...(topology ? [topology] : []),
      ...getProtoPlacementErrors(
        tonnage,
        quad,
        equipment.map((m) => ({
          equipmentId: m.equipmentId,
          location: m.location,
        })),
      ),
    ];
  }, [hasMainGun, tonnage, quad, equipment, mainGunArmor]);

  const handleMainGunChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (!readOnly) {
        setMainGun(event.target.checked);
      }
    },
    [readOnly, setMainGun],
  );

  const handleRemoveMount = useCallback(
    (instanceId: string) => {
      if (readOnly) return;
      removeEquipment(instanceId);
      // The label on the record sheet follows the first weapon left in the gun.
      const remaining = mounts.find((m) => m.id !== instanceId);
      setMainGunWeaponId(remaining?.equipmentId ?? null);
    },
    [readOnly, removeEquipment, setMainGunWeaponId, mounts],
  );

  return {
    hasMainGun,
    mounts,
    slotsUsed: mounts.filter((m) => protoMountTakesSlot(m.equipmentId)).length,
    slotLimit,
    errors,
    handleMainGunChange,
    handleRemoveMount,
  };
}
