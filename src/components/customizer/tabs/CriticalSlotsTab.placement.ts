import { useCallback, useMemo } from 'react';

import type { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';
import type { ICriticalSlotIssue } from '@/types/validation/UnitValidationInterfaces';
import type { ArmActuatorConfig } from '@/utils/construction/slotOperations/topology';

import { MechLocation } from '@/types/construction';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import {
  MechConfiguration,
  getLocationsForConfig,
} from '@/types/construction/MechConfigurationSystem';
import { canChangeEquipmentMount } from '@/utils/construction/equipmentMutationPolicy';
import {
  getEquipmentSlotIssues,
  hasAssignedCriticalSlots,
} from '@/utils/construction/slotOperations/placement';
import { getEquipmentPlacementOption } from '@/utils/construction/slotOperations/placementOptions';

import type { LocationData } from '../critical-slots';

/**
 * Equipment the Critical Slots tab lists in its "to place" banner: not yet in
 * slots, or flagged by a placement issue. The editor shell uses the same
 * answer to avoid repeating the banner's message in the tab issue notice.
 */
export function selectEquipmentNeedingPlacement(
  equipment: readonly IMountedEquipmentInstance[],
  placementIssues: readonly ICriticalSlotIssue[],
): readonly IMountedEquipmentInstance[] {
  return equipment.filter(
    (item) =>
      !hasAssignedCriticalSlots(item) ||
      placementIssues.some((issue) => issue.instanceId === item.instanceId),
  );
}

export function getEquipmentNeedingPlacement(
  equipment: readonly IMountedEquipmentInstance[],
  configuration: MechConfiguration,
  engineType: EngineType,
  gyroType: GyroType,
  armActuators?: ArmActuatorConfig,
): readonly IMountedEquipmentInstance[] {
  return selectEquipmentNeedingPlacement(
    equipment,
    getEquipmentSlotIssues(
      equipment,
      configuration,
      engineType,
      gyroType,
      armActuators,
    ),
  );
}

export interface CriticalSlotPlacementOption {
  readonly location: MechLocation;
  readonly start?: number;
  readonly canFit: boolean;
  readonly reason?: string;
}

interface UseCriticalSlotPlacementArgs {
  readonly readOnly: boolean;
  readonly isOmni: boolean;
  readonly equipment: readonly IMountedEquipmentInstance[];
  readonly selectedEquipment: IMountedEquipmentInstance | null;
  readonly configuration: MechConfiguration;
  readonly engineType: EngineType;
  readonly gyroType: GyroType;
  readonly armActuators?: ArmActuatorConfig;
  readonly unitIsSuperheavy: boolean;
  readonly getLocationData: (
    location: MechLocation,
    excludedEquipmentId?: string,
  ) => LocationData;
  readonly updateEquipmentLocation: (
    instanceId: string,
    location: MechLocation,
    slots: number[],
  ) => void;
  readonly clearEquipmentLocation: (instanceId: string) => void;
  readonly onSelectEquipment?: (id: string | null) => void;
}

interface UseCriticalSlotPlacementResult {
  readonly locations: readonly MechLocation[];
  readonly isBiped: boolean;
  readonly placementIssues: readonly ICriticalSlotIssue[];
  readonly placementOptions: readonly CriticalSlotPlacementOption[];
  readonly handlePlaceInLocation: (location: MechLocation) => void;
  readonly handleUnassignSelected: () => void;
  readonly unassignedEquipment: readonly IMountedEquipmentInstance[];
}

export function useCriticalSlotPlacement({
  readOnly,
  isOmni,
  equipment,
  selectedEquipment,
  configuration,
  engineType,
  gyroType,
  armActuators,
  unitIsSuperheavy,
  getLocationData,
  updateEquipmentLocation,
  clearEquipmentLocation,
  onSelectEquipment,
}: UseCriticalSlotPlacementArgs): UseCriticalSlotPlacementResult {
  const locations = useMemo(
    () => getLocationsForConfig(configuration),
    [configuration],
  );
  const placementIssues = useMemo(
    () =>
      getEquipmentSlotIssues(
        equipment,
        configuration,
        engineType,
        gyroType,
        armActuators,
      ),
    [equipment, configuration, engineType, gyroType, armActuators],
  );
  const placementOptions = useMemo(
    () =>
      selectedEquipment
        ? locations.map((location) =>
            getEquipmentPlacementOption(
              selectedEquipment,
              location,
              getLocationData(location, selectedEquipment.instanceId)
                .slots.filter((slot) => slot.type === 'empty')
                .map((slot) => slot.index),
              isOmni,
              readOnly,
            ),
          )
        : [],
    [
      getLocationData,
      isOmni,
      locations,
      readOnly,
      selectedEquipment,
      unitIsSuperheavy,
    ],
  );
  const handlePlaceInLocation = useCallback(
    (location: MechLocation) => {
      const option = placementOptions.find(
        (candidate) => candidate.location === location,
      );
      if (readOnly || !selectedEquipment || !option?.canFit) return;
      const slots =
        selectedEquipment.criticalSlots === 0
          ? []
          : Array.from(
              { length: selectedEquipment.criticalSlots },
              (_, index) => option.start! + index,
            );
      updateEquipmentLocation(selectedEquipment.instanceId, location, slots);
      onSelectEquipment?.(null);
    },
    [
      onSelectEquipment,
      placementOptions,
      readOnly,
      selectedEquipment,
      updateEquipmentLocation,
    ],
  );
  const handleUnassignSelected = useCallback(() => {
    if (
      !readOnly &&
      selectedEquipment &&
      canChangeEquipmentMount(isOmni, selectedEquipment)
    ) {
      clearEquipmentLocation(selectedEquipment.instanceId);
    }
  }, [clearEquipmentLocation, isOmni, readOnly, selectedEquipment]);

  const unassignedEquipment = useMemo(
    () => selectEquipmentNeedingPlacement(equipment, placementIssues),
    [equipment, placementIssues],
  );

  return {
    locations,
    isBiped: configuration === MechConfiguration.BIPED,
    placementIssues,
    placementOptions,
    handlePlaceInLocation,
    handleUnassignSelected,
    unassignedEquipment,
  };
}
