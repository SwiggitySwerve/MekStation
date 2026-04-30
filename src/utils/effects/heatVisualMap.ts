import type { HeatVisualThreshold, IHeatPayload } from '@/types/gameplay';

import { getAmmoExplosionTN } from '@/constants/heat';

export type HeatVisualBadge = 'HOT' | 'OVERHEAT' | 'CRITICAL';

export interface HeatVisualState {
  readonly threshold: HeatVisualThreshold;
  readonly color: string;
  readonly intensity: number;
  readonly pulse: boolean;
  readonly badge: HeatVisualBadge | null;
}

export interface HeatThresholdTransition {
  readonly previousHeat: number;
  readonly currentHeat: number;
  readonly previousThreshold: HeatVisualThreshold;
  readonly currentThreshold: HeatVisualThreshold;
  readonly ammoExplosionRisk: boolean;
}

const NEUTRAL_HEAT: HeatVisualState = {
  threshold: 'normal',
  color: '#94a3b8',
  intensity: 0.12,
  pulse: false,
  badge: null,
};

const WARM_HEAT: HeatVisualState = {
  threshold: 'warm',
  color: '#f59e0b',
  intensity: 0.32,
  pulse: false,
  badge: null,
};

const HOT_HEAT: HeatVisualState = {
  threshold: 'hot',
  color: '#f97316',
  intensity: 0.52,
  pulse: false,
  badge: 'HOT',
};

const OVERHEAT: HeatVisualState = {
  threshold: 'overheat',
  color: '#dc2626',
  intensity: 0.74,
  pulse: false,
  badge: 'OVERHEAT',
};

const CRITICAL_HEAT: HeatVisualState = {
  threshold: 'critical',
  color: '#fff1f2',
  intensity: 0.95,
  pulse: true,
  badge: 'CRITICAL',
};

function normalizeHeat(heat: number): number {
  if (!Number.isFinite(heat)) return 0;
  return Math.max(0, Math.floor(heat));
}

export function getHeatVisualMap(heat: number): HeatVisualState {
  const normalizedHeat = normalizeHeat(heat);

  if (normalizedHeat >= 20) return CRITICAL_HEAT;
  if (normalizedHeat >= 15) return OVERHEAT;
  if (normalizedHeat >= 10) return HOT_HEAT;
  if (normalizedHeat >= 5) return WARM_HEAT;
  return NEUTRAL_HEAT;
}

export const mapHeatToVisualState = getHeatVisualMap;
export const resolveHeatVisualState = getHeatVisualMap;

export function getHeatVisualThreshold(heat: number): HeatVisualThreshold {
  return getHeatVisualMap(heat).threshold;
}

export function isAmmoExplosionDangerHeat(heat: number): boolean {
  return getAmmoExplosionTN(normalizeHeat(heat)) > 0;
}

export function getHeatThresholdTransition(
  previousHeat: number,
  currentHeat: number,
): HeatThresholdTransition {
  const normalizedPreviousHeat = normalizeHeat(previousHeat);
  const normalizedCurrentHeat = normalizeHeat(currentHeat);

  return {
    previousHeat: normalizedPreviousHeat,
    currentHeat: normalizedCurrentHeat,
    previousThreshold: getHeatVisualThreshold(normalizedPreviousHeat),
    currentThreshold: getHeatVisualThreshold(normalizedCurrentHeat),
    ammoExplosionRisk: isAmmoExplosionDangerHeat(normalizedCurrentHeat),
  };
}

export function getHeatTransitionFromPayload(
  payload: Pick<
    IHeatPayload,
    | 'newTotal'
    | 'previousTotal'
    | 'previousThreshold'
    | 'currentThreshold'
    | 'ammoExplosionRisk'
  >,
): HeatThresholdTransition {
  const previousHeat = normalizeHeat(payload.previousTotal ?? payload.newTotal);
  const currentHeat = normalizeHeat(payload.newTotal);

  return {
    previousHeat,
    currentHeat,
    previousThreshold:
      payload.previousThreshold ?? getHeatVisualThreshold(previousHeat),
    currentThreshold:
      payload.currentThreshold ?? getHeatVisualThreshold(currentHeat),
    ammoExplosionRisk:
      payload.ammoExplosionRisk ?? isAmmoExplosionDangerHeat(currentHeat),
  };
}

export default getHeatVisualMap;
