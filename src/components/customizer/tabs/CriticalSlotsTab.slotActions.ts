import type { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';

import { MechLocation } from '@/types/construction';
import { isValidLocationForEquipment } from '@/types/equipment/EquipmentPlacement';
import { logger } from '@/utils/logger';

import type { LocationData } from '../critical-slots';

export type EquipmentList = readonly IMountedEquipmentInstance[];
type GetLocationData = (location: MechLocation) => LocationData;
type UpdateEquipmentLocation = (
  equipmentId: string,
  location: MechLocation,
  slots: number[],
) => void;
type ClearEquipmentLocation = (equipmentId: string) => void;

interface AssignableSlotArgs {
  readonly selectedEquipment: IMountedEquipmentInstance | null;
  readonly readOnly: boolean;
  readonly location: MechLocation;
  readonly getLocationData: GetLocationData;
  readonly unitIsSuperheavy: boolean;
}

interface SlotClickActionArgs {
  readonly readOnly: boolean;
  readonly selectedEquipment: IMountedEquipmentInstance | null;
  readonly location: MechLocation;
  readonly slotIndex: number;
  readonly getLocationData: GetLocationData;
  readonly getAssignableSlots: (location: MechLocation) => number[];
  readonly updateEquipmentLocation: UpdateEquipmentLocation;
  readonly onSelectEquipment?: (id: string | null) => void;
}

interface EquipmentDropActionArgs {
  readonly readOnly: boolean;
  readonly equipment: EquipmentList;
  readonly location: MechLocation;
  readonly slotIndex: number;
  readonly equipmentId: string;
  readonly getLocationData: GetLocationData;
  readonly unitIsSuperheavy: boolean;
  readonly updateEquipmentLocation: UpdateEquipmentLocation;
  readonly onSelectEquipment?: (id: string | null) => void;
}

interface EquipmentRemoveActionArgs {
  readonly readOnly: boolean;
  readonly location: MechLocation;
  readonly slotIndex: number;
  readonly getLocationData: GetLocationData;
  readonly clearEquipmentLocation: ClearEquipmentLocation;
}

export function findEquipmentByInstanceId(
  equipment: EquipmentList,
  equipmentId: string | null | undefined,
): IMountedEquipmentInstance | null {
  if (!equipmentId) return null;
  return equipment.find((item) => item.instanceId === equipmentId) ?? null;
}

function buildSlotIndexes(slotIndex: number, slotsNeeded: number): number[] {
  return Array.from({ length: slotsNeeded }, (_, index) => slotIndex + index);
}

function findContiguousSlotStarts(
  emptySlots: readonly number[],
  slotsNeeded: number,
): number[] {
  const assignable: number[] = [];
  for (let i = 0; i <= emptySlots.length - slotsNeeded; i++) {
    if (isContiguousRun(emptySlots, i, slotsNeeded)) {
      assignable.push(emptySlots[i]);
    }
  }
  return assignable;
}

function isContiguousRun(
  slots: readonly number[],
  startIndex: number,
  slotsNeeded: number,
): boolean {
  for (let i = 1; i < slotsNeeded; i++) {
    if (slots[startIndex + i] !== slots[startIndex + i - 1] + 1) {
      return false;
    }
  }
  return true;
}

function isSuperheavyPairingEntry(
  entry: LocationData['entries'][number],
): boolean {
  return (
    entry.isDoubleSlot &&
    !entry.secondary &&
    entry.primary.type === 'equipment' &&
    entry.primary.totalSlots === 1
  );
}

function appendSuperheavyPairingSlots(
  assignable: number[],
  locData: LocationData,
): void {
  for (const entry of locData.entries) {
    if (isSuperheavyPairingEntry(entry) && !assignable.includes(entry.index)) {
      assignable.push(entry.index);
    }
  }
}

export function buildAssignableSlots({
  selectedEquipment,
  readOnly,
  location,
  getLocationData,
  unitIsSuperheavy,
}: AssignableSlotArgs): number[] {
  if (!selectedEquipment || readOnly) return [];
  if (!isValidLocationForEquipment(selectedEquipment.equipmentId, location)) {
    return [];
  }

  const locData = getLocationData(location);
  const emptySlots = locData.slots
    .filter((slot) => slot.type === 'empty')
    .map((slot) => slot.index);
  const assignable = findContiguousSlotStarts(
    emptySlots,
    selectedEquipment.criticalSlots,
  );

  if (unitIsSuperheavy && selectedEquipment.criticalSlots === 1) {
    appendSuperheavyPairingSlots(assignable, locData);
  }
  return assignable;
}

function selectClickedEquipment(
  clickedEquipmentId: string,
  selectedEquipment: IMountedEquipmentInstance | null,
  onSelectEquipment?: (id: string | null) => void,
): void {
  const nextSelection =
    selectedEquipment?.instanceId === clickedEquipmentId
      ? null
      : clickedEquipmentId;
  onSelectEquipment?.(nextSelection);
}

export function handleSlotClickAction({
  readOnly,
  selectedEquipment,
  location,
  slotIndex,
  getLocationData,
  getAssignableSlots,
  updateEquipmentLocation,
  onSelectEquipment,
}: SlotClickActionArgs): void {
  if (readOnly) return;

  const locData = getLocationData(location);
  const clickedSlot = locData.slots.find((slot) => slot.index === slotIndex);

  if (clickedSlot?.type === 'equipment' && clickedSlot.equipmentId) {
    selectClickedEquipment(
      clickedSlot.equipmentId,
      selectedEquipment,
      onSelectEquipment,
    );
    return;
  }

  if (!selectedEquipment || clickedSlot?.type !== 'empty') return;
  if (!getAssignableSlots(location).includes(slotIndex)) return;

  updateEquipmentLocation(
    selectedEquipment.instanceId,
    location,
    buildSlotIndexes(slotIndex, selectedEquipment.criticalSlots),
  );
  onSelectEquipment?.(null);
}

function hasEmptySlotRun(
  locData: LocationData,
  slotIndex: number,
  slotsNeeded: number,
): boolean {
  for (const targetIndex of buildSlotIndexes(slotIndex, slotsNeeded)) {
    const targetSlot = locData.slots.find((slot) => slot.index === targetIndex);
    if (!targetSlot || targetSlot.type !== 'empty') return false;
  }
  return true;
}

function logSuperheavyPairingIfNeeded(
  locData: LocationData,
  eq: IMountedEquipmentInstance,
  slotIndex: number,
  unitIsSuperheavy: boolean,
): void {
  if (!unitIsSuperheavy || eq.criticalSlots !== 1) return;

  const targetEntry = locData.entries.find(
    (entry) => entry.index === slotIndex,
  );
  if (targetEntry && isSuperheavyPairingEntry(targetEntry)) {
    logger.debug(
      `Superheavy pairing: ${eq.name} -> slot ${slotIndex} (pairing not yet wired to store)`,
    );
  }
}

export function handleEquipmentDropAction({
  readOnly,
  equipment,
  location,
  slotIndex,
  equipmentId,
  getLocationData,
  unitIsSuperheavy,
  updateEquipmentLocation,
  onSelectEquipment,
}: EquipmentDropActionArgs): void {
  if (readOnly) return;

  const eq = findEquipmentByInstanceId(equipment, equipmentId);
  if (!eq) return;
  if (!isValidLocationForEquipment(eq.equipmentId, location)) return;

  const locData = getLocationData(location);
  logSuperheavyPairingIfNeeded(locData, eq, slotIndex, unitIsSuperheavy);
  if (!hasEmptySlotRun(locData, slotIndex, eq.criticalSlots)) return;

  updateEquipmentLocation(
    equipmentId,
    location,
    buildSlotIndexes(slotIndex, eq.criticalSlots),
  );
  onSelectEquipment?.(null);
}

export function handleEquipmentRemoveAction({
  readOnly,
  location,
  slotIndex,
  getLocationData,
  clearEquipmentLocation,
}: EquipmentRemoveActionArgs): void {
  if (readOnly) return;

  const locData = getLocationData(location);
  const slot = locData.slots.find((item) => item.index === slotIndex);
  if (!slot || slot.type !== 'equipment' || !slot.equipmentId) return;

  clearEquipmentLocation(slot.equipmentId);
}
