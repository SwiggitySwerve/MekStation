import { useCallback, useMemo } from 'react';

import type { IEquipmentItem } from '@/types/equipment';
import type { IProtoMechMountedEquipment } from '@/types/unit/PersonnelInterfaces';

import { useProtoMechStore } from '@/stores/useProtoMechStore';
import { ProtoMechLocation } from '@/types/construction/UnitLocation';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';
import {
  getProtoLocationSlotLimit,
  getProtoPlacementErrors,
  isProtoUltraheavyTonnage,
} from '@/utils/construction/protomech';
import { isProtoMechLoadoutMount } from '@/utils/construction/protomech/equipmentLegality';

import { LOCATION_LABELS } from './ProtoMechStructureTab.logic';

export interface ProtoMechLocationOption {
  value: ProtoMechLocation;
  label: string;
}

export interface ProtoMechEquipmentTabControls {
  /** Loadout mounts in mount order (PMEquipmentTab.showInLoadOut). */
  mounts: readonly IProtoMechMountedEquipment[];
  /** Pinned placement findings for every mount on the unit. */
  errors: readonly string[];
  locationOptionsFor: (
    mount: IProtoMechMountedEquipment,
  ) => readonly ProtoMechLocationOption[];
  handleAdd: (item: IEquipmentItem) => void;
  handleMove: (instanceId: string, location: ProtoMechLocation) => void;
  handleRemove: (instanceId: string) => void;
}

/**
 * The Equipment tab's store reads and edits. MegaMekLab adds an item unplaced and
 * places it in Assign Criticals (PMEquipmentDatabaseView.addEquipment); MekStation
 * has no such tab, so an item is added to the Torso and moved from the list.
 */
export function useProtoMechEquipmentTabControls(
  readOnly: boolean,
): ProtoMechEquipmentTabControls {
  const equipment = useProtoMechStore((s) => s.equipment);
  const tonnage = useProtoMechStore((s) => s.tonnage);
  const chassisType = useProtoMechStore((s) => s.chassisType);
  const hasMainGun = useProtoMechStore((s) => s.hasMainGun);
  const addEquipment = useProtoMechStore((s) => s.addEquipment);
  const updateEquipmentLocation = useProtoMechStore(
    (s) => s.updateEquipmentLocation,
  );
  const removeEquipment = useProtoMechStore((s) => s.removeEquipment);

  const quad = chassisType === ProtoChassis.QUAD;
  const mounts = useMemo(
    () => equipment.filter((m) => isProtoMechLoadoutMount(m.equipmentId)),
    [equipment],
  );
  const errors = useMemo(
    () =>
      getProtoPlacementErrors(
        tonnage,
        quad,
        equipment.map((m) => ({
          equipmentId: m.equipmentId,
          location: m.location,
        })),
      ),
    [tonnage, quad, equipment],
  );

  const locations = useMemo(() => {
    const ultra = isProtoUltraheavyTonnage(tonnage);
    const hasArms = getProtoLocationSlotLimit(
      ProtoMechLocation.LEFT_ARM,
      quad,
      ultra,
    );
    return [
      ProtoMechLocation.TORSO,
      ...(hasArms > 0
        ? [ProtoMechLocation.LEFT_ARM, ProtoMechLocation.RIGHT_ARM]
        : []),
      ...(hasMainGun ? [ProtoMechLocation.MAIN_GUN] : []),
    ];
  }, [tonnage, quad, hasMainGun]);

  const locationOptionsFor = useCallback(
    (mount: IProtoMechMountedEquipment) =>
      // A source mount may sit where the editor would not place one; keep it visible.
      (locations.includes(mount.location)
        ? locations
        : [...locations, mount.location]
      ).map((value) => ({ value, label: LOCATION_LABELS[value] })),
    [locations],
  );

  const handleAdd = useCallback(
    (item: IEquipmentItem) => {
      if (!readOnly) addEquipment(item, ProtoMechLocation.TORSO);
    },
    [readOnly, addEquipment],
  );
  const handleMove = useCallback(
    (instanceId: string, location: ProtoMechLocation) => {
      if (!readOnly) updateEquipmentLocation(instanceId, location);
    },
    [readOnly, updateEquipmentLocation],
  );
  const handleRemove = useCallback(
    (instanceId: string) => {
      if (!readOnly) removeEquipment(instanceId);
    },
    [readOnly, removeEquipment],
  );

  return {
    mounts,
    errors,
    locationOptionsFor,
    handleAdd,
    handleMove,
    handleRemove,
  };
}
