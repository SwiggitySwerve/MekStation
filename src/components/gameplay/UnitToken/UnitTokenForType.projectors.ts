import type { DamageFloaterEntry } from '@/components/gameplay/DamageFloater';
import type {
  IAmmoExplosionPayload,
  ICriticalHitResolvedPayload,
  IDamageAppliedPayload,
  IGameEvent,
  IHeatPayload,
  IPilotHitPayload,
  IShutdownCheckPayload,
  IStartupAttemptPayload,
  IUnitDestroyedPayload,
} from '@/types/gameplay';

import { GameEventType } from '@/types/gameplay';
import { getHeatTransitionFromPayload } from '@/utils/effects/heatVisualMap';

import type { IUnitEventState } from './tokenTypes';

import { EMPTY_EVENT_STATE } from './tokenTypes';

export interface UnitThermalVisualState {
  readonly heat: number;
  readonly hasHeatEvent: boolean;
  readonly isShutdown: boolean;
  readonly startupAttemptId: number | string | null;
  readonly startupSucceeded: boolean;
  readonly ammoExplosionRisk: boolean;
}

const EMPTY_THERMAL_VISUAL_STATE: UnitThermalVisualState = {
  heat: 0,
  hasHeatEvent: false,
  isShutdown: false,
  startupAttemptId: null,
  startupSucceeded: false,
  ammoExplosionRisk: false,
};

/**
 * Project the full event log down to the per-unit visual state needed by all
 * token renderers. Extracted as a pure function so `useMemo` can dedupe it
 * without capturing the full closure.
 */
export function projectEvents(
  unitId: string,
  events: readonly IGameEvent[] | undefined,
): IUnitEventState {
  if (!events || events.length === 0) return EMPTY_EVENT_STATE;

  let critCount = 0;
  let pilotHitCount = 0;
  let unconscious = false;
  let killed = false;
  let destroyed = false;
  const damageEntries: DamageFloaterEntry[] = [];

  for (const event of events) {
    switch (event.type) {
      case GameEventType.DamageApplied: {
        const p = event.payload as IDamageAppliedPayload;
        if (p.unitId !== unitId) break;
        const variant: DamageFloaterEntry['variant'] =
          p.armorRemaining === 0 ? 'structure' : 'armor';
        damageEntries.push({ id: event.id, amount: p.damage, variant });
        break;
      }
      case GameEventType.CriticalHitResolved: {
        const p = event.payload as ICriticalHitResolvedPayload;
        if (p.unitId !== unitId) break;
        critCount += 1;
        break;
      }
      case GameEventType.PilotHit: {
        const p = event.payload as IPilotHitPayload;
        if (p.unitId !== unitId) break;
        pilotHitCount += 1;
        if (p.totalWounds >= 6) {
          killed = true;
        } else if (p.consciousnessCheckPassed === false) {
          unconscious = true;
        }
        break;
      }
      case GameEventType.UnitDestroyed: {
        const p = event.payload as IUnitDestroyedPayload;
        if (p.unitId !== unitId) break;
        destroyed = true;
        break;
      }
      default:
        break;
    }
  }

  return {
    critCount,
    pilotHitCount,
    unconscious,
    killed,
    destroyed,
    damageEntries,
  };
}

export function projectThermalVisualState(
  unitId: string,
  events: readonly IGameEvent[] | undefined,
): UnitThermalVisualState {
  if (!events || events.length === 0) return EMPTY_THERMAL_VISUAL_STATE;

  let heat = 0;
  let hasHeatEvent = false;
  let isShutdown = false;
  let startupAttemptId: number | string | null = null;
  let startupSucceeded = false;
  let ammoExplosionRisk = false;

  for (const event of events) {
    switch (event.type) {
      case GameEventType.HeatGenerated:
      case GameEventType.HeatDissipated: {
        const payload = event.payload as IHeatPayload;
        if (payload.unitId !== unitId) break;
        const transition = getHeatTransitionFromPayload(payload);
        heat = transition.currentHeat;
        hasHeatEvent = true;
        ammoExplosionRisk = transition.ammoExplosionRisk;
        break;
      }
      case GameEventType.ShutdownCheck: {
        const payload = event.payload as IShutdownCheckPayload;
        if (payload.unitId !== unitId) break;
        if (payload.shutdownOccurred) isShutdown = true;
        break;
      }
      case GameEventType.StartupAttempt: {
        const payload = event.payload as IStartupAttemptPayload;
        if (payload.unitId !== unitId) break;
        startupAttemptId = event.id || event.sequence;
        startupSucceeded = payload.success;
        if (payload.success) isShutdown = false;
        break;
      }
      case GameEventType.AmmoExplosion: {
        const payload = event.payload as IAmmoExplosionPayload;
        if (payload.unitId !== unitId) break;
        ammoExplosionRisk = true;
        break;
      }
      default:
        break;
    }
  }

  return {
    heat,
    hasHeatEvent,
    isShutdown,
    startupAttemptId,
    startupSucceeded,
    ammoExplosionRisk,
  };
}
