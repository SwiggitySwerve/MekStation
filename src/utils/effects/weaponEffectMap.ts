import {
  GameEventType,
  type AttackVisualCategory,
  type IAttackResolvedPayload,
  type IGameEvent,
  type IPhysicalAttackResolvedPayload,
} from '@/types/gameplay';

export type AttackEffectPrimitiveKind =
  | 'laser'
  | 'missile'
  | 'tracer'
  | 'shockwave';

export type AttackEffectMetadataSource = 'event' | 'fallback';

export interface AttackEffectPayloadHints {
  readonly weaponName?: string;
  readonly weaponType?: string;
  readonly weaponCategory?: string;
  readonly category?: string;
  readonly visualColor?: string;
  readonly totalProjectiles?: number;
  readonly projectilesFired?: number;
  readonly salvoSize?: number;
  readonly burstCount?: number;
  readonly staggerMs?: number;
  readonly visualStaggerMs?: number;
  readonly projectileStaggerMs?: number;
}

export type AttackWeaponEffectPayload = IAttackResolvedPayload &
  AttackEffectPayloadHints;

export type PhysicalAttackEffectPayload = IPhysicalAttackResolvedPayload &
  AttackEffectPayloadHints & {
    readonly visualCategory?: AttackVisualCategory;
    readonly visualSubtype?: string;
    readonly projectileCount?: number;
  };

export interface WeaponEffectDescriptor {
  readonly category: AttackVisualCategory;
  readonly primitive: AttackEffectPrimitiveKind;
  readonly visualSubtype: string;
  readonly color: string;
  readonly impactColor: string;
  readonly projectileCount: number;
  readonly staggerMs: number;
  readonly durationMs: number;
  readonly ringStrokeWidth: number;
  readonly showArc: boolean;
  readonly originShockwave: boolean;
  readonly metadataSource: {
    readonly category: AttackEffectMetadataSource;
    readonly color: AttackEffectMetadataSource;
    readonly projectiles: AttackEffectMetadataSource;
    readonly stagger: AttackEffectMetadataSource;
  };
}

export const ATTACK_EFFECT_COLORS = {
  laserGreen: '#22c55e',
  laserErRedOrange: '#f97316',
  laserPulseIr: '#f43f5e',
  missileYellow: '#facc15',
  ballisticCyan: '#22d3ee',
  physicalWhite: '#ffffff',
  physicalImpactRed: '#f87171',
  energyGreen: '#22c55e',
  impactWhite: '#ffffff',
} as const;

export const ATTACK_EFFECT_DURATIONS_MS = {
  laser: 400,
  energy: 400,
  missile: 600,
  ballistic: 300,
  physical: 400,
} as const satisfies Record<AttackVisualCategory, number>;

export function attackMaxProjectileStaggerMs(
  effect: Pick<WeaponEffectDescriptor, 'projectileCount' | 'staggerMs'>,
): number {
  return Math.max(0, effect.projectileCount - 1) * effect.staggerMs;
}

export function attackImpactDelayMs(
  effect: Pick<
    WeaponEffectDescriptor,
    'durationMs' | 'projectileCount' | 'staggerMs'
  >,
  reducedMotion: boolean,
): number {
  if (reducedMotion) return 0;
  return effect.durationMs + attackMaxProjectileStaggerMs(effect);
}

export const WEAPON_EFFECT_FALLBACK_CASES = [
  {
    weaponName: 'Small Laser',
    expectedCategory: 'laser',
    expectedColor: ATTACK_EFFECT_COLORS.laserGreen,
  },
  {
    weaponName: 'Medium Laser',
    expectedCategory: 'laser',
    expectedColor: ATTACK_EFFECT_COLORS.laserGreen,
  },
  {
    weaponName: 'Large Laser',
    expectedCategory: 'laser',
    expectedColor: ATTACK_EFFECT_COLORS.laserGreen,
  },
  {
    weaponName: 'ER Large Laser',
    expectedCategory: 'laser',
    expectedColor: ATTACK_EFFECT_COLORS.laserErRedOrange,
  },
  {
    weaponName: 'Medium Pulse Laser',
    expectedCategory: 'laser',
    expectedColor: ATTACK_EFFECT_COLORS.laserPulseIr,
  },
  {
    weaponName: 'PPC',
    expectedCategory: 'energy',
    expectedColor: ATTACK_EFFECT_COLORS.energyGreen,
  },
  {
    weaponName: 'ER PPC',
    expectedCategory: 'energy',
    expectedColor: ATTACK_EFFECT_COLORS.laserErRedOrange,
  },
  {
    weaponName: 'Flamer',
    expectedCategory: 'energy',
    expectedColor: ATTACK_EFFECT_COLORS.energyGreen,
  },
  {
    weaponName: 'AC/10',
    expectedCategory: 'ballistic',
    expectedColor: ATTACK_EFFECT_COLORS.ballisticCyan,
  },
  {
    weaponName: 'Ultra AC/10',
    expectedCategory: 'ballistic',
    expectedColor: ATTACK_EFFECT_COLORS.ballisticCyan,
    expectedProjectiles: 2,
    expectedStaggerMs: 80,
  },
  {
    weaponName: 'Rotary AC/5',
    expectedCategory: 'ballistic',
    expectedColor: ATTACK_EFFECT_COLORS.ballisticCyan,
    expectedProjectiles: 5,
    expectedStaggerMs: 40,
  },
  {
    weaponName: 'Gauss Rifle',
    expectedCategory: 'ballistic',
    expectedColor: ATTACK_EFFECT_COLORS.ballisticCyan,
  },
  {
    weaponName: 'Machine Gun',
    expectedCategory: 'ballistic',
    expectedColor: ATTACK_EFFECT_COLORS.ballisticCyan,
  },
  {
    weaponName: 'LRM-20',
    expectedCategory: 'missile',
    expectedColor: ATTACK_EFFECT_COLORS.missileYellow,
    expectedProjectiles: 20,
    expectedStaggerMs: 30,
  },
  {
    weaponName: 'SRM 6',
    expectedCategory: 'missile',
    expectedColor: ATTACK_EFFECT_COLORS.missileYellow,
    expectedProjectiles: 6,
    expectedStaggerMs: 30,
  },
  {
    weaponName: 'Streak SRM 4',
    expectedCategory: 'missile',
    expectedColor: ATTACK_EFFECT_COLORS.missileYellow,
    expectedProjectiles: 4,
    expectedStaggerMs: 30,
  },
  {
    weaponName: 'Punch',
    expectedCategory: 'physical',
    expectedColor: ATTACK_EFFECT_COLORS.physicalWhite,
  },
  {
    weaponName: 'Kick',
    expectedCategory: 'physical',
    expectedColor: ATTACK_EFFECT_COLORS.physicalWhite,
  },
  {
    weaponName: 'Hatchet',
    expectedCategory: 'physical',
    expectedColor: ATTACK_EFFECT_COLORS.physicalWhite,
  },
] as const satisfies readonly {
  readonly weaponName: string;
  readonly expectedCategory: AttackVisualCategory;
  readonly expectedColor: string;
  readonly expectedProjectiles?: number;
  readonly expectedStaggerMs?: number;
}[];

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

function physicalMetadata(key: string): {
  readonly ringStrokeWidth: number;
  readonly showArc: boolean;
  readonly originShockwave: boolean;
} {
  if (key.includes('kick')) {
    return { ringStrokeWidth: 4, showArc: false, originShockwave: false };
  }
  if (key.includes('charge') || key.includes('dfa')) {
    return { ringStrokeWidth: 5, showArc: false, originShockwave: true };
  }
  if (
    key.includes('club') ||
    key.includes('hatchet') ||
    key.includes('sword') ||
    key.includes('mace') ||
    key.includes('lance')
  ) {
    return { ringStrokeWidth: 3, showArc: true, originShockwave: false };
  }
  return { ringStrokeWidth: 2, showArc: false, originShockwave: false };
}

function missileTubeCount(key: string): number {
  const match = key.match(
    /(?:^|-)(?:clan-)?(?:streak-)?(?:lrm|srm|mrm|atm|mml|thunderbolt)-?(\d{1,2})(?:-|$)/,
  );
  const parsed = match?.[1] ? Number(match[1]) : 1;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function firstPositiveInteger(
  values: readonly (number | undefined)[],
): number | null {
  for (const value of values) {
    if (value === undefined) continue;
    const rounded = Math.floor(value);
    if (Number.isFinite(rounded) && rounded > 0) return rounded;
  }
  return null;
}

function payloadHasVisualSubtype(payload: AttackEffectPayloadHints): boolean {
  return (
    'visualSubtype' in payload && typeof payload.visualSubtype === 'string'
  );
}

function isLaserKey(key: string): boolean {
  return key.includes('laser');
}

function isEnergyKey(key: string): boolean {
  return (
    key.includes('ppc') ||
    key.includes('flamer') ||
    key.includes('plasma') ||
    key.includes('particle-cannon')
  );
}

function isErKey(key: string): boolean {
  return (
    key.startsWith('er-') ||
    key.includes('-er-') ||
    key.includes('extended-range')
  );
}

function isPulseKey(key: string): boolean {
  return key.includes('pulse');
}

function isMissileKey(key: string): boolean {
  return (
    key.includes('lrm') ||
    key.includes('srm') ||
    key.includes('mrm') ||
    key.includes('atm') ||
    key.includes('mml') ||
    key.includes('narc') ||
    key.includes('missile') ||
    key.includes('thunderbolt')
  );
}

function isBallisticKey(key: string): boolean {
  return (
    key.includes('ac-') ||
    key.includes('autocannon') ||
    key.includes('uac-') ||
    key.includes('ultra-ac') ||
    key.includes('rac-') ||
    key.includes('rotary-ac') ||
    key.includes('gauss') ||
    key.includes('machine-gun') ||
    key === 'mg' ||
    key.includes('lb-') ||
    key.includes('hvac')
  );
}

function isUltraKey(key: string): boolean {
  return key.includes('uac-') || key.includes('ultra-ac');
}

function isRotaryKey(key: string): boolean {
  return key.includes('rac-') || key.includes('rotary-ac');
}

function isPhysicalKey(key: string): boolean {
  return (
    key.includes('punch') ||
    key.includes('kick') ||
    key.includes('club') ||
    key.includes('hatchet') ||
    key.includes('sword') ||
    key.includes('charge') ||
    key.includes('dfa') ||
    key.includes('death-from-above') ||
    key.includes('mace') ||
    key.includes('lance')
  );
}
