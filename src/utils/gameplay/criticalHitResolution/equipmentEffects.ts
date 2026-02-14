import { CriticalEffectType, ICriticalEffect } from '@/types/gameplay';

import {
  CriticalHitEvent,
  IComponentDamageState,
  ICriticalSlotEntry,
} from './types';

export function applyWeaponHit(
  slot: ICriticalSlotEntry,
  _unitId: string,
  _location: string,
  componentDamage: IComponentDamageState,
  _events: CriticalHitEvent[],
): { effect: ICriticalEffect; updatedDamage: IComponentDamageState } {
  const weaponName = slot.weaponId ?? slot.componentName;
  const updatedDamage = {
    ...componentDamage,
    weaponsDestroyed: [...componentDamage.weaponsDestroyed, weaponName],
  };

  return {
    effect: {
      type: CriticalEffectType.WeaponDestroyed,
      equipmentDestroyed: slot.componentName,
      weaponDisabled: weaponName,
    },
    updatedDamage,
  };
}

export function applyHeatSinkHit(
  _unitId: string,
  _location: string,
  componentDamage: IComponentDamageState,
  _events: CriticalHitEvent[],
): { effect: ICriticalEffect; updatedDamage: IComponentDamageState } {
  const updatedDamage = {
    ...componentDamage,
    heatSinksDestroyed: componentDamage.heatSinksDestroyed + 1,
  };

  return {
    effect: {
      type: CriticalEffectType.HeatSinkDestroyed,
    },
    updatedDamage,
  };
}

export function applyJumpJetHit(
  _unitId: string,
  _location: string,
  componentDamage: IComponentDamageState,
  _events: CriticalHitEvent[],
): { effect: ICriticalEffect; updatedDamage: IComponentDamageState } {
  const updatedDamage = {
    ...componentDamage,
    jumpJetsDestroyed: componentDamage.jumpJetsDestroyed + 1,
  };

  return {
    effect: {
      type: CriticalEffectType.JumpJetDestroyed,
    },
    updatedDamage,
  };
}

export function applyAmmoHit(
  slot: ICriticalSlotEntry,
  _unitId: string,
  _location: string,
  componentDamage: IComponentDamageState,
  _events: CriticalHitEvent[],
): { effect: ICriticalEffect; updatedDamage: IComponentDamageState } {
  return {
    effect: {
      type: CriticalEffectType.AmmoExplosion,
      equipmentDestroyed: slot.componentName,
    },
    updatedDamage: componentDamage,
  };
}
