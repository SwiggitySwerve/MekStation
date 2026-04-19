/**
 * ProtoMech Critical Hit Resolution
 *
 * 2d6 proto critical-hit table + effect application. The proto crit table is
 * simpler than the mech table:
 *   2-7  = no critical
 *   8-9  = random equipment destroyed at the hit location
 *   10-11 = engine hit (1st = -1 MP, 2nd = engine destroyed → proto destroyed)
 *   12   = pilot killed (proto abandoned, counts as destroyed)
 *
 * Crits trigger on TAC rolls (natural 2 on hit location) or on damage that
 * breaks past armor and exposes structure.
 *
 * @spec openspec/changes/add-protomech-combat-behavior/specs/combat-resolution/spec.md
 *   #requirement protomech-critical-hit-table
 * @spec openspec/changes/add-protomech-combat-behavior/tasks.md §5
 */

import { ProtoLocation } from '@/types/unit/ProtoMechInterfaces';

import type { IProtoMechCombatState } from './state';

import { D6Roller, defaultD6Roller, roll2d6 } from '../diceTypes';
import { ProtoEvent, ProtoEventType } from './events';

// =============================================================================
// Crit table
// =============================================================================

/**
 * Kind of proto crit per TW-inspired proto crit table.
 */
export type ProtoCritKind =
  | 'none'
  | 'equipment'
  | 'engine_hit'
  | 'pilot_killed';

/**
 * Result of a proto crit-table roll.
 */
export interface IProtoCritRollResult {
  readonly dice: readonly [number, number];
  readonly roll: number;
  readonly kind: ProtoCritKind;
}

/**
 * Resolve a proto crit from a pre-determined 2d6 result.
 */
export function protoCritFromRoll(
  dice: readonly [number, number],
): IProtoCritRollResult {
  const [d1, d2] = dice;
  const roll = d1 + d2;

  let kind: ProtoCritKind;
  if (roll <= 7) kind = 'none';
  else if (roll <= 9) kind = 'equipment';
  else if (roll <= 11) kind = 'engine_hit';
  else kind = 'pilot_killed';

  return { dice: [d1, d2], roll, kind };
}

/**
 * Roll 2d6 and classify the proto crit.
 */
export function rollProtoCrit(
  diceRoller: D6Roller = defaultD6Roller,
): IProtoCritRollResult {
  const rolled = roll2d6(diceRoller);
  return protoCritFromRoll([rolled.dice[0], rolled.dice[1]]);
}

// =============================================================================
// Crit trigger predicate
// =============================================================================

/**
 * True when a hit should trigger a proto crit roll. Per task 5.1:
 *   - TAC (natural 2) always triggers a crit.
 *   - Structure-exposing damage (armor broken) also triggers.
 */
export function protoCritShouldTrigger(params: {
  readonly isTAC: boolean;
  readonly structureExposed: boolean;
}): boolean {
  return params.isTAC || params.structureExposed;
}

// =============================================================================
// Crit effect application
// =============================================================================

export interface IProtoCritEffectContext {
  /** Location the underlying hit struck (for ComponentDestroyed events). */
  readonly location: ProtoLocation;
}

export interface IProtoCritEffectResult {
  readonly state: IProtoMechCombatState;
  readonly applied: IProtoCritRollResult;
  readonly events: readonly ProtoEvent[];
}

/**
 * Apply a rolled proto crit to combat state.
 */
export function applyProtoCritEffect(
  state: IProtoMechCombatState,
  crit: IProtoCritRollResult,
  ctx: IProtoCritEffectContext,
): IProtoCritEffectResult {
  if (state.destroyed) {
    return { state, applied: crit, events: [] };
  }

  const events: ProtoEvent[] = [];
  let next: IProtoMechCombatState = state;

  switch (crit.kind) {
    case 'none':
      return { state, applied: crit, events: [] };

    case 'equipment': {
      // Equipment destroyed at the hit location. The equipment subsystem
      // picks WHICH item is destroyed — combat state just records the event.
      events.push({
        type: ProtoEventType.PROTO_COMPONENT_DESTROYED,
        unitId: state.unitId,
        location: ctx.location,
        component: 'equipment',
      });
      break;
    }

    case 'engine_hit': {
      const newEngineHits = state.engineHits + 1;
      const engineDestroyed = newEngineHits >= 2;
      const newMpPenalty = engineDestroyed
        ? state.mpPenalty
        : state.mpPenalty + 1;
      next = {
        ...state,
        engineHits: newEngineHits,
        mpPenalty: newMpPenalty,
        destroyed: engineDestroyed ? true : state.destroyed,
        destructionCause: engineDestroyed
          ? 'engine_destroyed'
          : state.destructionCause,
      };
      events.push({
        type: ProtoEventType.PROTO_ENGINE_HIT,
        unitId: state.unitId,
        engineHits: newEngineHits,
        engineDestroyed,
      });
      if (engineDestroyed) {
        events.push({
          type: ProtoEventType.PROTO_UNIT_DESTROYED,
          unitId: state.unitId,
          cause: 'engine_destroyed',
        });
      }
      break;
    }

    case 'pilot_killed': {
      next = {
        ...state,
        destroyed: true,
        destructionCause: 'pilot_killed',
      };
      events.push({
        type: ProtoEventType.PROTO_PILOT_KILLED,
        unitId: state.unitId,
      });
      events.push({
        type: ProtoEventType.PROTO_UNIT_DESTROYED,
        unitId: state.unitId,
        cause: 'pilot_killed',
      });
      break;
    }
  }

  return { state: next, applied: crit, events };
}

/**
 * Roll + apply a proto crit in one call.
 */
export function protoMechResolveCriticalHit(
  state: IProtoMechCombatState,
  ctx: IProtoCritEffectContext,
  diceRoller: D6Roller = defaultD6Roller,
): IProtoCritEffectResult {
  const rolled = rollProtoCrit(diceRoller);
  return applyProtoCritEffect(state, rolled, ctx);
}
