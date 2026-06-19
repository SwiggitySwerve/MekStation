import type {
  IArtemisFcsKind,
  ICriticalHitResolvedPayload,
} from '@/types/gameplay';

export function normalizeEquipmentText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function isRiscLaserPulseModuleLinkedCritical(
  payload: ICriticalHitResolvedPayload,
): payload is ICriticalHitResolvedPayload & {
  readonly linkedCriticalWeaponId: string;
} {
  return (
    payload.destroyed === true &&
    normalizeEquipmentText(payload.componentName) === 'risclaserpulsemodule' &&
    typeof payload.linkedCriticalWeaponId === 'string' &&
    payload.linkedCriticalWeaponId.length > 0
  );
}

export function isAutocannonCriticalComponent(
  payload: ICriticalHitResolvedPayload,
): boolean {
  const text =
    `${payload.weaponId ?? ''} ${payload.componentName}`.toLowerCase();
  return (
    /\b(?:uac|rac|ac)\s*\/?\s*\d+\b/.test(text) ||
    /\b(?:ultra|rotary)\s+ac\s*\/?\s*\d+\b/.test(text) ||
    /\blb[\s-]?\d+[\s-]?x\s*ac\b/.test(text) ||
    /\blb[\s-]?x\s*ac\s*\/?\s*\d+\b/.test(text) ||
    /\bauto\s*cannon\s*\/?\s*\d+\b/.test(text) ||
    /\bautocannon\s*\/?\s*\d+\b/.test(text)
  );
}

export function artemisFcsKindForComponent(
  componentName: string,
): IArtemisFcsKind | undefined {
  const normalized = normalizeEquipmentText(componentName);
  if (normalized.includes('ammo') || normalized.includes('capable')) {
    return undefined;
  }

  if (normalized.includes('prototypeartemisiv')) {
    return 'prototype_artemis_iv';
  }
  if (
    normalized.includes('artemisivproto') ||
    normalized.includes('protoartemisiv')
  ) {
    return 'prototype_artemis_iv';
  }
  if (normalized.includes('artemisv')) {
    return 'artemis_v';
  }
  if (normalized.includes('artemisiv')) {
    return 'artemis_iv';
  }

  return undefined;
}

export function isSuperCooledMyomerCriticalComponent(
  componentName: string,
): boolean {
  const normalized = normalizeEquipmentText(componentName);
  return (
    normalized === 'scm' ||
    normalized === 'supercooledmyomer' ||
    normalized.includes('supercooledmyomer')
  );
}

export function isEmergencyCoolantSystemCriticalComponent(
  componentName: string,
): boolean {
  const normalized = normalizeEquipmentText(componentName);
  return (
    normalized === 'emergencycoolantsystem' ||
    normalized.includes('emergencycoolant')
  );
}

export function isHarJelCriticalComponent(
  payload: ICriticalHitResolvedPayload,
): boolean {
  return (
    payload.componentType === 'equipment' &&
    payload.breached === true &&
    normalizeEquipmentText(payload.componentName) === 'harjel'
  );
}

export function isECMCriticalComponent(componentName: string): boolean {
  const normalized = normalizeEquipmentText(componentName);
  return normalized.includes('ecm') || normalized.includes('cews');
}

export function isGenericECMCriticalComponent(component: string): boolean {
  return (
    component === 'ecm' ||
    component === 'ecmsuite' ||
    component === 'cews' ||
    component === 'cewssuite'
  );
}

export function isActiveProbeCriticalComponent(componentName: string): boolean {
  const normalized = normalizeEquipmentText(componentName);
  return (
    normalized.includes('activeprobe') ||
    normalized.includes('beagle') ||
    normalized.includes('bloodhound') ||
    normalized.includes('bap') ||
    normalized.includes('cews')
  );
}

export function isGenericActiveProbeCriticalComponent(
  component: string,
): boolean {
  return (
    component === 'probe' ||
    component === 'activeprobe' ||
    component === 'bap' ||
    component === 'cews' ||
    component === 'cewssuite'
  );
}
