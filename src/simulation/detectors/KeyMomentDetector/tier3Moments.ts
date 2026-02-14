/**
 * Tier 3 moment detection - Specialized tactical events
 * Detects: heat-crisis, mobility-kill, weapons-kill, rear-arc-hit (also in tier2), overkill (also in tier2)
 */

import type { IKeyMoment } from '@/types/simulation-viewer/IKeyMoment';

import { type IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import { getPayload } from '../utils/getPayload';
import {
  type BattleState,
  type DetectorTrackingState,
  type ICriticalHitPayload,
  type IHeatEffectAppliedPayload,
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
  const payload = getPayload<ICriticalHitPayload>(event);
  const moments: IKeyMoment[] = [];
  const targetName = getUnitName(battleState.units, payload.unitId);
  const relatedUnits = payload.sourceUnitId
    ? [payload.sourceUnitId, payload.unitId]
    : [payload.unitId];

  // 15. Mobility kill - leg actuator critical hit
  if (LEG_ACTUATOR_COMPONENTS.has(payload.component)) {
    if (!state.mobilityKillDetected.has(payload.unitId)) {
      state.mobilityKillDetected.add(payload.unitId);

      moments.push(
        createMoment(
          'mobility-kill',
          event,
          `Mobility kill on ${targetName}: ${payload.component} destroyed`,
          relatedUnits,
          state,
          { component: payload.component, location: payload.location },
        ),
      );
    }
  }

  // 16. Weapons kill - track destroyed weapons
  const unit = battleState.units.find((u) => u.id === payload.unitId);
  if (unit && unit.weaponIds.includes(payload.component)) {
    if (!state.destroyedWeaponsPerUnit.has(payload.unitId)) {
      state.destroyedWeaponsPerUnit.set(payload.unitId, new Set());
    }
    const destroyed = state.destroyedWeaponsPerUnit.get(payload.unitId)!;
    destroyed.add(payload.component);

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
  const payload = getPayload<IHeatEffectAppliedPayload>(event);

  if (payload.effect !== 'shutdown') return [];

  const unitName = getUnitName(battleState.units, payload.unitId);

  return [
    createMoment(
      'heat-crisis',
      event,
      `Heat shutdown: ${unitName} shut down (${payload.heat} heat)`,
      [payload.unitId],
      state,
      { heat: payload.heat },
    ),
  ];
}
