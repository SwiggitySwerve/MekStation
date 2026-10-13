import type { MutableRefObject } from 'react';

import type { EngineType } from '@/types/construction/EngineType';
import type { GyroType } from '@/types/construction/GyroType';
import type { MechConfiguration } from '@/types/construction/MechConfigurationSystem';
import type { ArmActuatorConfig } from '@/utils/construction/slotOperations/topology';

import {
  compactEquipmentSlots,
  fillUnhittableSlots,
  sortEquipmentBySize,
} from '@/utils/construction/slotOperations';

import type { EquipmentList } from './CriticalSlotsTab.slotActions';

import { wouldAssignmentsChange } from './CriticalSlotsTab.auto';

type AssignmentBatch = ReturnType<typeof fillUnhittableSlots>['assignments'];
type AssignmentResult = { readonly assignments: AssignmentBatch };
type BulkUpdateEquipmentLocations = (assignments: AssignmentBatch) => void;
type ClearEquipmentLocation = (equipmentId: string) => void;
type AutoRunningRef = MutableRefObject<boolean>;

interface AutoModeSettingsView {
  readonly autoFillUnhittables: boolean;
  readonly autoCompact: boolean;
  readonly autoSort: boolean;
}

interface AssignmentActionArgs {
  readonly readOnly: boolean;
  readonly equipment: EquipmentList;
  readonly engineType: EngineType;
  readonly gyroType: GyroType;
  readonly armActuators?: ArmActuatorConfig;
  readonly configuration?: MechConfiguration;
  readonly isOmni?: boolean;
  readonly bulkUpdateEquipmentLocations: BulkUpdateEquipmentLocations;
}

interface AutoFillArgs extends AssignmentActionArgs {
  readonly autoModeSettings: AutoModeSettingsView;
  readonly isAutoRunning: AutoRunningRef;
  readonly unallocatedUnhittableCount: number;
}

interface AutoOrganizeArgs extends AssignmentActionArgs {
  readonly autoModeSettings: AutoModeSettingsView;
  readonly isAutoRunning: AutoRunningRef;
}

function applyAssignments(
  result: AssignmentResult,
  bulkUpdateEquipmentLocations: BulkUpdateEquipmentLocations,
): void {
  if (result.assignments.length > 0) {
    bulkUpdateEquipmentLocations(result.assignments);
  }
}

export function resetEquipmentLocations(
  readOnly: boolean,
  equipment: EquipmentList,
  clearEquipmentLocation: ClearEquipmentLocation,
): void {
  if (readOnly) return;
  for (const eq of equipment) {
    if (eq.location !== undefined) {
      clearEquipmentLocation(eq.instanceId);
    }
  }
}

export function runFillAction(args: AssignmentActionArgs): void {
  if (args.readOnly) return;
  applyAssignments(
    fillUnhittableSlots(
      args.equipment,
      args.engineType,
      args.gyroType,
      args.configuration,
      args.armActuators,
    ),
    args.bulkUpdateEquipmentLocations,
  );
}

export function runCompactAction(args: AssignmentActionArgs): void {
  if (args.readOnly) return;
  applyAssignments(
    compactEquipmentSlots(
      args.equipment,
      args.engineType,
      args.gyroType,
      args.configuration,
      args.isOmni,
      args.armActuators,
    ),
    args.bulkUpdateEquipmentLocations,
  );
}

export function runSortAction(args: AssignmentActionArgs): void {
  if (args.readOnly) return;
  applyAssignments(
    sortEquipmentBySize(
      args.equipment,
      args.engineType,
      args.gyroType,
      args.configuration,
      args.isOmni,
      args.armActuators,
    ),
    args.bulkUpdateEquipmentLocations,
  );
}

export function scheduleAutoFillUnhittables({
  readOnly,
  equipment,
  engineType,
  gyroType,
  armActuators,
  configuration,
  bulkUpdateEquipmentLocations,
  autoModeSettings,
  isAutoRunning,
  unallocatedUnhittableCount,
}: AutoFillArgs): (() => void) | undefined {
  if (readOnly || isAutoRunning.current) return undefined;
  if (!autoModeSettings.autoFillUnhittables) return undefined;
  if (unallocatedUnhittableCount === 0) return undefined;

  isAutoRunning.current = true;
  const timer = setTimeout(() => {
    applyAssignments(
      fillUnhittableSlots(
        equipment,
        engineType,
        gyroType,
        configuration,
        armActuators,
      ),
      bulkUpdateEquipmentLocations,
    );
    isAutoRunning.current = false;
  }, 100);

  return () => {
    clearTimeout(timer);
    isAutoRunning.current = false;
  };
}

function chooseAutoOrganizeResult({
  autoModeSettings,
  equipment,
  engineType,
  gyroType,
  armActuators,
  configuration,
  isOmni,
}: Omit<
  AutoOrganizeArgs,
  'readOnly' | 'bulkUpdateEquipmentLocations' | 'isAutoRunning'
>): AssignmentResult | undefined {
  if (autoModeSettings.autoSort) {
    return sortEquipmentBySize(
      equipment,
      engineType,
      gyroType,
      configuration,
      isOmni,
      armActuators,
    );
  }
  if (autoModeSettings.autoCompact) {
    return compactEquipmentSlots(
      equipment,
      engineType,
      gyroType,
      configuration,
      isOmni,
      armActuators,
    );
  }
  return undefined;
}

function applyAutoOrganizeResult(
  result: AssignmentResult | undefined,
  equipment: EquipmentList,
  bulkUpdateEquipmentLocations: BulkUpdateEquipmentLocations,
): void {
  if (!result || result.assignments.length === 0) return;
  if (wouldAssignmentsChange(result.assignments, equipment)) {
    bulkUpdateEquipmentLocations(result.assignments);
  }
}

function hasPlacedEquipment(equipment: EquipmentList): boolean {
  return equipment.some((eq) => eq.location !== undefined);
}

export function scheduleAutoOrganizeEquipment({
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
}: AutoOrganizeArgs): (() => void) | undefined {
  if (readOnly || isAutoRunning.current) return undefined;
  if (!autoModeSettings.autoSort && !autoModeSettings.autoCompact) {
    return undefined;
  }
  if (!hasPlacedEquipment(equipment)) return undefined;

  isAutoRunning.current = true;
  const timer = setTimeout(() => {
    applyAutoOrganizeResult(
      chooseAutoOrganizeResult({
        autoModeSettings,
        equipment,
        engineType,
        gyroType,
        armActuators,
        configuration,
        isOmni,
      }),
      equipment,
      bulkUpdateEquipmentLocations,
    );
    isAutoRunning.current = false;
  }, 50);

  return () => {
    clearTimeout(timer);
    isAutoRunning.current = false;
  };
}
