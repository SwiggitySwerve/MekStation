import { ArmorTypeEnum } from '@/types/construction/ArmorType';

import { D6Roller } from '../hitLocation';
import { halveCritCount, isFerroLamellorArmor, isHardenedArmor } from './armor';
import { LETHAL_PILOT_WOUNDS } from './constants';
import { applyCriticalHitEffect } from './effects';
import { normalizeLocation } from './manifest';
import { rollCriticalHits, selectCriticalSlot } from './selection';
import {
  CriticalSlotManifest,
  CriticalHitEvent,
  CombatLocation,
  ICriticalHitApplicationResult,
  ICriticalResolutionResult,
  IComponentDamageState,
} from './types';

export function resolveCriticalHits(
  unitId: string,
  location: CombatLocation,
  manifest: CriticalSlotManifest,
  componentDamage: IComponentDamageState,
  diceRoller: D6Roller,
  forceCrits?: number,
  armorType?: ArmorTypeEnum,
): ICriticalResolutionResult {
  let critCount: number;
  let limbBlownOff = false;
  let headDestroyed = false;

  if (forceCrits !== undefined) {
    critCount = forceCrits;
  } else if (isHardenedArmor(armorType)) {
    const roll1 = rollCriticalHits(location, diceRoller);
    const roll2 = rollCriticalHits(location, diceRoller);

    if (roll1.criticalHits === 0 || roll2.criticalHits === 0) {
      critCount = 0;
    } else {
      critCount = Math.min(roll1.criticalHits, roll2.criticalHits);
    }

    limbBlownOff = roll1.limbBlownOff && roll2.limbBlownOff;
    headDestroyed = roll1.headDestroyed && roll2.headDestroyed;
  } else {
    const determination = rollCriticalHits(location, diceRoller);
    critCount = determination.criticalHits;
    limbBlownOff = determination.limbBlownOff;
    headDestroyed = determination.headDestroyed;

    if (isFerroLamellorArmor(armorType) && critCount > 0) {
      critCount = halveCritCount(critCount);
    }
  }

  const allEvents: CriticalHitEvent[] = [];
  const hits: ICriticalHitApplicationResult[] = [];
  let currentDamage = componentDamage;
  let currentManifest = { ...manifest };
  let unitDestroyed = false;
  let destructionCause: 'engine_destroyed' | 'pilot_death' | undefined;

  if (limbBlownOff) {
    const normalizedLoc = normalizeLocation(location);
    const slots = currentManifest[normalizedLoc] ?? [];

    currentManifest = {
      ...currentManifest,
      [normalizedLoc]: slots.map((slot) => ({ ...slot, destroyed: true })),
    };

    for (const slot of slots.filter((s) => !s.destroyed)) {
      const result = applyCriticalHitEffect(
        slot,
        unitId,
        location,
        currentDamage,
      );
      hits.push(result);
      allEvents.push(...result.events);
      currentDamage = result.updatedComponentDamage;

      if (
        result.events.some(
          (event) =>
            event.type === 'unit_destroyed' && event.payload.cause === 'damage',
        )
      ) {
        unitDestroyed = true;
        destructionCause = 'engine_destroyed';
      }
      if (
        result.events.some(
          (event) =>
            event.type === 'unit_destroyed' &&
            event.payload.cause === 'pilot_death',
        )
      ) {
        unitDestroyed = true;
        destructionCause = 'pilot_death';
      }
    }

    return {
      hits,
      events: allEvents,
      updatedManifest: currentManifest,
      updatedComponentDamage: currentDamage,
      locationBlownOff: true,
      headDestroyed: false,
      unitDestroyed,
      destructionCause,
    };
  }

  if (headDestroyed) {
    allEvents.push({
      type: 'pilot_hit',
      payload: {
        unitId,
        wounds: LETHAL_PILOT_WOUNDS,
        totalWounds: LETHAL_PILOT_WOUNDS,
        source: 'head_hit',
        consciousnessCheckRequired: false,
      },
    });
    allEvents.push({
      type: 'unit_destroyed',
      payload: {
        unitId,
        cause: 'pilot_death',
      },
    });

    const normalizedLoc = normalizeLocation(location);
    const slots = currentManifest[normalizedLoc] ?? [];
    currentManifest = {
      ...currentManifest,
      [normalizedLoc]: slots.map((slot) => ({ ...slot, destroyed: true })),
    };

    return {
      hits: [],
      events: allEvents,
      updatedManifest: currentManifest,
      updatedComponentDamage: currentDamage,
      locationBlownOff: false,
      headDestroyed: true,
      unitDestroyed: true,
      destructionCause: 'pilot_death',
    };
  }

  for (let i = 0; i < critCount; i++) {
    const slot = selectCriticalSlot(currentManifest, location, diceRoller);
    if (!slot) break;

    const normalizedLoc = normalizeLocation(location);
    const slots = currentManifest[normalizedLoc] ?? [];
    currentManifest = {
      ...currentManifest,
      [normalizedLoc]: slots.map((s) =>
        s.slotIndex === slot.slotIndex ? { ...s, destroyed: true } : s,
      ),
    };

    const result = applyCriticalHitEffect(
      slot,
      unitId,
      location,
      currentDamage,
    );
    hits.push(result);
    allEvents.push(...result.events);
    currentDamage = result.updatedComponentDamage;

    if (
      result.events.some(
        (event) =>
          event.type === 'unit_destroyed' && event.payload.cause === 'damage',
      )
    ) {
      unitDestroyed = true;
      destructionCause = 'engine_destroyed';
    }
    if (
      result.events.some(
        (event) =>
          event.type === 'unit_destroyed' &&
          event.payload.cause === 'pilot_death',
      )
    ) {
      unitDestroyed = true;
      destructionCause = 'pilot_death';
    }
  }

  return {
    hits,
    events: allEvents,
    updatedManifest: currentManifest,
    updatedComponentDamage: currentDamage,
    locationBlownOff: false,
    headDestroyed: false,
    unitDestroyed,
    destructionCause,
  };
}

export function checkTACTrigger(
  hitLocationRoll: number,
  firingArc: 'front' | 'rear' | 'left' | 'right',
): CombatLocation | null {
  if (hitLocationRoll !== 2) return null;

  switch (firingArc) {
    case 'front':
    case 'rear':
      return 'center_torso';
    case 'left':
      return 'left_torso';
    case 'right':
      return 'right_torso';
  }
}

export function processTAC(
  unitId: string,
  tacLocation: CombatLocation,
  manifest: CriticalSlotManifest,
  componentDamage: IComponentDamageState,
  diceRoller: D6Roller,
  armorType?: ArmorTypeEnum,
): ICriticalResolutionResult {
  if (isHardenedArmor(armorType)) {
    return {
      hits: [],
      events: [],
      updatedManifest: manifest,
      updatedComponentDamage: componentDamage,
      locationBlownOff: false,
      headDestroyed: false,
      unitDestroyed: false,
    };
  }

  return resolveCriticalHits(
    unitId,
    tacLocation,
    manifest,
    componentDamage,
    diceRoller,
  );
}
