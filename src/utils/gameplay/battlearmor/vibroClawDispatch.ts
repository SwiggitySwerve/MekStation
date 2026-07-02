/**
 * Vibro-claw attack dispatch — legality, resolution, and standard-pipeline
 * damage application for the BA vibro-claw melee attack.
 *
 * Per `wire-vibroclaw-attack-dispatch` (battle-armor-combat "Vibroclaw
 * Attack"): the previously orphaned `resolveVibroClawAttack` resolver is
 * reachable from the combat pipeline through this dispatch. It appends one
 * `VibroClawAttackResolved` record event, then applies the MegaMek
 * claw-sized damage clusters through the standard damage pipeline — each
 * cluster rolls its own front-arc hit location and emits `DamageApplied`
 * events (never a side-channel).
 *
 * v1 target scope: mech-style targets (top-level armor/structure maps).
 * Per-type combat-state targets (vehicle / proto / squad / aero) are
 * rejected with `unsupported-target-type` — routing their damage into the
 * per-type pipelines is follow-up scope, matching the living spec's
 * mech-target scenarios. No to-hit gate in v1, mirroring the leg-attack
 * precedent (the living spec specifies no roll for either); MegaMek's
 * physical to-hit gate is a recorded parity delta for a future change.
 */

import type { IGameSession } from '@/types/gameplay/GameSessionInterfaces';
import type { D6Roller } from '@/utils/gameplay/diceTypes';

import { CombatLocation, FiringArc } from '@/types/gameplay';

import { resolveDamage } from '../damage';
import { createDamageAppliedEvent } from '../gameEvents';
import { createVibroClawAttackResolvedEvent } from '../gameEvents/battleArmorVibroClaw';
import { buildDamageStateFromUnit } from '../gameSessionAttackResolutionHelpers';
import { appendEvent } from '../gameSessionCore';
import { hexDistance } from '../hexMath';
import { determineHitLocation } from '../hitLocation';
import { resolveVibroClawAttack } from './vibroClaw';

export type VibroClawRejectionReason =
  | 'unit-not-found'
  | 'attacker-not-squad'
  | 'no-vibro-claws'
  | 'not-adjacent'
  | 'unsupported-target-type';

export type VibroClawDispatchResult =
  | {
      readonly ok: true;
      readonly session: IGameSession;
      readonly totalDamage: number;
      readonly missileHits: number;
    }
  | { readonly ok: false; readonly reason: VibroClawRejectionReason };

export interface IVibroClawDispatchInput {
  readonly session: IGameSession;
  /** Attacking BA squad unit id. */
  readonly squadId: string;
  /** Target unit id (mech-style target in v1). */
  readonly targetUnitId: string;
  readonly d6Roller: D6Roller;
}

// Per-type combat-state kinds whose damage routes through their own
// pipelines — out of v1 dispatch scope.
const UNSUPPORTED_TARGET_KINDS = new Set([
  'vehicle',
  'proto',
  'squad',
  'aero',
  'infantry',
]);

/**
 * Validate, resolve, and apply one vibro-claw attack. Rejections return a
 * typed reason (the UI surfaces the adjacency reason per the spec's
 * non-adjacent scenario); success returns the session with the resolved
 * event plus per-cluster `DamageApplied` events appended.
 */
export function dispatchVibroClawAttack(
  input: IVibroClawDispatchInput,
): VibroClawDispatchResult {
  const attacker = input.session.currentState.units[input.squadId];
  const target = input.session.currentState.units[input.targetUnitId];
  if (!attacker || !target || attacker.destroyed || target.destroyed) {
    return { ok: false, reason: 'unit-not-found' };
  }

  const combatState = attacker.combatState;
  if (!combatState || combatState.kind !== 'squad') {
    return { ok: false, reason: 'attacker-not-squad' };
  }
  const squadState = combatState.state;
  if (!squadState.hasVibroClaws || squadState.vibroClawCount < 1) {
    return { ok: false, reason: 'no-vibro-claws' };
  }

  if (hexDistance(attacker.position, target.position) > 1) {
    return { ok: false, reason: 'not-adjacent' };
  }

  if (
    target.combatState &&
    UNSUPPORTED_TARGET_KINDS.has(target.combatState.kind)
  ) {
    return { ok: false, reason: 'unsupported-target-type' };
  }

  const resolution = resolveVibroClawAttack({
    state: squadState,
    targetType: 'mech',
    diceRoller: input.d6Roller,
  });

  const { turn, phase } = input.session.currentState;
  let session = appendEvent(
    input.session,
    createVibroClawAttackResolvedEvent({
      gameId: input.session.id,
      sequence: input.session.events.length,
      turn,
      phase,
      unitId: input.squadId,
      targetUnitId: input.targetUnitId,
      damage: resolution.totalDamage,
      missileHits: resolution.missileHits,
      vibroClawCount: resolution.claws,
      survivingTroopers: resolution.survivingTroopers,
    }),
  );

  // Apply each claw-sized cluster through the standard damage pipeline,
  // re-reading the target state between clusters so armor depletion from
  // the previous cluster carries forward (the DamageApplied reducer
  // updates currentState on every append).
  for (const clusterDamage of resolution.clusters) {
    const targetState = session.currentState.units[input.targetUnitId];
    if (!targetState || targetState.destroyed) break;

    const hitLocation = determineHitLocation(
      FiringArc.Front,
      input.d6Roller,
    ).location;

    const damageResult = resolveDamage(
      buildDamageStateFromUnit(targetState),
      hitLocation as CombatLocation,
      clusterDamage,
    );

    for (const locationDamage of damageResult.result.locationDamages) {
      session = appendEvent(
        session,
        createDamageAppliedEvent({
          gameId: session.id,
          sequence: session.events.length,
          turn,
          unitId: input.targetUnitId,
          location: locationDamage.location,
          damage: locationDamage.damage,
          armorRemaining: locationDamage.armorRemaining,
          structureRemaining: locationDamage.structureRemaining,
          locationDestroyed: locationDamage.destroyed,
        }),
      );
    }
  }

  return {
    ok: true,
    session,
    totalDamage: resolution.totalDamage,
    missileHits: resolution.missileHits,
  };
}
