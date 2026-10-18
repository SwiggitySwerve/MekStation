import type {
  IDamageAppliedPayload,
  IPilotHitPayload,
  IUnitDestroyedPayload,
} from '../../types/gameplay/GameSessionInterfaces';
import type { IParticipant, ISimulationRunResult } from '../runner/types';
import type {
  MutableGunneryBracketAcc,
  MutableAIVariantAcc,
  MutablePilotAcc,
} from './swarmAccumulatorTypes';
import type { GunneryBracket } from './swarmAggregation.types';

import { GameEventType } from '../../types/gameplay/GameSessionInterfaces';
import {
  getGunneryBracket,
  canonicalVariantPairKey,
  isSynthesizedPilot,
  ensureKey,
  winningSideId,
  groupBySide,
} from './swarmAccumulatorHelpers';

/**
 * Accumulate gunneryBracket for one run.
 *
 * avgDamageDealt per bracket is computed (in the freeze step) as:
 *   totalDamage / participantRunCount
 *
 * Damage per participant in this run = sum of DamageApplied events where
 * sourceUnitId matches the participant's unitId.
 */
export function accumulateGunneryBracket(
  participants: readonly IParticipant[],
  result: ISimulationRunResult,
  bracketAcc: Record<GunneryBracket, MutableGunneryBracketAcc>,
): void {
  const winner = result.winner;
  const bySide = groupBySide(participants);
  const sideIds = Object.keys(bySide);
  if (sideIds.length !== 2) return;

  const winningSide = winningSideId(winner, participants);

  // Per-unitId damage dealt from events
  const damageByUnitId: Record<string, number> = {};
  for (const event of result.events) {
    if (event.type === GameEventType.DamageApplied) {
      const payload = event.payload as IDamageAppliedPayload;
      if (payload.sourceUnitId !== undefined) {
        damageByUnitId[payload.sourceUnitId] =
          (damageByUnitId[payload.sourceUnitId] ?? 0) + payload.damage;
      }
    }
  }

  for (const participant of participants) {
    const bracket = getGunneryBracket(participant.gunnery);
    const acc = bracketAcc[bracket];

    if (winner === 'draw' || winningSide === null) {
      if (winner === 'draw') acc.draws++;
    } else if (winningSide === participant.sideId) {
      acc.wins++;
    } else {
      acc.losses++;
    }

    acc.totalDamage += damageByUnitId[participant.unitId] ?? 0;
    acc.participantRunCount++;
  }
}

/**
 * Accumulate aiVariantHeadToHead for one run.
 *
 * Mixed-variant runs (a side has >1 distinct aiVariant among its participants)
 * are excluded from head-to-head cells and counted in mixedVariantRuns instead.
 */
export function accumulateAIVariantHeadToHead(
  participants: readonly IParticipant[],
  result: ISimulationRunResult,
  h2hAcc: Record<string, MutableAIVariantAcc>,
  mixedCount: { value: number },
): void {
  const bySide = groupBySide(participants);
  const sideIds = Object.keys(bySide);
  if (sideIds.length !== 2) return;

  const [sideAId] = sideIds as [string, string];

  const variantsA = Array.from(
    new Set(bySide[sideIds[0]!]!.map((p) => p.aiVariant)),
  );
  const variantsB = Array.from(
    new Set(bySide[sideIds[1]!]!.map((p) => p.aiVariant)),
  );

  if (variantsA.length > 1 || variantsB.length > 1) {
    mixedCount.value++;
    return;
  }

  const variantA = variantsA[0]!;
  const variantB = variantsB[0]!;

  const pairKey = canonicalVariantPairKey(variantA, variantB);
  const acc = ensureKey(h2hAcc, pairKey, () => ({
    wins: 0,
    losses: 0,
    draws: 0,
    totalTurns: 0,
    runCount: 0,
  }));

  acc.totalTurns += result.turns;
  acc.runCount++;

  const winner = result.winner;
  const winningSide = winningSideId(winner, participants);

  if (winner === 'draw' || winningSide === null) {
    acc.draws++;
  } else {
    // wins/losses are from perspective of alphabetically-first variant.
    const winningVariant = winningSide === sideAId ? variantA : variantB;
    const alphaFirst = variantA <= variantB ? variantA : variantB;
    if (winningVariant === alphaFirst) {
      acc.wins++;
    } else {
      acc.losses++;
    }
  }
}

/**
 * Accumulate pilotPerformance for one run.
 * Synthesized pilots (pilotId starts with 'synth-pilot-') are skipped.
 */
export function accumulatePilotPerformance(
  participants: readonly IParticipant[],
  result: ISimulationRunResult,
  pilotAcc: Record<string, MutablePilotAcc>,
): void {
  const winner = result.winner;
  const bySide = groupBySide(participants);
  const sideIds = Object.keys(bySide);
  if (sideIds.length !== 2) return;

  const winningSide = winningSideId(winner, participants);

  const killsByUnitId: Record<string, number> = {};
  for (const event of result.events) {
    if (event.type === GameEventType.UnitDestroyed) {
      const payload = event.payload as IUnitDestroyedPayload;
      if (payload.killerUnitId !== undefined) {
        killsByUnitId[payload.killerUnitId] =
          (killsByUnitId[payload.killerUnitId] ?? 0) + 1;
      }
    }
  }

  const woundsByUnitId: Record<string, number> = {};
  for (const event of result.events) {
    if (event.type === GameEventType.PilotHit) {
      const payload = event.payload as IPilotHitPayload;
      woundsByUnitId[payload.unitId] =
        (woundsByUnitId[payload.unitId] ?? 0) + payload.wounds;
    }
  }

  for (const participant of participants) {
    if (isSynthesizedPilot(participant.pilotId)) continue;

    const acc = ensureKey(pilotAcc, participant.pilotId, () => ({
      runs: 0,
      wins: 0,
      kills: 0,
      takenWounds: 0,
    }));

    acc.runs++;

    const isWin =
      winner !== 'draw' &&
      winningSide !== null &&
      winningSide === participant.sideId;
    if (isWin) acc.wins++;

    acc.kills += killsByUnitId[participant.unitId] ?? 0;
    acc.takenWounds += woundsByUnitId[participant.unitId] ?? 0;
  }
}
