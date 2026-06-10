/**
 * Tier 3 moment detection - Specialized tactical events
 * Detects: heat-crisis, mobility-kill, weapons-kill, rear-arc-hit (also in tier2), overkill (also in tier2)
 */

import type { IKeyMoment } from '@/types/simulation-viewer/IKeyMoment';

import {
  GameEventType,
  type IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';

import { getPayload } from '../utils/getPayload';
import {
  type BattleState,
  type DetectorTrackingState,
  LEG_ACTUATOR_COMPONENTS,
  getUnitName,
} from './types';

export function processCriticalHitTier3(
  event: IGameEvent,
  battleState: BattleState,
  state: DetectorTrackingState,
  createMoment: (
    type: string,
    event: IGameEvent,
    description: string,
    relatedUnitIds: string[],
    state: DetectorTrackingState,
    metadata?: Record<string, unknown>,
  ) => IKeyMoment,
): IKeyMoment[] {
  const payload = getPayload(event, GameEventType.CriticalHit);
  const moments: IKeyMoment[] = [];
  const targetName = getUnitName(battleState.units, payload.unitId);
  const relatedUnits = payload.sourceUnitId
    ? [payload.sourceUnitId, payload.unitId]
    : [payload.unitId];

  // Canonical ICriticalHitPayload.component is optional (legacy emitters may
  // omit it); both tier-3 detections require a named component.
  const component = payload.component;
  if (component === undefined) return moments;

  // 15. Mobility kill - leg actuator critical hit
  if (LEG_ACTUATOR_COMPONENTS.has(component)) {
    if (!state.mobilityKillDetected.has(payload.unitId)) {
      state.mobilityKillDetected.add(payload.unitId);

      moments.push(
        createMoment(
          'mobility-kill',
          event,
          `Mobility kill on ${targetName}: ${component} destroyed`,
          relatedUnits,
          state,
          { component, location: payload.location },
        ),
      );
    }
  }

  // 16. Weapons kill - track destroyed weapons
  const unit = battleState.units.find((u) => u.id === payload.unitId);
  if (unit && unit.weaponIds.includes(component)) {
    if (!state.destroyedWeaponsPerUnit.has(payload.unitId)) {
      state.destroyedWeaponsPerUnit.set(payload.unitId, new Set());
    }
    const destroyed = state.destroyedWeaponsPerUnit.get(payload.unitId)!;
    destroyed.add(component);

    if (
      destroyed.size >= unit.weaponIds.length &&
      !state.weaponsKillDetected.has(payload.unitId)
    ) {
      state.weaponsKillDetected.add(payload.unitId);

      moments.push(
        createMoment(
          'weapons-kill',
          event,
          `All weapons destroyed on ${targetName}`,
          relatedUnits,
          state,
          { destroyedWeapons: Array.from(destroyed) },
        ),
      );
    }
  }

  return moments;
}

export function processHeatEffectApplied(
  event: IGameEvent,
  battleState: BattleState,
  state: DetectorTrackingState,
  createMoment: (
    type: string,
    event: IGameEvent,
    description: string,
    relatedUnitIds: string[],
    state: DetectorTrackingState,
    metadata?: Record<string, unknown>,
  ) => IKeyMoment,
): IKeyMoment[] {
  // Audit 2026-06-09 G (W5.1b): the stale detector-local payload read
  // `payload.heat`, a field the runner's heatThresholdEvents emitter never
  // sets — the canonical IHeatEffectAppliedPayload carries `heatLevel`.
  const payload = getPayload(event, GameEventType.HeatEffectApplied);

  if (payload.effect !== 'shutdown') return [];

  const unitName = getUnitName(battleState.units, payload.unitId);

  return [
    createMoment(
      'heat-crisis',
      event,
      `Heat shutdown: ${unitName} shut down (${payload.heatLevel} heat)`,
      [payload.unitId],
      state,
      { heat: payload.heatLevel },
    ),
  ];
}
