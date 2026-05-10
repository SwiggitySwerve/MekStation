import {
  GameEventType,
  type AttackVisualCategory,
  type IGameEvent,
} from '@/types/gameplay';

import {
  firstPositiveInteger,
  isBallisticKey,
  isEnergyKey,
  isErKey,
  isLaserKey,
  isMissileKey,
  isPhysicalKey,
  isPulseKey,
  isRotaryKey,
  isUltraKey,
  missileTubeCount,
  payloadHasVisualSubtype,
  physicalMetadata,
} from './weaponEffectClassifiers';
import {
  ATTACK_EFFECT_COLORS,
  ATTACK_EFFECT_DURATIONS_MS,
  WEAPON_EFFECT_FALLBACK_CASES,
  attackImpactDelayMs,
  attackMaxProjectileStaggerMs,
  type AttackEffectPrimitiveKind,
  type AttackEffectMetadataSource,
  type AttackEffectPayloadHints,
  type AttackWeaponEffectPayload,
  type PhysicalAttackEffectPayload,
  type WeaponEffectDescriptor,
} from './weaponEffectDescriptors';

export {
  ATTACK_EFFECT_COLORS,
  ATTACK_EFFECT_DURATIONS_MS,
  WEAPON_EFFECT_FALLBACK_CASES,
  attackImpactDelayMs,
  attackMaxProjectileStaggerMs,
};
export type {
  AttackEffectMetadataSource,
  AttackEffectPayloadHints,
  AttackEffectPrimitiveKind,
  AttackWeaponEffectPayload,
  PhysicalAttackEffectPayload,
  WeaponEffectDescriptor,
} from './weaponEffectDescriptors';

export function resolveWeaponEffect(
  payload: AttackWeaponEffectPayload,
): WeaponEffectDescriptor {
  const fallbackKey = fallbackWeaponKey(payload);
  const subtype = normalizeWeaponKey(payload.visualSubtype ?? fallbackKey);
  const explicitCategory = normalizeCategory(
    payload.visualCategory ?? payload.weaponCategory ?? payload.category,
  );
  const category = explicitCategory ?? categoryFromWeaponKey(fallbackKey);
  const projectileResult = projectileCountFor(payload, subtype, category);
  const staggerResult = staggerMsFor(
    payload,
    subtype,
    category,
    projectileResult.value,
  );
  const colorResult = colorFor(payload, subtype, category);

  return buildDescriptor({
    category,
    subtype,
    color: colorResult.value,
    projectileCount: projectileResult.value,
    staggerMs: staggerResult.value,
    metadataSource: {
      category: explicitCategory ? 'event' : 'fallback',
      color: colorResult.source,
      projectiles: projectileResult.source,
      stagger: staggerResult.source,
    },
  });
}

export function resolvePhysicalAttackEffect(
  payload: PhysicalAttackEffectPayload,
): WeaponEffectDescriptor {
  const subtype = normalizeWeaponKey(
    payload.visualSubtype ??
      payload.weaponName ??
      payload.weaponType ??
      payload.attackType,
  );
  const explicitCategory = normalizeCategory(
    payload.visualCategory ?? payload.weaponCategory ?? payload.category,
  );
  const category = explicitCategory ?? 'physical';
  const projectileResult = projectileCountFor(payload, subtype, category);
  const staggerResult = staggerMsFor(
    payload,
    subtype,
    category,
    projectileResult.value,
  );
  const colorResult = colorFor(payload, subtype, category);

  return buildDescriptor({
    category,
    subtype,
    color: colorResult.value,
    projectileCount: projectileResult.value,
    staggerMs: staggerResult.value,
    metadataSource: {
      category: explicitCategory ? 'event' : 'fallback',
      color: colorResult.source,
      projectiles: projectileResult.source,
      stagger: staggerResult.source,
    },
  });
}

export function resolveAttackEventEffect(
  event: IGameEvent,
): WeaponEffectDescriptor | null {
  if (event.type === GameEventType.AttackResolved) {
    return resolveWeaponEffect(event.payload as AttackWeaponEffectPayload);
  }

  if (event.type === GameEventType.PhysicalAttackResolved) {
    return resolvePhysicalAttackEffect(
      event.payload as PhysicalAttackEffectPayload,
    );
  }

  return null;
}

export function normalizeWeaponKey(value: string | undefined): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .replace(/\s*\((?:r|rear|clan|is|omnipod)\)\s*/g, ' ')
    .replace(/\//g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function buildDescriptor(params: {
  readonly category: AttackVisualCategory;
  readonly subtype: string;
  readonly color: string;
  readonly projectileCount: number;
  readonly staggerMs: number;
  readonly metadataSource: WeaponEffectDescriptor['metadataSource'];
}): WeaponEffectDescriptor {
  const physical = physicalMetadata(params.subtype);
  const primitive = primitiveForCategory(params.category);
  return {
    category: params.category,
    primitive,
    visualSubtype: params.subtype || params.category,
    color: params.color,
    impactColor:
      params.category === 'physical'
        ? ATTACK_EFFECT_COLORS.physicalImpactRed
        : ATTACK_EFFECT_COLORS.impactWhite,
    projectileCount: params.projectileCount,
    staggerMs: params.staggerMs,
    durationMs: ATTACK_EFFECT_DURATIONS_MS[params.category],
    ringStrokeWidth: physical.ringStrokeWidth,
    showArc: physical.showArc,
    originShockwave: physical.originShockwave,
    metadataSource: params.metadataSource,
  };
}

function fallbackWeaponKey(payload: AttackWeaponEffectPayload): string {
  return normalizeWeaponKey(
    payload.weaponName ?? payload.weaponType ?? payload.weaponId,
  );
}

function normalizeCategory(
  value: AttackVisualCategory | string | undefined,
): AttackVisualCategory | null {
  const normalized = normalizeWeaponKey(value);
  if (normalized === 'laser') return 'laser';
  if (normalized === 'missile') return 'missile';
  if (normalized === 'ballistic') return 'ballistic';
  if (normalized === 'physical') return 'physical';
  if (normalized === 'energy') return 'energy';

  if (normalized.includes('energy')) return 'energy';
  if (normalized.includes('missile')) return 'missile';
  if (normalized.includes('ballistic')) return 'ballistic';
  if (normalized.includes('physical')) return 'physical';

  return null;
}

function categoryFromWeaponKey(key: string): AttackVisualCategory {
  if (isPhysicalKey(key)) return 'physical';
  if (isMissileKey(key)) return 'missile';
  if (isBallisticKey(key)) return 'ballistic';
  if (isLaserKey(key)) return 'laser';
  if (isEnergyKey(key)) return 'energy';
  return 'energy';
}

function primitiveForCategory(
  category: AttackVisualCategory,
): AttackEffectPrimitiveKind {
  switch (category) {
    case 'missile':
      return 'missile';
    case 'ballistic':
      return 'tracer';
    case 'physical':
      return 'shockwave';
    case 'laser':
    case 'energy':
      return 'laser';
  }
}

function colorFor(
  payload: AttackEffectPayloadHints,
  key: string,
  category: AttackVisualCategory,
): { readonly value: string; readonly source: AttackEffectMetadataSource } {
  if (payload.visualColor) {
    return { value: payload.visualColor, source: 'event' };
  }

  if (category === 'missile') {
    return { value: ATTACK_EFFECT_COLORS.missileYellow, source: 'fallback' };
  }
  if (category === 'ballistic') {
    return { value: ATTACK_EFFECT_COLORS.ballisticCyan, source: 'fallback' };
  }
  if (category === 'physical') {
    return { value: ATTACK_EFFECT_COLORS.physicalWhite, source: 'fallback' };
  }
  if (isErKey(key)) {
    return {
      value: ATTACK_EFFECT_COLORS.laserErRedOrange,
      source: payloadHasVisualSubtype(payload) ? 'event' : 'fallback',
    };
  }
  if (isPulseKey(key)) {
    return {
      value: ATTACK_EFFECT_COLORS.laserPulseIr,
      source: payloadHasVisualSubtype(payload) ? 'event' : 'fallback',
    };
  }
  if (category === 'energy') {
    return {
      value: ATTACK_EFFECT_COLORS.energyGreen,
      source: payloadHasVisualSubtype(payload) ? 'event' : 'fallback',
    };
  }

  return {
    value: ATTACK_EFFECT_COLORS.laserGreen,
    source: payloadHasVisualSubtype(payload) ? 'event' : 'fallback',
  };
}

function projectileCountFor(
  payload: AttackEffectPayloadHints & { readonly projectileCount?: number },
  key: string,
  category: AttackVisualCategory,
): { readonly value: number; readonly source: AttackEffectMetadataSource } {
  const eventCount = firstPositiveInteger([
    payload.projectileCount,
    payload.totalProjectiles,
    payload.projectilesFired,
    payload.salvoSize,
    payload.burstCount,
  ]);
  if (eventCount !== null) return { value: eventCount, source: 'event' };

  if (category === 'missile') {
    return { value: missileTubeCount(key), source: 'fallback' };
  }
  if (category === 'ballistic') {
    if (isRotaryKey(key)) return { value: 5, source: 'fallback' };
    if (isUltraKey(key)) return { value: 2, source: 'fallback' };
  }
  return { value: 1, source: 'fallback' };
}

function staggerMsFor(
  payload: AttackEffectPayloadHints,
  key: string,
  category: AttackVisualCategory,
  projectileCount: number,
): { readonly value: number; readonly source: AttackEffectMetadataSource } {
  const eventStagger = firstPositiveInteger([
    payload.staggerMs,
    payload.visualStaggerMs,
    payload.projectileStaggerMs,
  ]);
  if (eventStagger !== null) return { value: eventStagger, source: 'event' };

  if (projectileCount <= 1) return { value: 0, source: 'fallback' };
  if (category === 'missile') return { value: 30, source: 'fallback' };
  if (category === 'ballistic') {
    if (isUltraKey(key)) return { value: 80, source: 'fallback' };
    if (isRotaryKey(key)) return { value: 40, source: 'fallback' };
  }

  return { value: 0, source: 'fallback' };
}
