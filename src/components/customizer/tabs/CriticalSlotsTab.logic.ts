import { useCallback, useEffect, useMemo, useRef } from 'react';

import type { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';

import { useCustomizerStore } from '@/stores/useCustomizerStore';
import { useUnitStore } from '@/stores/useUnitStore';
import { MechLocation } from '@/types/construction';
import { isValidLocationForEquipment } from '@/types/equipment/EquipmentPlacement';
import {
  fillUnhittableSlots,
  compactEquipmentSlots,
  sortEquipmentBySize,
  getUnallocatedUnhittables,
} from '@/utils/construction/slotOperations';
import { logger } from '@/utils/logger';

import type { LocationData } from '../critical-slots';

import { slotsToCritEntries } from '../critical-slots';
import {
  buildPlacementFingerprint,
  wouldAssignmentsChange,
} from './CriticalSlotsTab.auto';
import { buildLocationSlots } from './CriticalSlotsTab.slotBuilders';

interface UseCriticalSlotsTabLogicArgs {
  readonly readOnly: boolean;
  readonly selectedEquipmentId?: string | null;
  readonly onSelectEquipment?: (id: string | null) => void;
}

interface AutoModeSettingsView {
  readonly autoFillUnhittables: boolean;
  readonly autoCompact: boolean;
  readonly autoSort: boolean;
}

interface UseCriticalSlotsTabLogicResult {
  readonly selectedEquipment: IMountedEquipmentInstance | null;
  readonly unassignedEquipment: readonly IMountedEquipmentInstance[];
  readonly isOmni: boolean;
  readonly autoModeSettings: AutoModeSettingsView;
  readonly toggleAutoFillUnhittables: () => void;
  readonly toggleAutoCompact: () => void;
  readonly toggleAutoSort: () => void;
  readonly getLocationData: (location: MechLocation) => LocationData;
  readonly getAssignableSlots: (location: MechLocation) => number[];
  readonly handleSlotClick: (location: MechLocation, slotIndex: number) => void;
  readonly handleEquipmentDrop: (
    location: MechLocation,
    slotIndex: number,
    equipmentId: string,
  ) => void;
  readonly handleEquipmentRemove: (
    location: MechLocation,
    slotIndex: number,
  ) => void;
  readonly handleReset: () => void;
  readonly handleFill: () => void;
  readonly handleCompact: () => void;
  readonly handleSort: () => void;
  readonly handleEquipmentDragStart: (equipmentId: string) => void;
}

export function useCriticalSlotsTabLogic({
  readOnly,
  selectedEquipmentId,
  onSelectEquipment,
}: UseCriticalSlotsTabLogicArgs): UseCriticalSlotsTabLogicResult {
  const equipment = useUnitStore((s) => s.equipment);
  const engineType = useUnitStore((s) => s.engineType);
  const gyroType = useUnitStore((s) => s.gyroType);
  const isOmni = useUnitStore((s) => s.isOmni);
  const tonnage = useUnitStore((s) => s.tonnage);
  const unitIsSuperheavy = tonnage > 100;
  const updateEquipmentLocation = useUnitStore(
    (s) => s.updateEquipmentLocation,
  );
  const bulkUpdateEquipmentLocations = useUnitStore(
    (s) => s.bulkUpdateEquipmentLocations,
  );
  const clearEquipmentLocation = useUnitStore((s) => s.clearEquipmentLocation);

  const autoModeSettings = useCustomizerStore((s) => s.autoModeSettings);
  const toggleAutoFillUnhittables = useCustomizerStore(
    (s) => s.toggleAutoFillUnhittables,
  );
  const toggleAutoCompact = useCustomizerStore((s) => s.toggleAutoCompact);
  const toggleAutoSort = useCustomizerStore((s) => s.toggleAutoSort);

  const selectedEquipment = useMemo(() => {
    if (!selectedEquipmentId) return null;
    return equipment.find((e) => e.instanceId === selectedEquipmentId) || null;
  }, [equipment, selectedEquipmentId]);

  const getLocationData = useCallback(
    (location: MechLocation): LocationData => {
      const slots = buildLocationSlots(
        location,
        engineType,
        gyroType,
        equipment,
      );
      return {
        location,
        slots,
        entries: slotsToCritEntries(slots, unitIsSuperheavy),
        isSuperheavy: unitIsSuperheavy,
      };
    },
    [equipment, engineType, gyroType, unitIsSuperheavy],
  );

  const getAssignableSlots = useCallback(
    (location: MechLocation): number[] => {
      if (!selectedEquipment || readOnly) {
        return [];
      }

      if (
        !isValidLocationForEquipment(selectedEquipment.equipmentId, location)
      ) {
        return [];
      }

      const locData = getLocationData(location);
      const emptySlots = locData.slots
        .filter((slot) => slot.type === 'empty')
        .map((slot) => slot.index);

      const slotsNeeded = selectedEquipment.criticalSlots;
      const assignable: number[] = [];

      for (let i = 0; i <= emptySlots.length - slotsNeeded; i++) {
        let contiguous = true;
        for (let j = 1; j < slotsNeeded; j++) {
          if (emptySlots[i + j] !== emptySlots[i + j - 1] + 1) {
            contiguous = false;
            break;
          }
        }
        if (contiguous) {
          assignable.push(emptySlots[i]);
        }
      }

      if (unitIsSuperheavy && slotsNeeded === 1) {
        for (const entry of locData.entries) {
          if (
            entry.isDoubleSlot &&
            !entry.secondary &&
            entry.primary.type === 'equipment' &&
            entry.primary.totalSlots === 1 &&
            !assignable.includes(entry.index)
          ) {
            assignable.push(entry.index);
          }
        }
      }

      return assignable;
    },
    [selectedEquipment, readOnly, getLocationData, unitIsSuperheavy],
  );

  const handleSlotClick = useCallback(
    (location: MechLocation, slotIndex: number) => {
      if (readOnly) return;

      const locData = getLocationData(location);
      const clickedSlot = locData.slots.find(
        (slot) => slot.index === slotIndex,
      );

      if (clickedSlot?.type === 'equipment' && clickedSlot.equipmentId) {
        if (selectedEquipment?.instanceId === clickedSlot.equipmentId) {
          onSelectEquipment?.(null);
        } else {
          onSelectEquipment?.(clickedSlot.equipmentId);
        }
        return;
      }

      if (selectedEquipment && clickedSlot?.type === 'empty') {
        const assignable = getAssignableSlots(location);
        if (!assignable.includes(slotIndex)) return;

        const slots: number[] = [];
        for (let i = 0; i < selectedEquipment.criticalSlots; i++) {
          slots.push(slotIndex + i);
        }

        updateEquipmentLocation(selectedEquipment.instanceId, location, slots);
        onSelectEquipment?.(null);
      }
    },
    [
      readOnly,
      selectedEquipment,
      getLocationData,
      getAssignableSlots,
      updateEquipmentLocation,
      onSelectEquipment,
    ],
  );

  const handleEquipmentDrop = useCallback(
    (location: MechLocation, slotIndex: number, equipmentId: string) => {
      if (readOnly) return;
      const eq = equipment.find((item) => item.instanceId === equipmentId);
      if (!eq) return;

      if (!isValidLocationForEquipment(eq.equipmentId, location)) {
        return;
      }

      const locData = getLocationData(location);
      const slotsNeeded = eq.criticalSlots;

      if (unitIsSuperheavy && slotsNeeded === 1) {
        const targetEntry = locData.entries.find(
          (entry) => entry.index === slotIndex,
        );
        if (
          targetEntry &&
          targetEntry.isDoubleSlot &&
          !targetEntry.secondary &&
          targetEntry.primary.type === 'equipment' &&
          targetEntry.primary.totalSlots === 1
        ) {
          logger.debug(
            `Superheavy pairing: ${eq.name} -> slot ${slotIndex} (pairing not yet wired to store)`,
          );
        }
      }

      for (let i = 0; i < slotsNeeded; i++) {
        const targetSlot = locData.slots.find(
          (slot) => slot.index === slotIndex + i,
        );
        if (!targetSlot || targetSlot.type !== 'empty') {
          return;
        }
      }

      const slots: number[] = [];
      for (let i = 0; i < slotsNeeded; i++) {
        slots.push(slotIndex + i);
      }
      updateEquipmentLocation(equipmentId, location, slots);
      onSelectEquipment?.(null);
    },
    [
      readOnly,
      equipment,
      getLocationData,
      unitIsSuperheavy,
      updateEquipmentLocation,
      onSelectEquipment,
    ],
  );

  const handleEquipmentRemove = useCallback(
    (location: MechLocation, slotIndex: number) => {
      if (readOnly) return;
      const locData = getLocationData(location);
      const slot = locData.slots.find((item) => item.index === slotIndex);
      if (!slot || slot.type !== 'equipment' || !slot.equipmentId) return;
      clearEquipmentLocation(slot.equipmentId);
    },
    [readOnly, getLocationData, clearEquipmentLocation],
  );

  const handleReset = useCallback(() => {
    if (readOnly) return;
    for (const eq of equipment) {
      if (eq.location !== undefined) {
        clearEquipmentLocation(eq.instanceId);
      }
    }
  }, [readOnly, equipment, clearEquipmentLocation]);

  const handleFill = useCallback(() => {
    if (readOnly) return;
    const result = fillUnhittableSlots(equipment, engineType, gyroType);
    if (result.assignments.length > 0) {
      bulkUpdateEquipmentLocations(result.assignments);
    }
  }, [readOnly, equipment, engineType, gyroType, bulkUpdateEquipmentLocations]);

  const handleCompact = useCallback(() => {
    if (readOnly) return;
    const result = compactEquipmentSlots(equipment, engineType, gyroType);
    if (result.assignments.length > 0) {
      bulkUpdateEquipmentLocations(result.assignments);
    }
  }, [readOnly, equipment, engineType, gyroType, bulkUpdateEquipmentLocations]);

  const handleSort = useCallback(() => {
    if (readOnly) return;
    const result = sortEquipmentBySize(equipment, engineType, gyroType);
    if (result.assignments.length > 0) {
      bulkUpdateEquipmentLocations(result.assignments);
    }
  }, [readOnly, equipment, engineType, gyroType, bulkUpdateEquipmentLocations]);

  const isAutoRunning = useRef(false);

  const unallocatedUnhittableCount = useMemo(() => {
    return getUnallocatedUnhittables(equipment).length;
  }, [equipment]);

  useEffect(() => {
    if (readOnly || isAutoRunning.current) return;
    if (!autoModeSettings.autoFillUnhittables) return;
    if (unallocatedUnhittableCount === 0) return;

    isAutoRunning.current = true;

    const timer = setTimeout(() => {
      const result = fillUnhittableSlots(equipment, engineType, gyroType);
      if (result.assignments.length > 0) {
        bulkUpdateEquipmentLocations(result.assignments);
      }
      isAutoRunning.current = false;
    }, 100);

    return () => {
      clearTimeout(timer);
      isAutoRunning.current = false;
    };
  }, [
    unallocatedUnhittableCount,
    autoModeSettings.autoFillUnhittables,
    readOnly,
    equipment,
    engineType,
    gyroType,
    bulkUpdateEquipmentLocations,
  ]);

  const placementFingerprint = useMemo(
    () => buildPlacementFingerprint(equipment),
    [equipment],
  );

  useEffect(() => {
    if (readOnly || isAutoRunning.current) return;
    if (!autoModeSettings.autoSort && !autoModeSettings.autoCompact) return;

    const placedEquipment = equipment.filter((eq) => eq.location !== undefined);
    if (placedEquipment.length === 0) return;

    isAutoRunning.current = true;

    const timer = setTimeout(() => {
      let result;
      if (autoModeSettings.autoSort) {
        result = sortEquipmentBySize(equipment, engineType, gyroType);
      } else if (autoModeSettings.autoCompact) {
        result = compactEquipmentSlots(equipment, engineType, gyroType);
      }

      if (result && result.assignments.length > 0) {
        const hasChanges = wouldAssignmentsChange(
          result.assignments,
          equipment,
        );
        if (hasChanges) {
          bulkUpdateEquipmentLocations(result.assignments);
        }
      }

      isAutoRunning.current = false;
    }, 50);

    return () => {
      clearTimeout(timer);
      isAutoRunning.current = false;
    };
  }, [
    placementFingerprint,
    readOnly,
    autoModeSettings,
    equipment,
    engineType,
    gyroType,
    bulkUpdateEquipmentLocations,
  ]);

  const handleEquipmentDragStart = useCallback(
    (equipmentId: string) => {
      onSelectEquipment?.(equipmentId);
    },
    [onSelectEquipment],
  );

  const unassignedEquipment = useMemo(() => {
    return equipment.filter((e) => !e.location);
  }, [equipment]);

  return {
    selectedEquipment,
    unassignedEquipment,
    isOmni,
    autoModeSettings,
    toggleAutoFillUnhittables,
    toggleAutoCompact,
    toggleAutoSort,
    getLocationData,
    getAssignableSlots,
    handleSlotClick,
    handleEquipmentDrop,
    handleEquipmentRemove,
    handleReset,
    handleFill,
    handleCompact,
    handleSort,
    handleEquipmentDragStart,
  };
}
