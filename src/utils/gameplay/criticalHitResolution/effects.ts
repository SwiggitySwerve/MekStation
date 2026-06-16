import { CriticalEffectType, ICriticalEffect } from '@/types/gameplay';

import {
  applyActuatorHit,
  getActuatorToHitModifier,
  actuatorPreventsAttack,
  actuatorHalvesDamage,
} from './actuatorEffects';
import { applyEngineHit, applyGyroHit, applyCockpitHit } from './engineEffects';
import {
  applyWeaponHit,
  applyHeatSinkHit,
  applyJumpJetHit,
  applyAmmoHit,
} from './equipmentEffects';
import { applySensorHit, applyLifeSupportHit } from './sensorEffects';
import {
  CriticalHitEvent,
  IComponentDamageState,
  ICriticalEffectOptions,
  ICriticalSlotEntry,
  ICriticalHitApplicationResult,
} from './types';

const SCM_CRITICAL_DISABLE_THRESHOLD = 6;
const PLAYTEST_3_OPTIONAL_RULE_KEYS = new Set([
  'playtest3',
  'playtest_3',
  'playtest-3',
  'tacopsplaytest3',
  'tacops_playtest_3',
  'tacops-playtest-3',
]);

export function applyCriticalHitEffect(
  slot: ICriticalSlotEntry,
  unitId: string,
  location: string,
  componentDamage: IComponentDamageState,
  options: ICriticalEffectOptions = {},
): ICriticalHitApplicationResult {
  const events: CriticalHitEvent[] = [];
  let updatedDamage = { ...componentDamage };

  let effect: ICriticalEffect;
  let destroyed = true;
  let slotDestroyed = true;
  let secondaryCriticals = 0;
  let emittedLinkedCriticalWeaponId: string | undefined;
  let emittedLinkedCriticalWeaponName: string | undefined;
  const equipmentExplosionDamage = representedEquipmentExplosionDamage(
    slot,
    options,
  );
  const hotLoadedExplosionDamage = representedHotLoadedWeaponExplosionDamage(
    slot,
    options,
  );
  const representedExplosionDamage =
    hotLoadedExplosionDamage ?? equipmentExplosionDamage;

  switch (slot.componentType) {
    case 'engine':
      ({ effect, updatedDamage } = applyEngineHit(
        unitId,
        location,
        updatedDamage,
        events,
      ));
      break;
    case 'gyro':
      ({ effect, updatedDamage } = applyGyroHit(
        unitId,
        location,
        updatedDamage,
        events,
      ));
      break;
    case 'cockpit':
      ({ effect, updatedDamage } = applyCockpitHit(
        unitId,
        location,
        updatedDamage,
        events,
      ));
      break;
    case 'sensor':
      ({ effect, updatedDamage } = applySensorHit(
        unitId,
        location,
        updatedDamage,
        events,
      ));
      break;
    case 'life_support':
      ({ effect, updatedDamage } = applyLifeSupportHit(
        unitId,
        location,
        updatedDamage,
        events,
      ));
      break;
    case 'actuator':
      ({ effect, updatedDamage } = applyActuatorHit(
        slot,
        unitId,
        location,
        updatedDamage,
        events,
      ));
      break;
    case 'weapon':
      if (isPlaytest3FirstAutocannonCritical(slot, updatedDamage, options)) {
        const autocannonKey = autocannonCriticalKey(slot);
        effect = {
          type: CriticalEffectType.EquipmentHit,
          equipmentHit: slot.componentName,
        };
        updatedDamage = {
          ...updatedDamage,
          playtestAutocannonFirstCrits: addUniqueString(
            updatedDamage.playtestAutocannonFirstCrits,
            autocannonKey,
          ),
        };
        destroyed = false;
        slotDestroyed = false;
      } else if (hotLoadedExplosionDamage !== undefined) {
        effect = {
          type: CriticalEffectType.AmmoExplosion,
          equipmentDestroyed: slot.componentName,
          additionalDamage: hotLoadedExplosionDamage,
        };
      } else {
        ({ effect, updatedDamage } = applyWeaponHit(
          slot,
          unitId,
          location,
          updatedDamage,
          events,
        ));
      }
      break;
    case 'heat_sink':
      ({ effect, updatedDamage } = applyHeatSinkHit(
        unitId,
        location,
        updatedDamage,
        events,
      ));
      break;
    case 'jump_jet':
      ({ effect, updatedDamage } = applyJumpJetHit(
        unitId,
        location,
        updatedDamage,
        events,
      ));
      break;
    case 'ammo':
      ({ effect, updatedDamage } = applyAmmoHit(
        slot,
        unitId,
        location,
        updatedDamage,
        events,
      ));
      break;
    default:
      if (isPlaytest3FirstAutocannonCritical(slot, updatedDamage, options)) {
        const autocannonKey = autocannonCriticalKey(slot);
        effect = {
          type: CriticalEffectType.EquipmentHit,
          equipmentHit: slot.componentName,
        };
        updatedDamage = {
          ...updatedDamage,
          playtestAutocannonFirstCrits: addUniqueString(
            updatedDamage.playtestAutocannonFirstCrits,
            autocannonKey,
          ),
        };
        destroyed = false;
        slotDestroyed = false;
      } else if (
        isShieldEquipment(slot) &&
        representedExplosionDamage === undefined
      ) {
        effect = {
          type: CriticalEffectType.EquipmentHit,
          equipmentHit: slot.componentName,
        };
        destroyed = false;
      } else if (isSuperCooledMyomerEquipment(slot)) {
        const superCooledMyomerHits =
          (updatedDamage.superCooledMyomerHits ?? 0) + 1;
        updatedDamage = {
          ...updatedDamage,
          superCooledMyomerHits,
        };
        if (superCooledMyomerHits >= SCM_CRITICAL_DISABLE_THRESHOLD) {
          effect = {
            type: CriticalEffectType.EquipmentDestroyed,
            equipmentDestroyed: slot.componentName,
          };
        } else {
          effect = {
            type: CriticalEffectType.EquipmentHit,
            equipmentHit: slot.componentName,
          };
          destroyed = false;
        }
      } else if (isEmergencyCoolantSystemEquipment(slot)) {
        updatedDamage = {
          ...updatedDamage,
          emergencyCoolantSystemDamaged: true,
        };
        if (representedExplosionDamage !== undefined) {
          effect = {
            type: CriticalEffectType.AmmoExplosion,
            equipmentDestroyed: slot.componentName,
            additionalDamage: representedExplosionDamage,
          };
        } else {
          effect = {
            type: CriticalEffectType.EquipmentDestroyed,
            equipmentDestroyed: slot.componentName,
          };
        }
      } else if (isHarJelEquipment(slot)) {
        updatedDamage = {
          ...updatedDamage,
          breachedLocations: addUniqueString(
            updatedDamage.breachedLocations,
            location,
          ),
        };
        effect = {
          type: CriticalEffectType.EquipmentDestroyed,
          equipmentDestroyed: slot.componentName,
        };
      } else if (isHarJelSecondaryCriticalEquipment(slot, options)) {
        secondaryCriticals = 1;
        effect = {
          type: CriticalEffectType.EquipmentDestroyed,
          equipmentDestroyed: slot.componentName,
        };
      } else if (isRiscLaserPulseModuleLinkedCritical(slot, updatedDamage)) {
        const linkedWeaponId = slot.linkedCriticalWeaponId;
        const linkedWeaponName =
          slot.linkedCriticalWeaponName ?? linkedWeaponId;
        emittedLinkedCriticalWeaponId = linkedWeaponId;
        emittedLinkedCriticalWeaponName = linkedWeaponName;
        updatedDamage = {
          ...updatedDamage,
          weaponsDestroyed: [...updatedDamage.weaponsDestroyed, linkedWeaponId],
        };
        effect = {
          type: CriticalEffectType.WeaponDestroyed,
          equipmentDestroyed: linkedWeaponName,
          weaponDisabled: linkedWeaponId,
        };
      } else if (representedExplosionDamage !== undefined) {
        effect = {
          type: CriticalEffectType.AmmoExplosion,
          equipmentDestroyed: slot.componentName,
          additionalDamage: representedExplosionDamage,
        };
      } else {
        effect = {
          type: CriticalEffectType.EquipmentDestroyed,
          equipmentDestroyed: slot.componentName,
        };
      }
      break;
  }

  if (
    emittedLinkedCriticalWeaponId === undefined &&
    isArtemisFcsCriticalSlot(slot)
  ) {
    emittedLinkedCriticalWeaponId = slot.linkedCriticalWeaponId;
    emittedLinkedCriticalWeaponName = slot.linkedCriticalWeaponName;
  }

  events.unshift({
    type: 'critical_hit_resolved',
    payload: {
      unitId,
      location,
      slotIndex: slot.slotIndex,
      componentType: slot.componentType,
      componentName: slot.componentName,
      ...(slot.weaponId !== undefined ? { weaponId: slot.weaponId } : {}),
      ...(slot.ammoBinId !== undefined ? { ammoBinId: slot.ammoBinId } : {}),
      ...(slot.hotLoaded === true ? { hotLoaded: true } : {}),
      ...(emittedLinkedCriticalWeaponId !== undefined
        ? { linkedCriticalWeaponId: emittedLinkedCriticalWeaponId }
        : {}),
      ...(emittedLinkedCriticalWeaponName !== undefined
        ? { linkedCriticalWeaponName: emittedLinkedCriticalWeaponName }
        : {}),
      ...(representedExplosionDamage !== undefined
        ? { explosionDamage: representedExplosionDamage }
        : {}),
      effect: describeEffect(effect),
      destroyed,
      ...(isHarJelEquipment(slot) ? { breached: true } : {}),
    },
  });

  return {
    slot,
    effect,
    events,
    updatedComponentDamage: updatedDamage,
    slotDestroyed,
    ...(secondaryCriticals > 0 ? { secondaryCriticals } : {}),
  };
}

function hasPlaytest3Rule(
  optionalRules: readonly string[] | undefined,
): boolean {
  return (
    optionalRules?.some((rule) => {
      const normalized = rule.toLowerCase().replace(/[^a-z0-9_ -]+/g, '');
      const compact = normalized.replace(/[^a-z0-9]+/g, '');
      return (
        PLAYTEST_3_OPTIONAL_RULE_KEYS.has(normalized) ||
        PLAYTEST_3_OPTIONAL_RULE_KEYS.has(compact)
      );
    }) ?? false
  );
}

function addUniqueString(
  values: readonly string[] | undefined,
  value: string,
): readonly string[] {
  return values?.includes(value) ? values : [...(values ?? []), value];
}

function autocannonCriticalKey(slot: ICriticalSlotEntry): string {
  return slot.weaponId ?? slot.componentName;
}

function isPlaytest3FirstAutocannonCritical(
  slot: ICriticalSlotEntry,
  componentDamage: IComponentDamageState,
  options: ICriticalEffectOptions,
): boolean {
  const key = autocannonCriticalKey(slot);
  return (
    hasPlaytest3Rule(options.optionalRules) &&
    isAutocannonCriticalSlot(slot) &&
    !(componentDamage.playtestAutocannonFirstCrits ?? []).includes(key)
  );
}

function isAutocannonCriticalSlot(slot: ICriticalSlotEntry): boolean {
  if (slot.componentType !== 'weapon' && slot.componentType !== 'equipment') {
    return false;
  }

  const text = `${slot.weaponId ?? ''} ${slot.componentName}`.toLowerCase();
  return (
    /\b(?:uac|rac|ac)\s*\/?\s*\d+\b/.test(text) ||
    /\b(?:ultra|rotary)\s+ac\s*\/?\s*\d+\b/.test(text) ||
    /\blb[\s-]?\d+[\s-]?x\s*ac\b/.test(text) ||
    /\blb[\s-]?x\s*ac\s*\/?\s*\d+\b/.test(text) ||
    /\bhvac\s*\/?\s*\d+\b/.test(text) ||
    /\bhyper[-\s]?velocity\s+auto\s*cannon\s*\/?\s*\d+\b/.test(text) ||
    /\bauto\s*cannon\s*\/?\s*\d+\b/.test(text) ||
    /\bautocannon\s*\/?\s*\d+\b/.test(text)
  );
}

function isShieldEquipment(slot: ICriticalSlotEntry): boolean {
  return (
    slot.componentType === 'equipment' && /\bshield\b/i.test(slot.componentName)
  );
}

function isEmergencyCoolantSystemEquipment(slot: ICriticalSlotEntry): boolean {
  if (slot.componentType !== 'equipment') {
    return false;
  }

  const normalized = slot.componentName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  return (
    normalized === 'emergencycoolantsystem' ||
    normalized.includes('emergencycoolant')
  );
}

function isSuperCooledMyomerEquipment(slot: ICriticalSlotEntry): boolean {
  if (slot.componentType !== 'equipment') {
    return false;
  }

  const normalized = slot.componentName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  return (
    normalized === 'scm' ||
    normalized === 'supercooledmyomer' ||
    normalized.includes('supercooledmyomer')
  );
}

function isHarJelEquipment(slot: ICriticalSlotEntry): boolean {
  if (slot.componentType !== 'equipment') {
    return false;
  }

  return normalizeEquipmentName(slot.componentName) === 'harjel';
}

function isHarJelSecondaryCriticalEquipment(
  slot: ICriticalSlotEntry,
  options: ICriticalEffectOptions,
): boolean {
  if (slot.componentType !== 'equipment') {
    return false;
  }

  const normalized = normalizeEquipmentName(slot.componentName);
  return (
    options.secondaryEffects !== false &&
    (normalized === 'harjelii' || normalized === 'harjeliii')
  );
}

function isRiscLaserPulseModuleLinkedCritical(
  slot: ICriticalSlotEntry,
  componentDamage: IComponentDamageState,
): slot is ICriticalSlotEntry & { readonly linkedCriticalWeaponId: string } {
  return (
    slot.componentType === 'equipment' &&
    normalizeEquipmentName(slot.componentName) === 'risclaserpulsemodule' &&
    slot.linkedCriticalWeaponId !== undefined &&
    !componentDamage.weaponsDestroyed.includes(slot.linkedCriticalWeaponId)
  );
}

function isArtemisFcsCriticalSlot(
  slot: ICriticalSlotEntry,
): slot is ICriticalSlotEntry & { readonly linkedCriticalWeaponId: string } {
  if (
    slot.componentType !== 'equipment' ||
    slot.linkedCriticalWeaponId === undefined
  ) {
    return false;
  }

  const normalized = normalizeEquipmentName(slot.componentName);
  return (
    normalized.includes('artemisiv') ||
    normalized.includes('prototypeartemisiv') ||
    normalized.includes('protoartemisiv') ||
    normalized.includes('artemisv')
  );
}

function representedEquipmentExplosionDamage(
  slot: ICriticalSlotEntry,
  options: ICriticalEffectOptions,
): number | undefined {
  if (
    slot.componentType !== 'equipment' ||
    slot.explosionDamage === undefined ||
    slot.explosionDamage <= 0
  ) {
    return undefined;
  }

  if (
    slot.explosionRequiresSecondaryEffects === true &&
    options.secondaryEffects === false
  ) {
    return undefined;
  }

  return slot.explosionDamage;
}

function representedHotLoadedWeaponExplosionDamage(
  slot: ICriticalSlotEntry,
  options: ICriticalEffectOptions,
): number | undefined {
  if (
    slot.hotLoaded !== true ||
    (slot.componentType !== 'weapon' && slot.componentType !== 'equipment') ||
    slot.explosionDamage === undefined ||
    slot.explosionDamage <= 0
  ) {
    return undefined;
  }

  if (
    slot.explosionRequiresSecondaryEffects === true &&
    options.secondaryEffects === false
  ) {
    return undefined;
  }

  return slot.explosionDamage;
}

function normalizeEquipmentName(componentName: string): string {
  return componentName.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function describeEffect(effect: ICriticalEffect): string {
  switch (effect.type) {
    case CriticalEffectType.EngineHit:
      return 'Engine hit — +5 heat/turn';
    case CriticalEffectType.GyroHit:
      return 'Gyro hit — +3 PSR modifier';
    case CriticalEffectType.CockpitHit:
      return 'Cockpit hit — pilot killed';
    case CriticalEffectType.SensorHit:
      return 'Sensor hit — to-hit penalty';
    case CriticalEffectType.LifeSupportHit:
      return effect.lifeSupportDisabled
        ? 'Life support disabled — pilot heat damage at 15+/25+ heat'
        : 'Life support hit';
    case CriticalEffectType.ActuatorHit:
      return `Actuator destroyed: ${effect.equipmentDestroyed ?? 'unknown'}`;
    case CriticalEffectType.WeaponDestroyed:
      return `Weapon destroyed: ${effect.equipmentDestroyed ?? 'unknown'}`;
    case CriticalEffectType.HeatSinkDestroyed:
      return 'Heat sink destroyed — -1 dissipation';
    case CriticalEffectType.JumpJetDestroyed:
      return 'Jump jet destroyed — -1 jump MP';
    case CriticalEffectType.AmmoExplosion:
      if (effect.additionalDamage !== undefined) {
        return `Equipment explosion: ${
          effect.equipmentDestroyed ?? 'unknown'
        } (${effect.additionalDamage} damage)`;
      }
      return `Ammo hit: ${effect.equipmentDestroyed ?? 'unknown'}`;
    case CriticalEffectType.EquipmentDestroyed:
      return `Equipment destroyed: ${effect.equipmentDestroyed ?? 'unknown'}`;
    case CriticalEffectType.EquipmentHit:
      return `Equipment hit: ${effect.equipmentHit ?? 'unknown'}`;
    default:
      return 'Unknown critical effect';
  }
}

export {
  getActuatorToHitModifier,
  actuatorPreventsAttack,
  actuatorHalvesDamage,
} from './actuatorEffects';
