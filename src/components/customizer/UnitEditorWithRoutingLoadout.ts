import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  AvailableLocation,
  LoadoutEquipmentItem,
} from '@/components/customizer/equipment/GlobalLoadoutTray';
import type { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';
import type { ArmActuatorConfig } from '@/utils/construction/slotOperations/topology';

import { MechLocation } from '@/types/construction';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import {
  MechConfiguration,
  getLocationsForConfig,
} from '@/types/construction/MechConfigurationSystem';
import { EquipmentCategory } from '@/types/equipment';
import { isValidLocationForEquipment } from '@/types/equipment/EquipmentPlacement';
import { JUMP_JETS } from '@/types/equipment/MiscEquipmentTypes';
import { hasAssignedCriticalSlots } from '@/utils/construction/slotOperations/placement';
import { getAvailableSlotIndices } from '@/utils/construction/slotOperations/queries';
import { findContiguousSlotStarts } from '@/utils/construction/slotOperations/topology';
import {
  getWeaponById,
  isDirectFireWeaponById,
} from '@/utils/equipment/weapons/utilities';

const JUMP_JET_IDS = new Set(JUMP_JETS.map((jj) => jj.id));

const LOCATION_LABELS: Partial<Record<MechLocation, string>> = {
  [MechLocation.HEAD]: 'Head',
  [MechLocation.CENTER_TORSO]: 'Center Torso',
  [MechLocation.LEFT_TORSO]: 'Left Torso',
  [MechLocation.RIGHT_TORSO]: 'Right Torso',
  [MechLocation.LEFT_ARM]: 'Left Arm',
  [MechLocation.RIGHT_ARM]: 'Right Arm',
  [MechLocation.LEFT_LEG]: 'Left Leg',
  [MechLocation.RIGHT_LEG]: 'Right Leg',
};

interface UseUnitEditorLoadoutOptions {
  unitId: string;
  configuration?: MechConfiguration;
  equipment: readonly IMountedEquipmentInstance[];
  engineType: EngineType;
  gyroType: GyroType;
  armActuators?: ArmActuatorConfig;
  removeEquipment: (instanceId: string) => void;
  clearAllEquipment: () => void;
  clearEquipmentLocation: (instanceId: string) => void;
  updateEquipmentLocation: (
    instanceId: string,
    location: MechLocation,
    slots: readonly number[],
  ) => void;
}

interface UseUnitEditorLoadoutResult {
  selectedEquipmentId: string | null;
  loadoutEquipment: LoadoutEquipmentItem[];
  availableLocations: AvailableLocation[];
  handleSelectEquipment: (id: string | null) => void;
  handleRemoveEquipment: (instanceId: string) => void;
  handleRemoveAllEquipment: () => void;
  handleUnassignEquipment: (instanceId: string) => void;
  handleQuickAssign: (instanceId: string, location: MechLocation) => void;
  getAvailableLocationsForEquipment: (
    equipmentInstanceId: string,
  ) => AvailableLocation[];
}

function toLoadoutEquipmentItem(
  item: IMountedEquipmentInstance,
): LoadoutEquipmentItem {
  const normalizedCategory = JUMP_JET_IDS.has(item.equipmentId)
    ? EquipmentCategory.MOVEMENT
    : item.category;

  const weapon = getWeaponById(item.equipmentId);
  const isDirectFire = isDirectFireWeaponById(item.equipmentId);

  return {
    instanceId: item.instanceId,
    equipmentId: item.equipmentId,
    name: item.name,
    category: normalizedCategory,
    weight: item.weight,
    criticalSlots: item.criticalSlots,
    heat: weapon?.heat ?? item.heat,
    damage: weapon?.damage,
    ranges:
      weapon && weapon.ranges
        ? {
            minimum: weapon.ranges.minimum,
            short: weapon.ranges.short,
            medium: weapon.ranges.medium,
            long: weapon.ranges.long,
          }
        : undefined,
    isAllocated: hasAssignedCriticalSlots(item),
    location: item.location,
    isRemovable: item.isRemovable,
    isOmniPodMounted: item.isOmniPodMounted,
    targetingComputerCompatible: isDirectFire,
  };
}

export function useUnitEditorLoadout({
  unitId,
  configuration = MechConfiguration.BIPED,
  equipment,
  engineType,
  gyroType,
  armActuators,
  removeEquipment,
  clearAllEquipment,
  clearEquipmentLocation,
  updateEquipmentLocation,
}: UseUnitEditorLoadoutOptions): UseUnitEditorLoadoutResult {
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    setSelectedEquipmentId(null);
  }, [unitId]);

  useEffect(() => {
    if (
      selectedEquipmentId &&
      !equipment.some((item) => item.instanceId === selectedEquipmentId)
    )
      setSelectedEquipmentId(null);
  }, [equipment, selectedEquipmentId]);

  const loadoutEquipment = useMemo(
    () => equipment.map((item) => toLoadoutEquipmentItem(item)),
    [equipment],
  );

  const handleRemoveEquipment = useCallback(
    (instanceId: string) => {
      removeEquipment(instanceId);
    },
    [removeEquipment],
  );

  const handleRemoveAllEquipment = useCallback(() => {
    clearAllEquipment();
  }, [clearAllEquipment]);

  const handleSelectEquipment = useCallback((id: string | null) => {
    setSelectedEquipmentId(id);
  }, []);

  const handleUnassignEquipment = useCallback(
    (instanceId: string) => {
      clearEquipmentLocation(instanceId);
    },
    [clearEquipmentLocation],
  );

  const getAvailableLocationsForEquipment = useCallback(
    (instanceId: string): AvailableLocation[] => {
      const item = equipment.find(
        (candidate) => candidate.instanceId === instanceId,
      );
      if (!item) return [];
      return getLocationsForConfig(configuration).map((location) => {
        const free = getAvailableSlotIndices(
          location,
          engineType,
          gyroType,
          equipment.filter((candidate) => candidate.instanceId !== instanceId),
          armActuators,
        );
        const allowed = isValidLocationForEquipment(item.equipmentId, location);
        const fits =
          item.criticalSlots === 0 ||
          findContiguousSlotStarts(free, item.criticalSlots).length > 0;
        return {
          location,
          label: LOCATION_LABELS[location] ?? location,
          availableSlots: free.length,
          canFit: allowed && fits,
          reason: !allowed
            ? 'Equipment is restricted from this location.'
            : !fits
              ? `Needs ${item.criticalSlots} contiguous slots; ${free.length} free.`
              : undefined,
        };
      });
    },
    [equipment, engineType, gyroType, configuration, armActuators],
  );

  const availableLocations = useMemo(
    () =>
      selectedEquipmentId
        ? getAvailableLocationsForEquipment(selectedEquipmentId)
        : [],
    [selectedEquipmentId, getAvailableLocationsForEquipment],
  );

  const handleQuickAssign = useCallback(
    (instanceId: string, location: MechLocation) => {
      const item = equipment.find(
        (candidate) => candidate.instanceId === instanceId,
      );
      if (
        !item ||
        !getAvailableLocationsForEquipment(instanceId).some(
          (candidate) => candidate.location === location && candidate.canFit,
        )
      )
        return;
      const free = getAvailableSlotIndices(
        location,
        engineType,
        gyroType,
        equipment.filter((candidate) => candidate.instanceId !== instanceId),
        armActuators,
      );
      const start = findContiguousSlotStarts(free, item.criticalSlots)[0];
      if (item.criticalSlots > 0 && start === undefined) return;
      updateEquipmentLocation(
        instanceId,
        location,
        Array.from({ length: item.criticalSlots }, (_, index) => start + index),
      );
      setSelectedEquipmentId(null);
    },
    [
      equipment,
      engineType,
      gyroType,
      armActuators,
      getAvailableLocationsForEquipment,
      updateEquipmentLocation,
    ],
  );

  return {
    selectedEquipmentId,
    loadoutEquipment,
    availableLocations,
    handleSelectEquipment,
    handleRemoveEquipment,
    handleRemoveAllEquipment,
    handleUnassignEquipment,
    handleQuickAssign,
    getAvailableLocationsForEquipment,
  };
}
