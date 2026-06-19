import type { IFullUnit } from '@/services/units/CanonicalUnitService';
import type {
  CriticalSlotManifest,
  ICriticalSlotEntry,
} from '@/utils/gameplay/criticalHitResolution';

import { buildCriticalSlotManifest } from '@/utils/gameplay/criticalHitResolution';

import type { IWeapon } from '../ai/types';
import type { AmmoLookup, IUnitEquipmentEntry } from './UnitHydrationTypes';

import {
  ammoBinIdForCriticalSlot,
  ammoStatsForCriticalSlot,
  defaultCatalogAmmoLookup,
} from './UnitHydrationAmmo';
import { classifyCriticalSlotComponent } from './UnitHydrationCriticalSlotClassification';
import {
  criticalSlotsFromFullUnit,
  equipmentEntriesFromFullUnit,
} from './UnitHydrationEquipment';
import { runnerCriticalLocationFromCatalogLocation } from './UnitHydrationLocations';
import { stripCriticalSlotRearMarker } from './UnitHydrationText';

const CRITICAL_SLOT_LOCATION_COUNTS: Readonly<Record<string, number>> = {
  head: 6,
  center_torso: 12,
  left_torso: 12,
  right_torso: 12,
  left_arm: 12,
  right_arm: 12,
  left_leg: 6,
  right_leg: 6,
};

function criticalSlotEntryFromText(
  slotText: string,
  slotIndex: number,
  sourceLocation: string,
  aiWeapons: readonly IWeapon[],
  ammoLookup: AmmoLookup,
  equipmentEntries: readonly IUnitEquipmentEntry[] = [],
): ICriticalSlotEntry {
  const classification = classifyCriticalSlotComponent(
    slotText,
    sourceLocation,
    aiWeapons,
    equipmentEntries,
  );
  const ammo =
    classification.componentType === 'ammo'
      ? ammoStatsForCriticalSlot(slotText, ammoLookup)
      : null;
  const ammoBinId =
    ammo !== null
      ? ammoBinIdForCriticalSlot(sourceLocation, slotIndex, ammo.id)
      : undefined;

  return {
    slotIndex,
    componentType: classification.componentType,
    componentName: stripCriticalSlotRearMarker(slotText),
    destroyed: false,
    ...(classification.actuatorType !== undefined
      ? { actuatorType: classification.actuatorType }
      : {}),
    ...(classification.weaponId !== undefined
      ? { weaponId: classification.weaponId }
      : {}),
    ...(classification.linkedCriticalWeaponId !== undefined
      ? { linkedCriticalWeaponId: classification.linkedCriticalWeaponId }
      : {}),
    ...(classification.linkedCriticalWeaponName !== undefined
      ? { linkedCriticalWeaponName: classification.linkedCriticalWeaponName }
      : {}),
    ...(classification.hotLoaded !== undefined
      ? { hotLoaded: classification.hotLoaded }
      : {}),
    ...(ammoBinId !== undefined ? { ammoBinId } : {}),
    ...(classification.explosionDamage !== undefined
      ? { explosionDamage: classification.explosionDamage }
      : {}),
    ...(classification.explosionRequiresSecondaryEffects !== undefined
      ? {
          explosionRequiresSecondaryEffects:
            classification.explosionRequiresSecondaryEffects,
        }
      : {}),
  };
}

function mergeCriticalSlotEntries(
  baseEntries: readonly ICriticalSlotEntry[],
  sourceEntries: readonly ICriticalSlotEntry[],
): readonly ICriticalSlotEntry[] {
  const bySlotIndex = new Map<number, ICriticalSlotEntry>();
  for (const entry of baseEntries) {
    bySlotIndex.set(entry.slotIndex, entry);
  }
  for (const entry of sourceEntries) {
    bySlotIndex.set(entry.slotIndex, entry);
  }
  return Array.from(bySlotIndex.values()).sort(
    (a, b) => a.slotIndex - b.slotIndex,
  );
}

export function hydrateCriticalSlotManifestFromFullUnit(
  fullUnit: IFullUnit,
  aiWeapons: readonly IWeapon[] = [],
  ammoLookup: AmmoLookup = defaultCatalogAmmoLookup(),
): CriticalSlotManifest | undefined {
  const criticalSlots = criticalSlotsFromFullUnit(fullUnit);
  const equipmentEntries = equipmentEntriesFromFullUnit(fullUnit);
  const baseManifest = buildCriticalSlotManifest();
  const customSlots: Record<string, readonly ICriticalSlotEntry[]> = {};

  for (const [sourceLocation, sourceSlots] of Object.entries(criticalSlots)) {
    const runnerLocation =
      runnerCriticalLocationFromCatalogLocation(sourceLocation);
    if (runnerLocation === undefined) continue;

    const sourceEntries = sourceSlots
      .map((slotText, slotIndex) =>
        typeof slotText === 'string'
          ? criticalSlotEntryFromText(
              slotText,
              slotIndex,
              sourceLocation,
              aiWeapons,
              ammoLookup,
              equipmentEntries,
            )
          : null,
      )
      .filter((entry): entry is ICriticalSlotEntry => entry !== null);
    if (sourceEntries.length === 0) continue;

    const sourceLooksComplete =
      sourceSlots.length >=
      (CRITICAL_SLOT_LOCATION_COUNTS[runnerLocation] ?? 0);
    customSlots[runnerLocation] = sourceLooksComplete
      ? sourceEntries
      : mergeCriticalSlotEntries(
          baseManifest[runnerLocation] ?? [],
          sourceEntries,
        );
  }

  return Object.keys(customSlots).length > 0
    ? buildCriticalSlotManifest(customSlots)
    : undefined;
}
