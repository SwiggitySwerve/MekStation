import type { AttackEffectPayloadHints } from './weaponEffectDescriptors';

export function physicalMetadata(key: string): {
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

export function missileTubeCount(key: string): number {
  const match = key.match(
    /(?:^|-)(?:clan-)?(?:streak-)?(?:lrm|srm|mrm|atm|mml|thunderbolt)-?(\d{1,2})(?:-|$)/,
  );
  const parsed = match?.[1] ? Number(match[1]) : 1;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function firstPositiveInteger(
  values: readonly (number | undefined)[],
): number | null {
  for (const value of values) {
    if (value === undefined) continue;
    const rounded = Math.floor(value);
    if (Number.isFinite(rounded) && rounded > 0) return rounded;
  }
  return null;
}

export function payloadHasVisualSubtype(
  payload: AttackEffectPayloadHints,
): boolean {
  return (
    'visualSubtype' in payload && typeof payload.visualSubtype === 'string'
  );
}

export function isLaserKey(key: string): boolean {
  return key.includes('laser');
}

export function isEnergyKey(key: string): boolean {
  return (
    key.includes('ppc') ||
    key.includes('flamer') ||
    key.includes('plasma') ||
    key.includes('particle-cannon')
  );
}

export function isErKey(key: string): boolean {
  return (
    key.startsWith('er-') ||
    key.includes('-er-') ||
    key.includes('extended-range')
  );
}

export function isPulseKey(key: string): boolean {
  return key.includes('pulse');
}

export function isMissileKey(key: string): boolean {
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

export function isBallisticKey(key: string): boolean {
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

export function isUltraKey(key: string): boolean {
  return key.includes('uac-') || key.includes('ultra-ac');
}

export function isRotaryKey(key: string): boolean {
  return key.includes('rac-') || key.includes('rotary-ac');
}

export function isPhysicalKey(key: string): boolean {
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
