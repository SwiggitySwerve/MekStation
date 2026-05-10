import {
  type AttackVisualCategory,
  type IAttackResolvedPayload,
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
