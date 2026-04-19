/**
 * ProtoMech Combat Dispatch
 *
 * High-level orchestrator: given a pre-resolved hit location + damage +
 * optional proto-specific flags, this runs the full proto combat pipeline:
 *   1. Apply damage (armor → structure, no transfer).
 *   2. If airborne Glider took structure damage → fall check.
 *   3. If TAC or structure-exposing → crit roll.
 *   4. Aggregate events (ProtoLocationDestroyed, ProtoEngineHit, GliderFall,
 *      ProtoUnitDestroyed, ...).
 *
 * The caller still picks WHAT to hit (hit-location module) and WHEN (phase
 * manager). Dispatch only wires the proto-side sub-resolvers together.
 *
 * @spec openspec/changes/add-protomech-combat-behavior/specs/combat-resolution/spec.md
 *   #requirement protomech-combat-dispatch
 * @spec openspec/changes/add-protomech-combat-behavior/tasks.md §1
 */

import type { IProtoHitLocationResult } from './hitLocation';
import type { IProtoMechCombatState } from './state';

import { D6Roller, defaultD6Roller } from '../diceTypes';
import {
  IProtoCritEffectResult,
  protoCritShouldTrigger,
  protoMechResolveCriticalHit,
} from './criticalHits';
import { IProtoResolveDamageResult, protoMechResolveDamage } from './damage';
import { ProtoEvent } from './events';
import {
  IGliderFallResult,
  applyGliderFall,
  gliderFallCheckRequired,
  resolveGliderFallCheck,
} from './glider';

// =============================================================================
// Dispatch input / output
// =============================================================================

export interface IProtoDispatchInput {
  readonly state: IProtoMechCombatState;
  readonly hit: IProtoHitLocationResult;
  readonly damage: number;
  /** Independent D6 roller for crit rolls. Defaults to `defaultD6Roller`. */
  readonly critDiceRoller?: D6Roller;
  /** Independent D6 roller for glider fall checks. */
  readonly fallDiceRoller?: D6Roller;
}

export interface IProtoDispatchResult {
  readonly state: IProtoMechCombatState;
  readonly damageResult: IProtoResolveDamageResult;
  readonly critResult?: IProtoCritEffectResult;
  readonly fallResult?: IGliderFallResult;
  /** Concatenated events from every sub-resolver (in application order). */
  readonly events: readonly ProtoEvent[];
  readonly unitDestroyed: boolean;
}

/**
 * Run the proto combat pipeline end-to-end. This is what the GameEngine
 * calls once it has selected a proto target and rolled a hit location.
 */
export function dispatchProtoCombat(
  input: IProtoDispatchInput,
): IProtoDispatchResult {
  const critRoller = input.critDiceRoller ?? defaultD6Roller;
  const fallRoller = input.fallDiceRoller ?? defaultD6Roller;

  // 1. Damage.
  const damageResult = protoMechResolveDamage(
    input.state,
    input.hit,
    input.damage,
  );

  const events: ProtoEvent[] = [...damageResult.events];
  let state = damageResult.state;

  // 2. Glider fall check — only if the proto survived and is airborne Glider
  //    and structure was exposed.
  let fallResult: IGliderFallResult | undefined;
  if (
    !state.destroyed &&
    gliderFallCheckRequired({
      chassisType: state.chassisType,
      altitude: state.altitude,
      structureExposed: damageResult.locationDamage.structureExposed,
    })
  ) {
    const check = resolveGliderFallCheck(state, fallRoller);
    fallResult = applyGliderFall(state, check);
    state = fallResult.state;
    for (const e of fallResult.events) events.push(e);
  }

  // 3. Crit roll — triggered by TAC OR structure-exposing damage. Skip when
  //    the proto is already destroyed.
  let critResult: IProtoCritEffectResult | undefined;
  if (
    !state.destroyed &&
    protoCritShouldTrigger({
      isTAC: input.hit.isTAC,
      structureExposed: damageResult.locationDamage.structureExposed,
    })
  ) {
    critResult = protoMechResolveCriticalHit(
      state,
      { location: damageResult.locationDamage.location },
      critRoller,
    );
    state = critResult.state;
    for (const e of critResult.events) events.push(e);
  }

  return {
    state,
    damageResult,
    critResult,
    fallResult,
    events,
    unitDestroyed: state.destroyed,
  };
}
