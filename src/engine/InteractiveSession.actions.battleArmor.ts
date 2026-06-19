import type { IGameSession } from '@/types/gameplay/GameSessionInterfaces';

import {
  calculateSwarmDamage,
  type IBALegAttackSquadDef,
  type IBASwarmFireSquadDef,
} from '@/lib/combat/baCombat';
import {
  createLegAttackResolvedEvent,
  createSwarmDamageEvent,
} from '@/utils/gameplay/gameEvents/battleArmor';
import { appendEvent } from '@/utils/gameplay/gameSession';

export interface IApplySwarmFireInput {
  readonly session: IGameSession;
  /** Attacker (BA squad) unit id. */
  readonly squadId: string;
  /** Host (mek) unit id being swarmed. */
  readonly hostUnitId: string;
  /** Squad combat state (new IBASquadCombatState shape). */
  readonly squad: import('@/types/gameplay').IBASquadCombatState;
  /** Pre-filtered swarm-eligible weapons + vibroclaw / myomer flags. */
  readonly squadDef: IBASwarmFireSquadDef;
  /**
   * Host location label to stamp on the SwarmDamage event.  Caller picks
   * this via the PR-L mounted-trooper adapter — front-trooper slots resolve
   * to front locations; rear-trooper slots to rear locations.
   */
  readonly hostLocationLabel: string;
}

/**
 * Resolve one tick of swarm fire from `squadId` against `hostUnitId`.
 *
 * Computes damage via `calculateSwarmDamage` and appends a single
 * `SwarmDamage` event (using the established `createSwarmDamageEvent`
 * factory from the prior `add-battlearmor-combat-behavior` change — its
 * `unitId / targetUnitId / damage / locationLabel` shape exactly matches
 * what this action needs).
 *
 * Returns the original session unchanged when:
 *   - the attacking squad is destroyed (0 active troopers; damage = 0),
 *   - OR the host or squad units cannot be found in `session.currentState`.
 *
 * Otherwise returns the session with one new `SwarmDamage` event appended.
 * The action handler is intentionally side-effect-free beyond appending
 * the event; damage application to the host mek's armor pipeline lives
 * downstream (PR-L3 wires the dispatch layer that consumes this event).
 */
export function applyInteractiveSessionSwarmFire(
  input: IApplySwarmFireInput,
): IGameSession {
  const attackerUnit = input.session.currentState.units[input.squadId];
  const hostUnit = input.session.currentState.units[input.hostUnitId];
  if (!attackerUnit || !hostUnit) return input.session;

  const damage = calculateSwarmDamage(input.squad, input.squadDef);
  if (damage <= 0) return input.session;

  const sequence = input.session.events.length;
  const { turn, phase } = input.session.currentState;
  const event = createSwarmDamageEvent(
    input.session.id,
    sequence,
    turn,
    phase,
    input.squadId,
    input.hostUnitId,
    damage,
    input.hostLocationLabel,
  );

  return appendEvent(input.session, event);
}
// =============================================================================
// PR-L3 §3 — BA leg-attack action handler (Mek + Vehicle targets)
// =============================================================================

/**
 * Inputs for `applyInteractiveSessionLegAttack`. The action handler is
 * intentionally thin — it does NOT pick the rolled leg, does NOT compute
 * the firing arc, and does NOT apply damage to the target's armor. Those
 * concerns live in `resolveMekLegAttack` / `resolveVehicleLegAttack`
 * (in `src/utils/gameplay/battlearmor/legAttackResolver.ts`) and the
 * downstream damage pipeline that consumes the emitted
 * `LegAttackResolved` event.
 *
 * Callers (the dispatch layer) MUST:
 *   1. confirm the attack is legal (squad in same hex as target, etc.),
 *   2. build `squadDef` with the squad's vibroclaw / myomer flags,
 *   3. supply the pre-resolved `ILegAttackResolution` from the resolver
 *      (carries hit / damage / hitLocation / critModifier).
 *
 * Pattern mirror: `applyInteractiveSessionSwarmFire` (PR-L2 §3).
 *
 * @spec openspec/changes/add-battle-armor-combat/specs/battle-armor-combat/spec.md
 *   (Requirement: Leg Attack)
 */
export interface IApplyLegAttackInput {
  readonly session: IGameSession;
  /** Attacker (BA squad) unit id. */
  readonly squadId: string;
  /** Target Mek or Vehicle unit id. */
  readonly targetUnitId: string;
  /**
   * Pre-resolved leg-attack outcome from `resolveMekLegAttack` /
   * `resolveVehicleLegAttack`. The action handler stamps these fields
   * onto the emitted `LegAttackResolved` event.
   */
  readonly resolution: import('@/utils/gameplay/battlearmor/legAttackResolver').ILegAttackResolution;
  /** Surviving troopers in the attacking squad after the resolution. */
  readonly survivingTroopers: number;
}

/**
 * Resolve one BA leg attack from `squadId` against `targetUnitId`.
 *
 * Appends a single `LegAttackResolved` event carrying the pre-resolved
 * outcome. Returns the original session unchanged when the attacking
 * squad or target unit cannot be found.
 *
 * The action handler is intentionally side-effect-free beyond appending
 * the event; damage application to the target's armor pipeline (Mek leg
 * armor or Vehicle arc armor) lives downstream in the dispatch layer
 * that consumes this event. The squad's attack action is considered
 * consumed in BOTH the hit and clean-miss cases.
 */
export function applyInteractiveSessionLegAttack(
  input: IApplyLegAttackInput,
): IGameSession {
  const attackerUnit = input.session.currentState.units[input.squadId];
  const targetUnit = input.session.currentState.units[input.targetUnitId];
  if (!attackerUnit || !targetUnit) return input.session;

  const sequence = input.session.events.length;
  const { turn, phase } = input.session.currentState;
  const event = createLegAttackResolvedEvent(
    input.session.id,
    sequence,
    turn,
    phase,
    input.squadId,
    input.targetUnitId,
    input.resolution.hit,
    input.resolution.damage,
    input.resolution.hitLocation,
    input.resolution.critModifier,
    input.survivingTroopers,
  );

  return appendEvent(input.session, event);
}

// Re-export the squad-def type so callers can build it without reaching
// into `@/lib/combat/baCombat` directly. Mirrors the IBASwarmFireSquadDef
// re-export pattern established by PR-L2.
export type { IBALegAttackSquadDef };
