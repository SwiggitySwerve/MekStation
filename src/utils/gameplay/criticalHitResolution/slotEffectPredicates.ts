import {
  IComponentDamageState,
  ICriticalEffectOptions,
  ICriticalSlotEntry,
} from './types';

const PLAYTEST_3_OPTIONAL_RULE_KEYS = new Set([
  'playtest3',
  'playtest_3',
  'playtest-3',
  'tacopsplaytest3',
  'tacops_playtest_3',
  'tacops-playtest-3',
]);

export function addUniqueString(
  values: readonly string[] | undefined,
  value: string,
): readonly string[] {
  return values?.includes(value) ? values : [...(values ?? []), value];
}

export function isPlaytest3FirstAutocannonCritical(
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

export function autocannonCriticalKey(slot: ICriticalSlotEntry): string {
  return slot.weaponId ?? slot.componentName;
}

export function isShieldEquipment(slot: ICriticalSlotEntry): boolean {
  return (
    slot.componentType === 'equipment' && /\bshield\b/i.test(slot.componentName)
  );
}

export function isEmergencyCoolantSystemEquipment(
  slot: ICriticalSlotEntry,
): boolean {
  if (slot.componentType !== 'equipment') {
    return false;
  }

  const normalized = normalizeEquipmentName(slot.componentName);
  return (
    normalized === 'emergencycoolantsystem' ||
    normalized.includes('emergencycoolant')
  );
}

export function isSuperCooledMyomerEquipment(
  slot: ICriticalSlotEntry,
): boolean {
  if (slot.componentType !== 'equipment') {
    return false;
  }

  const normalized = normalizeEquipmentName(slot.componentName);
  return (
    normalized === 'scm' ||
    normalized === 'supercooledmyomer' ||
    normalized.includes('supercooledmyomer')
  );
}

export function isHarJelEquipment(slot: ICriticalSlotEntry): boolean {
  if (slot.componentType !== 'equipment') {
    return false;
  }

  return normalizeEquipmentName(slot.componentName) === 'harjel';
}

export function isHarJelSecondaryCriticalEquipment(
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

export function isRiscLaserPulseModuleLinkedCritical(
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

export function isArtemisFcsCriticalSlot(
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

export function representedEquipmentExplosionDamage(
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

export function representedHotLoadedWeaponExplosionDamage(
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

function normalizeEquipmentName(componentName: string): string {
  return componentName.toLowerCase().replace(/[^a-z0-9]+/g, '');
}
