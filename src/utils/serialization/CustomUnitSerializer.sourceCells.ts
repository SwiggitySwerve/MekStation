import type { UnitState } from '@/stores/unitState';
import type { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';

import { getMTFCriticalSlotSystemIdentity } from '@/services/conversion/MTFVocabulary';
import { getCriticalSlotsForLocation } from '@/services/units/unitLoaderService/criticalSlotEquipment';
import {
  getMountedEquipmentSourceToken,
  parseCriticalSlotToken,
} from '@/services/units/unitLoaderService/equipmentResolution';
import {
  LOCATION_SLOT_COUNTS,
  MechLocation,
} from '@/types/construction/CriticalSlotAllocation';
import { getGyroDefinition } from '@/types/construction/GyroType';
import { getLocationsForConfig } from '@/types/construction/MechConfigurationSystem';
import { getSlotParts } from '@/utils/construction/slotOperations/parts';
import { getFixedSlotNames } from '@/utils/construction/slotOperations/topology';

/** Save source evidence only while the selected systems still name that layout. */
export function preserveSourceSystemCells(
  state: UnitState,
  result: Record<string, (string | null)[]>,
): void {
  const context = state.bvContext;
  if (!context) return;
  const { source, types } = context;
  const sameFrame =
    source.configuration === state.configuration &&
    source.tonnage === state.tonnage;
  const sameLayout =
    sameFrame &&
    types.engineType === state.engineType &&
    source.engine?.rating === state.engineRating &&
    types.gyroType === state.gyroType &&
    types.cockpitType === state.cockpitType;
  const occupied = new Map<MechLocation, Set<number>>();
  for (const item of state.equipment) {
    for (const part of getSlotParts(item)) {
      const slots = occupied.get(part.location) ?? new Set<number>();
      part.slots.forEach((slot) => slots.add(slot));
      occupied.set(part.location, slots);
    }
  }
  for (const location of getLocationsForConfig(state.configuration)) {
    const entries = getCriticalSlotsForLocation(source.criticalSlots, location);
    if (!entries) continue;
    const fixed = getFixedSlotNames(
      location,
      state.engineType,
      state.gyroType,
      state.armActuators,
      state.cockpitType,
    );
    entries.forEach((token, index) => {
      if (
        !token ||
        index >= LOCATION_SLOT_COUNTS[location] ||
        occupied.get(location)?.has(index)
      )
        return;
      const parsed = parseCriticalSlotToken(token);
      const identity = getMTFCriticalSlotSystemIdentity(parsed.lookupToken);
      if (!identity) return;
      const engine = identity === 'engine';
      if (engine ? !sameLayout : !parsed.isArmored) return;
      if (!engine) {
        // Limb topology is independent of engine/gyro/cockpit selections.
        const torsoOrHead =
          location === MechLocation.HEAD ||
          location === MechLocation.CENTER_TORSO ||
          location === MechLocation.LEFT_TORSO ||
          location === MechLocation.RIGHT_TORSO;
        if (!sameFrame || (torsoOrHead && !sameLayout)) return;
        const current = fixed.get(index);
        const currentIdentity =
          current === getGyroDefinition(state.gyroType)?.name
            ? 'gyro'
            : getMTFCriticalSlotSystemIdentity(current ?? '');
        if (identity !== currentIdentity) return;
      }
      const slots = (result[location] ??= Array.from(
        { length: LOCATION_SLOT_COUNTS[location] },
        () => null,
      ));
      slots[index] = token;
    });
  }
}

/** Retain armor without replacing the writer's existing equipment spelling. */
export function getMountedSourceArmorSuffix(
  state: UnitState,
  mount: IMountedEquipmentInstance,
  location: MechLocation,
  slot: number,
): string {
  const sourceToken = getCriticalSlotsForLocation(
    state.bvContext?.source.criticalSlots,
    location,
  )?.[slot];
  if (!sourceToken || !parseCriticalSlotToken(sourceToken).isArmored) return '';
  const original = state.bvContext?.equipment.find(
    (item) => item.instanceId === mount.instanceId,
  );
  if (
    !original ||
    !getSlotParts(original).some(
      (part) => part.location === location && part.slots.includes(slot),
    )
  )
    return '';
  const token = getMountedEquipmentSourceToken(
    mount,
    sourceToken,
    state.techBase,
    state.techBaseMode,
  );
  return token ? ' (ARMORED)' : '';
}
