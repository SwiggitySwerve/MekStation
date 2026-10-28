import { useCallback, useEffect, useMemo, useRef } from 'react';

import type { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';
import type { ICriticalSlotIssue } from '@/types/validation/UnitValidationInterfaces';

import { useCustomizerStore } from '@/stores/useCustomizerStore';
import { useUnitStore } from '@/stores/useUnitStore';
import { MechLocation } from '@/types/construction';
import { MechConfiguration } from '@/types/construction/MechConfigurationSystem';
import { getUnallocatedUnhittables } from '@/utils/construction/slotOperations';

import type { LocationData } from '../critical-slots';
import type { CriticalSlotPlacementOption } from './CriticalSlotsTab.placement';

import { slotsToCritEntries } from '../critical-slots';
import { buildPlacementFingerprint } from './CriticalSlotsTab.auto';
import {
  resetEquipmentLocations,
  runCompactAction,
  runFillAction,
  runSortAction,
  scheduleAutoFillUnhittables,
  scheduleAutoOrganizeEquipment,
} from './CriticalSlotsTab.logicAuto';
import { useCriticalSlotPlacement } from './CriticalSlotsTab.placement';
import {
  buildAssignableSlots,
  findEquipmentByInstanceId,
  handleEquipmentDropAction,
  handleEquipmentRemoveAction,
  handleSlotClickAction,
} from './CriticalSlotsTab.slotActions';
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
  readonly locations: readonly MechLocation[];
  readonly isBiped: boolean;
  readonly handlePlaceInLocation: (location: MechLocation) => void;
  readonly placementIssues: readonly ICriticalSlotIssue[];
  readonly placementOptions: readonly CriticalSlotPlacementOption[];
  readonly handleUnassignSelected: () => void;
  readonly isSuperheavy: boolean;
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
  const configuration =
    useUnitStore((s) => s.configuration) ?? MechConfiguration.BIPED;
  const equipment = useUnitStore((s) => s.equipment);
  const engineType = useUnitStore((s) => s.engineType);
  const gyroType = useUnitStore((s) => s.gyroType);
  const armActuators = useUnitStore((s) => s.armActuators);
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

  const selectedEquipment = useMemo(
    () => findEquipmentByInstanceId(equipment, selectedEquipmentId),
    [equipment, selectedEquipmentId],
  );

  const getLocationData = useCallback(
    (location: MechLocation, excludedEquipmentId?: string): LocationData => {
      const slots = buildLocationSlots(
        location,
        engineType,
        gyroType,
        excludedEquipmentId
          ? equipment.filter((item) => item.instanceId !== excludedEquipmentId)
          : equipment,
        armActuators,
      );
      return {
        location,
        slots,
        entries: slotsToCritEntries(slots, unitIsSuperheavy),
        isSuperheavy: unitIsSuperheavy,
      };
    },
    [equipment, engineType, gyroType, armActuators, unitIsSuperheavy],
  );

  const getAssignableSlots = useCallback(
    (location: MechLocation): number[] =>
      buildAssignableSlots({
        selectedEquipment,
        readOnly,
        location,
        getLocationData,
        unitIsSuperheavy,
      }),
    [selectedEquipment, readOnly, getLocationData, unitIsSuperheavy],
  );

  const handleSlotClick = useCallback(
    (location: MechLocation, slotIndex: number) => {
      handleSlotClickAction({
        readOnly,
        selectedEquipment,
        location,
        slotIndex,
        getLocationData,
        getAssignableSlots,
        updateEquipmentLocation,
        onSelectEquipment,
      });
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
      handleEquipmentDropAction({
        readOnly,
        equipment,
        location,
        slotIndex,
        equipmentId,
        getLocationData,
        unitIsSuperheavy,
        updateEquipmentLocation,
        onSelectEquipment,
      });
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
      handleEquipmentRemoveAction({
        readOnly,
        location,
        slotIndex,
        getLocationData,
        clearEquipmentLocation,
      });
    },
    [readOnly, getLocationData, clearEquipmentLocation],
  );

  const handleReset = useCallback(() => {
    resetEquipmentLocations(readOnly, equipment, clearEquipmentLocation);
  }, [readOnly, equipment, clearEquipmentLocation]);

  const handleFill = useCallback(() => {
    runFillAction({
      readOnly,
      equipment,
      engineType,
      gyroType,
      armActuators,
      configuration,
      isOmni,
      bulkUpdateEquipmentLocations,
    });
  }, [
    readOnly,
    equipment,
    engineType,
    gyroType,
    armActuators,
    configuration,
    isOmni,
    bulkUpdateEquipmentLocations,
  ]);

  const handleCompact = useCallback(() => {
    runCompactAction({
      readOnly,
      equipment,
      engineType,
      gyroType,
      armActuators,
      configuration,
      isOmni,
      bulkUpdateEquipmentLocations,
    });
  }, [
    readOnly,
    equipment,
    engineType,
    gyroType,
    armActuators,
    configuration,
    isOmni,
    bulkUpdateEquipmentLocations,
  ]);

  const handleSort = useCallback(() => {
    runSortAction({
      readOnly,
      equipment,
      engineType,
      gyroType,
      armActuators,
      configuration,
      isOmni,
      bulkUpdateEquipmentLocations,
    });
  }, [
    readOnly,
    equipment,
    engineType,
    gyroType,
    armActuators,
    configuration,
    isOmni,
    bulkUpdateEquipmentLocations,
  ]);

  const isAutoRunning = useRef(false);

  const unallocatedUnhittableCount = useMemo(() => {
    return getUnallocatedUnhittables(equipment).length;
  }, [equipment]);

  useEffect(
    () =>
      scheduleAutoFillUnhittables({
        readOnly,
        equipment,
        engineType,
        gyroType,
        armActuators,
        configuration,
        isOmni,
        bulkUpdateEquipmentLocations,
        autoModeSettings,
        isAutoRunning,
        unallocatedUnhittableCount,
      }),
    [
      unallocatedUnhittableCount,
      autoModeSettings,
      readOnly,
      equipment,
      engineType,
      gyroType,
      armActuators,
      configuration,
      isOmni,
      bulkUpdateEquipmentLocations,
    ],
  );

  const placementFingerprint = useMemo(
    () => buildPlacementFingerprint(equipment),
    [equipment],
  );

  useEffect(
    () =>
      scheduleAutoOrganizeEquipment({
        readOnly,
        equipment,
        engineType,
        gyroType,
        armActuators,
        configuration,
        isOmni,
        bulkUpdateEquipmentLocations,
        autoModeSettings,
        isAutoRunning,
      }),
    [
      placementFingerprint,
      readOnly,
      autoModeSettings,
      equipment,
      engineType,
      gyroType,
      armActuators,
      configuration,
      isOmni,
      bulkUpdateEquipmentLocations,
    ],
  );

  const handleEquipmentDragStart = useCallback(
    (equipmentId: string) => {
      onSelectEquipment?.(equipmentId);
    },
    [onSelectEquipment],
  );

  const {
    locations,
    isBiped,
    placementIssues,
    placementOptions,
    handlePlaceInLocation,
    handleUnassignSelected,
    unassignedEquipment,
  } = useCriticalSlotPlacement({
    readOnly,
    isOmni,
    equipment,
    selectedEquipment,
    configuration,
    engineType,
    gyroType,
    armActuators,
    getLocationData,
    updateEquipmentLocation,
    clearEquipmentLocation,
    onSelectEquipment,
  });

  return {
    locations,
    isBiped,
    handlePlaceInLocation,
    placementIssues,
    placementOptions,
    handleUnassignSelected,
    isSuperheavy: unitIsSuperheavy,
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
