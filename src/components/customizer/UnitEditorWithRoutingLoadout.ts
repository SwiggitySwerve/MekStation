import { useCallback, useMemo, useState } from 'react';

import type {
  AvailableLocation,
  LoadoutEquipmentItem,
} from '@/components/customizer/equipment/GlobalLoadoutTray';
import type { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';

import { LOCATION_SLOT_COUNTS, MechLocation } from '@/types/construction';
import {
  EngineType,
  getEngineDefinition,
} from '@/types/construction/EngineType';
import { GyroType, getGyroDefinition } from '@/types/construction/GyroType';
import { EquipmentCategory } from '@/types/equipment';
import { isValidLocationForEquipment } from '@/types/equipment/EquipmentPlacement';
import { JUMP_JETS } from '@/types/equipment/MiscEquipmentTypes';
import {
  getWeaponById,
  isDirectFireWeaponById,
} from '@/types/equipment/weapons/utilities';
import { logger } from '@/utils/logger';

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
  equipment: readonly IMountedEquipmentInstance[];
  engineType: EngineType;
  gyroType: GyroType;
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

function getFixedSlotIndices(
  location: MechLocation,
  engineType: EngineType,
  gyroType: GyroType,
): Set<number> {
  const fixed = new Set<number>();

  switch (location) {
    case MechLocation.HEAD:
      fixed.add(0);
      fixed.add(1);
      fixed.add(2);
      fixed.add(4);
      fixed.add(5);
      break;

    case MechLocation.CENTER_TORSO: {
      const engineDef = getEngineDefinition(engineType);
      const gyroDef = getGyroDefinition(gyroType);
      const engineSlots = engineDef?.ctSlots ?? 6;
      const gyroSlots = gyroDef?.criticalSlots ?? 4;

      for (let i = 0; i < Math.min(3, engineSlots); i++) {
        fixed.add(i);
      }
      for (let i = 0; i < gyroSlots; i++) {
        fixed.add(3 + i);
      }
      for (let i = 3; i < engineSlots; i++) {
        fixed.add(3 + gyroSlots + (i - 3));
      }
      break;
    }

    case MechLocation.LEFT_ARM:
    case MechLocation.RIGHT_ARM:
    case MechLocation.LEFT_LEG:
    case MechLocation.RIGHT_LEG:
      fixed.add(0);
      fixed.add(1);
      fixed.add(2);
      fixed.add(3);
      break;

    case MechLocation.LEFT_TORSO:
    case MechLocation.RIGHT_TORSO: {
      const sideTorsoEngineDef = getEngineDefinition(engineType);
      const sideTorsoSlots = sideTorsoEngineDef?.sideTorsoSlots ?? 0;
      for (let i = 0; i < sideTorsoSlots; i++) {
        fixed.add(i);
      }
      break;
    }
  }

  return fixed;
}

function getUsedSlotIndices(
  equipment: readonly IMountedEquipmentInstance[],
  location: MechLocation,
): Set<number> {
  const usedSlotIndices = new Set<number>();

  for (const eq of equipment) {
    if (eq.location === location && eq.slots) {
      for (const slot of eq.slots) {
        usedSlotIndices.add(slot);
      }
    }
  }

  return usedSlotIndices;
}

function countAvailableSlots(
  totalSlots: number,
  fixedSlots: ReadonlySet<number>,
  usedSlots: ReadonlySet<number>,
): number {
  let available = 0;
  for (let i = 0; i < totalSlots; i++) {
    if (!fixedSlots.has(i) && !usedSlots.has(i)) {
      available++;
    }
  }
  return available;
}

function getMaxContiguousSlots(
  totalSlots: number,
  fixedSlots: ReadonlySet<number>,
  usedSlots: ReadonlySet<number>,
): number {
  let maxContiguous = 0;
  let currentContiguous = 0;

  for (let i = 0; i < totalSlots; i++) {
    if (!fixedSlots.has(i) && !usedSlots.has(i)) {
      currentContiguous++;
      maxContiguous = Math.max(maxContiguous, currentContiguous);
    } else {
      currentContiguous = 0;
    }
  }

  return maxContiguous;
}

function findFirstContiguousSlots(
  totalSlots: number,
  slotsNeeded: number,
  fixedSlots: ReadonlySet<number>,
  usedSlots: ReadonlySet<number>,
): number[] | null {
  for (let start = 0; start <= totalSlots - slotsNeeded; start++) {
    let canFit = true;

    for (let i = 0; i < slotsNeeded; i++) {
      const slotIdx = start + i;
      if (fixedSlots.has(slotIdx) || usedSlots.has(slotIdx)) {
        canFit = false;
        break;
      }
    }

    if (canFit) {
      const slots: number[] = [];
      for (let i = 0; i < slotsNeeded; i++) {
        slots.push(start + i);
      }
      return slots;
    }
  }

  return null;
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
    ranges: weapon
      ? {
          minimum: weapon.ranges.minimum,
          short: weapon.ranges.short,
          medium: weapon.ranges.medium,
          long: weapon.ranges.long,
        }
      : undefined,
    isAllocated: !!item.location,
    location: item.location,
    isRemovable: item.isRemovable,
    isOmniPodMounted: item.isOmniPodMounted,
    targetingComputerCompatible: isDirectFire,
  };
}

export function useUnitEditorLoadout({
  equipment,
  engineType,
  gyroType,
  removeEquipment,
  clearAllEquipment,
  clearEquipmentLocation,
  updateEquipmentLocation,
}: UseUnitEditorLoadoutOptions): UseUnitEditorLoadoutResult {
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(
    null,
  );

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
    (equipmentInstanceId: string): AvailableLocation[] => {
      const item = equipment.find((e) => e.instanceId === equipmentInstanceId);
      if (!item) {
        return [];
      }

      const slotsNeeded = item.criticalSlots;
      const locations: AvailableLocation[] = [];

      const allLocations = Object.values(MechLocation) as MechLocation[];
      for (const location of allLocations) {
        if (!isValidLocationForEquipment(item.equipmentId, location)) {
          locations.push({
            location,
            label: LOCATION_LABELS[location] ?? location,
            availableSlots: 0,
            canFit: false,
          });
          continue;
        }

        const totalSlots = LOCATION_SLOT_COUNTS[location] || 0;
        const fixedSlots = getFixedSlotIndices(location, engineType, gyroType);
        const usedSlotIndices = getUsedSlotIndices(equipment, location);
        const availableSlots = countAvailableSlots(
          totalSlots,
          fixedSlots,
          usedSlotIndices,
        );
        const maxContiguous = getMaxContiguousSlots(
          totalSlots,
          fixedSlots,
          usedSlotIndices,
        );

        locations.push({
          location,
          label: LOCATION_LABELS[location] ?? location,
          availableSlots,
          canFit: maxContiguous >= slotsNeeded,
        });
      }

      return locations;
    },
    [equipment, engineType, gyroType],
  );

  const availableLocations = useMemo(() => {
    if (!selectedEquipmentId) {
      return [];
    }
    return getAvailableLocationsForEquipment(selectedEquipmentId);
  }, [selectedEquipmentId, getAvailableLocationsForEquipment]);

  const handleQuickAssign = useCallback(
    (instanceId: string, location: MechLocation) => {
      const item = equipment.find((e) => e.instanceId === instanceId);
      if (!item) {
        return;
      }

      if (!isValidLocationForEquipment(item.equipmentId, location)) {
        logger.warn(
          `Cannot assign ${item.name} to ${location} - location restriction`,
        );
        return;
      }

      const totalSlots = LOCATION_SLOT_COUNTS[location] || 0;
      const slotsNeeded = item.criticalSlots;
      const fixedSlots = getFixedSlotIndices(location, engineType, gyroType);
      const usedSlotIndices = getUsedSlotIndices(equipment, location);
      const slots = findFirstContiguousSlots(
        totalSlots,
        slotsNeeded,
        fixedSlots,
        usedSlotIndices,
      );

      if (slots) {
        updateEquipmentLocation(instanceId, location, slots);
        setSelectedEquipmentId(null);
        return;
      }

      logger.warn('No contiguous slots found for quick assign');
    },
    [equipment, engineType, gyroType, updateEquipmentLocation],
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
