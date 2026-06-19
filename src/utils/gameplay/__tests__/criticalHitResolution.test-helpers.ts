/**
 * Critical Hit Resolution Tests
 * Comprehensive tests for all component types and critical hit mechanics.
 */

import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import { CriticalEffectType } from '@/types/gameplay';
import { IComponentDamageState } from '@/types/gameplay/GameSessionInterfaces';

import {
  rollCriticalHits,
  selectCriticalSlot,
  buildDefaultCriticalSlotManifest,
  buildCriticalSlotManifest,
  resolveCriticalHits,
  applyCriticalHitEffect,
  checkTACTrigger,
  processTAC,
  getActuatorToHitModifier,
  actuatorPreventsAttack,
  actuatorHalvesDamage,
  isHardenedArmor,
  isFerroLamellorArmor,
  halveCritCount,
  ICriticalSlotEntry,
  CriticalSlotManifest,
} from '../criticalHitResolution';

// =============================================================================
// Test Helpers
// =============================================================================

export const DEFAULT_COMPONENT_DAMAGE: IComponentDamageState = {
  engineHits: 0,
  gyroHits: 0,
  sensorHits: 0,
  lifeSupport: 0,
  cockpitHit: false,
  actuators: {},
  weaponsDestroyed: [],
  heatSinksDestroyed: 0,
  jumpJetsDestroyed: 0,
};

export function makeDiceRoller(values: number[]) {
  let idx = 0;
  return () => {
    const val = values[idx % values.length];
    idx++;
    return val;
  };
}

export function makeManifestWithWeapons(): CriticalSlotManifest {
  const base = buildDefaultCriticalSlotManifest();
  return {
    ...base,
    right_torso: [
      ...base.right_torso,
      {
        slotIndex: 3,
        componentType: 'weapon',
        componentName: 'Medium Laser',
        destroyed: false,
        weaponId: 'weapon-ml-1',
      },
      {
        slotIndex: 4,
        componentType: 'heat_sink',
        componentName: 'Heat Sink',
        destroyed: false,
      },
      {
        slotIndex: 5,
        componentType: 'jump_jet',
        componentName: 'Jump Jet',
        destroyed: false,
      },
      {
        slotIndex: 6,
        componentType: 'ammo',
        componentName: 'AC/5 Ammo',
        destroyed: false,
      },
      {
        slotIndex: 7,
        componentType: 'equipment',
        componentName: 'CASE',
        destroyed: false,
      },
    ],
  };
}

// =============================================================================
// rollCriticalHits
// =============================================================================

export { ArmorTypeEnum } from '@/types/construction/ArmorType';
export { ActuatorType } from '@/types/construction/MechConfigurationSystem';
export { CriticalEffectType } from '@/types/gameplay';
export type { IComponentDamageState } from '@/types/gameplay/GameSessionInterfaces';
export {
  rollCriticalHits,
  selectCriticalSlot,
  buildDefaultCriticalSlotManifest,
  buildCriticalSlotManifest,
  resolveCriticalHits,
  applyCriticalHitEffect,
  checkTACTrigger,
  processTAC,
  getActuatorToHitModifier,
  actuatorPreventsAttack,
  actuatorHalvesDamage,
  isHardenedArmor,
  isFerroLamellorArmor,
  halveCritCount,
} from '../criticalHitResolution';
export type {
  ICriticalSlotEntry,
  CriticalSlotManifest,
} from '../criticalHitResolution';
