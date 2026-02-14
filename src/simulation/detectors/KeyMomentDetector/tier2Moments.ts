/**
 * Tier 2 moment detection - Significant tactical events
 * Detects: head-shot, ammo-explosion, pilot-kill, critical-engine, critical-gyro, alpha-strike, focus-fire
 */

import type { IKeyMoment } from '@/types/simulation-viewer/IKeyMoment';

import {
  type IGameEvent,
  type IDamageAppliedPayload,
  type IPilotHitPayload,
} from '@/types/gameplay/GameSessionInterfaces';

import { getPayload } from '../utils/getPayload';
import {
  type BattleState,
  type DetectorTrackingState,
  type ICriticalHitPayload,
  type IAmmoExplosionPayload,
  type IAttackResolvedExtended,
  FOCUS_FIRE_THRESHOLD,
  getUnitName,
} from './types';

export function processAttackResolved(
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
  const payload = getPayload<IAttackResolvedExtended>(event);
  const moments: IKeyMoment[] = [];

  if (!payload.hit) return moments;

  // Track attacks per target per turn for focus-fire
  if (!state.attacksPerTurnPerTarget.has(event.turn)) {
    state.attacksPerTurnPerTarget.set(event.turn, new Map());
  }
  const turnTargets = state.attacksPerTurnPerTarget.get(event.turn)!;
  if (!turnTargets.has(payload.targetId)) {
    turnTargets.set(payload.targetId, new Set());
  }
  turnTargets.get(payload.targetId)!.add(payload.attackerId);

  // Track weapons fired per unit per turn for alpha-strike
  if (!state.weaponsFiredPerTurnPerUnit.has(event.turn)) {
    state.weaponsFiredPerTurnPerUnit.set(event.turn, new Map());
  }
  const turnUnits = state.weaponsFiredPerTurnPerUnit.get(event.turn)!;
  if (!turnUnits.has(payload.attackerId)) {
    turnUnits.set(payload.attackerId, new Set());
  }
  turnUnits.get(payload.attackerId)!.add(payload.weaponId);

  // 12. Alpha strike - unit fires all weapons in one turn
  const attackerUnit = battleState.units.find(
    (u) => u.id === payload.attackerId,
  );
  if (attackerUnit && attackerUnit.weaponIds.length > 0) {
    const firedWeapons = turnUnits.get(payload.attackerId)!;
    if (!state.alphaStrikeDetected.has(event.turn)) {
      state.alphaStrikeDetected.set(event.turn, new Set());
    }
    const turnAlphas = state.alphaStrikeDetected.get(event.turn)!;

    if (
      firedWeapons.size >= attackerUnit.weaponIds.length &&
      !turnAlphas.has(payload.attackerId)
    ) {
      turnAlphas.add(payload.attackerId);

      moments.push(
        createMoment(
          'alpha-strike',
          event,
          `${attackerUnit.name} fires all ${attackerUnit.weaponIds.length} weapons`,
          [payload.attackerId, payload.targetId],
          state,
          { weaponCount: attackerUnit.weaponIds.length },
        ),
      );
    }
  }

  // 13. Focus fire - 3+ units attack same target in one turn
  const attackersOnTarget = turnTargets.get(payload.targetId)!;
  if (attackersOnTarget.size >= FOCUS_FIRE_THRESHOLD) {
    if (!state.focusFireDetected.has(event.turn)) {
      state.focusFireDetected.set(event.turn, new Set());
    }
    const turnFocus = state.focusFireDetected.get(event.turn)!;

    if (!turnFocus.has(payload.targetId)) {
      turnFocus.add(payload.targetId);
      const targetName = getUnitName(battleState.units, payload.targetId);
      const attackerIds = Array.from(attackersOnTarget);

      moments.push(
        createMoment(
          'focus-fire',
          event,
          `${attackersOnTarget.size} units focus fire on ${targetName}`,
          [...attackerIds, payload.targetId],
          state,
          { attackerCount: attackersOnTarget.size },
        ),
      );
    }
  }

  // 17. Rear arc hit
  if (payload.attackerFacing === 'rear') {
    const attackerName = getUnitName(battleState.units, payload.attackerId);
    const targetName = getUnitName(battleState.units, payload.targetId);

    moments.push(
      createMoment(
        'rear-arc-hit',
        event,
        `Rear arc hit on ${targetName} by ${attackerName}`,
        [payload.attackerId, payload.targetId],
        state,
        { location: payload.location },
      ),
    );
  }

  return moments;
}

export function processDamageApplied(
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
  const payload = getPayload<IDamageAppliedPayload>(event);
  const moments: IKeyMoment[] = [];

  // Get pre-damage structure for overkill detection
  const unitStructure = state.structurePerUnit.get(payload.unitId);
  const unitArmor = state.armorPerUnit.get(payload.unitId);
  const preDamageStructure = unitStructure?.[payload.location] ?? 0;
  const preDamageArmor = unitArmor?.[payload.location] ?? 0;

  if (unitArmor) {
    unitArmor[payload.location] = payload.armorRemaining;
  }
  if (unitStructure) {
    unitStructure[payload.location] = payload.structureRemaining;
  }

  // 7. Head shot - damage to head location
  if (payload.location === 'head' && payload.damage > 0) {
    const targetName = getUnitName(battleState.units, payload.unitId);
    const relatedUnits = payload.sourceUnitId
      ? [payload.sourceUnitId, payload.unitId]
      : [payload.unitId];
    const attackerName = payload.sourceUnitId
      ? getUnitName(battleState.units, payload.sourceUnitId)
      : 'Unknown';

    moments.push(
      createMoment(
        'head-shot',
        event,
        `Head hit on ${targetName} by ${attackerName} for ${payload.damage} damage`,
        relatedUnits,
        state,
        { damage: payload.damage, location: 'head' },
      ),
    );
  }

  // 18. Overkill - damage significantly exceeds what the location could absorb
  const OVERKILL_MULTIPLIER = 2;
  if (preDamageStructure > 0) {
    const damageToStructure = Math.max(0, payload.damage - preDamageArmor);
    if (damageToStructure > OVERKILL_MULTIPLIER * preDamageStructure) {
      const targetName = getUnitName(battleState.units, payload.unitId);
      const relatedUnits = payload.sourceUnitId
        ? [payload.sourceUnitId, payload.unitId]
        : [payload.unitId];

      moments.push(
        createMoment(
          'overkill',
          event,
          `Overkill on ${targetName}: ${payload.damage} damage to ${payload.location} (${Math.round(damageToStructure / preDamageStructure)}x excess)`,
          relatedUnits,
          state,
          {
            damage: payload.damage,
            location: payload.location,
            preDamageStructure,
            excessMultiplier: Math.round(
              damageToStructure / preDamageStructure,
            ),
          },
        ),
      );
    }
  }

  return moments;
}

export function processCriticalHit(
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

  // 10. Critical engine
  if (payload.component === 'engine') {
    moments.push(
      createMoment(
        'critical-engine',
        event,
        `Engine critical hit on ${targetName}`,
        relatedUnits,
        state,
      ),
    );
  }

  // 11. Critical gyro
  if (payload.component === 'gyro') {
    moments.push(
      createMoment(
        'critical-gyro',
        event,
        `Gyro critical hit on ${targetName}`,
        relatedUnits,
        state,
      ),
    );
  }

  return moments;
}

export function processAmmoExplosion(
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
  const payload = getPayload<IAmmoExplosionPayload>(event);
  const unitName = getUnitName(battleState.units, payload.unitId);

  return [
    createMoment(
      'ammo-explosion',
      event,
      `Ammo explosion in ${unitName} at ${payload.location}`,
      [payload.unitId],
      state,
      { damage: payload.damage, location: payload.location },
    ),
  ];
}

export function processPilotHit(
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
  const payload = getPayload<IPilotHitPayload>(event);

  if (payload.consciousnessCheckPassed !== false) return [];

  const unitName = getUnitName(battleState.units, payload.unitId);
  const relatedUnits = event.actorId
    ? [event.actorId, payload.unitId]
    : [payload.unitId];

  return [
    createMoment(
      'pilot-kill',
      event,
      `Pilot killed in ${unitName} (${payload.totalWounds} wounds)`,
      relatedUnits,
      state,
      { wounds: payload.totalWounds, source: payload.source },
    ),
  ];
}
