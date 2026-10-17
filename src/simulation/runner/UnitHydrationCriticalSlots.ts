import type { IFullUnit } from '@/services/units/CanonicalUnitService';
import type {
  CriticalSlotManifest,
  ICriticalSlotEntry,
} from '@/utils/gameplay/criticalHitResolution';

import {
  mapEngineType,
  mapGyroType,
} from '@/services/units/unitLoaderService/componentMappers';
import { parseTechBase } from '@/types/enums/TechBase';
import { buildCriticalSlotManifest } from '@/utils/gameplay/criticalHitResolution';
import { buildStructuralCriticalSlotManifest } from '@/utils/gameplay/criticalHitResolution/manifest';

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

/** Engine-aware base for a BattleMech with a known engine (else legacy). */
function structuralBaseFromFullUnit(
  fullUnit: IFullUnit,
): CriticalSlotManifest | undefined {
  const raw = fullUnit as {
    engine?: { type?: unknown };
    gyro?: { type?: unknown };
    techBase?: unknown;
    unitType?: unknown;
  };
  const unitType = typeof raw.unitType === 'string' ? raw.unitType : '';
  const engine = raw.engine?.type;
  if (/proto/i.test(unitType) || (unitType && !/mech/i.test(unitType))) {
    return undefined;
  }
  if (typeof engine !== 'string' || !engine) return undefined;
  const techBase = typeof raw.techBase === 'string' ? raw.techBase : '';
  const gyro = raw.gyro?.type;
  return buildStructuralCriticalSlotManifest({
    engineType: mapEngineType(engine, parseTechBase(techBase)),
    ...(typeof gyro === 'string' ? { gyroType: mapGyroType(gyro) } : {}),
  });
}

/**
 * Canonical layouts list every fixed slot and stay authoritative. Saved custom
 * units persist only player-placed equipment, so a layout naming no engine
 * slot is laid over the engine-aware base, not the XL-shaped legacy default
 * (L0-06: Standard Fusion custom mechs took side-torso engine crits).
 *
 * @spec openspec/specs/critical-slot-allocation/spec.md (Side Torso Engine Slots)
 */
export function hydrateCriticalSlotManifestFromFullUnit(
  fullUnit: IFullUnit,
  aiWeapons: readonly IWeapon[] = [],
  ammoLookup: AmmoLookup = defaultCatalogAmmoLookup(),
): CriticalSlotManifest | undefined {
  const criticalSlots = criticalSlotsFromFullUnit(fullUnit);
  const equipmentEntries = equipmentEntriesFromFullUnit(fullUnit);
  const structuralBase = structuralBaseFromFullUnit(fullUnit);
  const baseManifest = structuralBase ?? buildCriticalSlotManifest();
  const customSlots: Record<string, readonly ICriticalSlotEntry[]> = {};
  const sourceEntriesByLocation: Record<string, readonly ICriticalSlotEntry[]> =
    {};

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
    sourceEntriesByLocation[runnerLocation] = sourceEntries;

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

  const layoutOmitsFixedSystems =
    structuralBase !== undefined &&
    !Object.values(sourceEntriesByLocation).some((entries) =>
      entries.some((entry) => entry.componentType === 'engine'),
    );
  if (layoutOmitsFixedSystems) {
    for (const [location, entries] of Object.entries(sourceEntriesByLocation)) {
      customSlots[location] = mergeCriticalSlotEntries(
        baseManifest[location] ?? [],
        entries,
      );
    }
  }

  return Object.keys(customSlots).length > 0
    ? buildCriticalSlotManifest(customSlots, baseManifest)
    : undefined;
}
