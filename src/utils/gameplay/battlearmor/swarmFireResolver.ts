/**
 * BA swarm-fire-while-attached phase-advance resolver (PR-L2 step 3).
 *
 * Drives the per-turn auto-fire pulse for every BA squad that is currently
 * attached to a host mek via the older `IBattleArmorCombatState.swarmingUnitId`
 * pointer (the production plumbing established by the prior
 * `add-battlearmor-combat-behavior` change).  The resolver synthesizes a
 * thin `IBASquadCombatState` view from the older shape so it can drive
 * `calculateSwarmDamage` (the PR-L formula in `src/lib/combat/baCombat.ts`)
 * and then emits one `SwarmDamage` event per attached squad.
 *
 * Determinism:
 *   - Squads are processed in lexical order of their unit id.  The natural
 *     `Object.keys(units)` order is not deterministic across engines, so
 *     we explicitly sort before iterating.  Spec scenarios that pre-seed
 *     two swarmers and expect a stable event order rely on this.
 *
 * Caller-supplied callbacks:
 *   - `getSquadWeapons(squadId, unit)` returns the swarm-eligible weapons
 *     for the squad — caller pre-filters to non-missile, non-body-mounted,
 *     non-InfantryAttack.  Returning an empty array is valid and degenerates
 *     to vibroclaw / myomer-only damage (which may be 0; the action then
 *     no-ops).
 *   - `getHostLocationLabel(squadId, hostId)` picks the host location label
 *     stamped on the emitted event.  Production callers route this through
 *     the PR-L mounted-trooper adapter (CT-front/back, LT, RT — first
 *     attached trooper's slot).  The integration test stubs a fixed label.
 *
 * @spec openspec/changes/add-battle-armor-combat/specs/battle-armor-combat/spec.md
 *   (Requirement: Swarm Fire While Attached)
 */

import type {
  IBASquadCombatState,
  IBattleArmorCombatState,
  IGameSession,
  IUnitGameState,
} from '@/types/gameplay';

import { applyInteractiveSessionSwarmFire } from '@/engine/InteractiveSession.actions';
import { type IBASwarmFireSquadDef } from '@/lib/combat/baCombat';

/**
 * Inputs for `resolveSwarmFireForAttachedSquads` — the live session plus the
 * caller-supplied callbacks that source per-squad weapon and host-location
 * data the engine cannot infer on its own.
 */
export interface IResolveSwarmFireOptions {
  /**
   * Return the swarm-eligible weapons + squad-level flags for the attached
   * BA squad whose unit id is `squadId`.  Caller is responsible for
   * filtering out missile / body-mounted / InfantryAttack weapons before
   * returning — the formula trusts whatever it gets.  Returning `null`
   * skips the squad entirely (no event emitted).
   */
  readonly getSquadDef: (
    squadId: string,
    unitState: IUnitGameState,
  ) => IBASwarmFireSquadDef | null;
  /**
   * Pick the location label for the emitted `SwarmDamage` event.  Production
   * callers route this through the PR-L mounted-trooper adapter — by
   * convention, the first attached trooper's slot.  Defaults to
   * `'Center Torso'` when the option is omitted, so smoke tests that don't
   * care about the label can stay terse.
   */
  readonly getHostLocationLabel?: (squadId: string, hostId: string) => string;
}

/**
 * Synthesize an `IBASquadCombatState` view from the older
 * `IBattleArmorCombatState` shape so the PR-L `calculateSwarmDamage`
 * formula can read it without a migration.  The two shapes co-exist
 * during PR-L / PR-L2 — see the header comment of `src/lib/combat/baCombat.ts`.
 */
function adaptOldSquadState(
  old: IBattleArmorCombatState,
  hostId: string,
): IBASquadCombatState {
  const troopers = old.troopers.map((t, i) => ({
    index: i + 1,
    alive: t.alive && t.armorRemaining > 0,
    armorRemaining: t.armorRemaining,
    equipmentDestroyed: [...t.equipmentDestroyed],
  }));
  return {
    troopers,
    swarmingUnitId: hostId,
    swarmedByUnitIds: [],
    mountedOn: undefined,
    mimeticActiveThisTurn: old.mimeticActiveThisTurn,
    stealthActiveThisTurn: false,
  };
}

/**
 * Resolve one tick of swarm fire for every BA squad currently attached
 * to a host mek.  Returns a new session with `SwarmDamage` events appended
 * (one per attached squad with non-zero computed damage).
 *
 * Iteration order is lexical by squad unit id so the resulting event
 * sequence is deterministic across runs — required by replay-stability
 * regressions and the spec scenarios that expect a stable per-tick order.
 *
 * No-ops cleanly when the session has zero attached swarmers (no event
 * stream pollution).
 */
export function resolveSwarmFireForAttachedSquads(
  session: IGameSession,
  options: IResolveSwarmFireOptions,
): IGameSession {
  const units = session.currentState.units;
  // Determinism: sort by squad id before iterating.  Object.keys ordering
  // is engine-dependent for non-numeric-string keys, and replay tests rely
  // on a stable per-tick event order.
  const squadIds = Object.keys(units).sort();

  let current = session;
  for (const squadId of squadIds) {
    const unit = units[squadId];
    if (!unit || unit.destroyed) continue;

    // Only BA squad combat-state envelopes carry `swarmingUnitId`.
    const cs = unit.combatState;
    if (!cs || cs.kind !== 'squad') continue;

    const oldSquadState = cs.state;
    const hostId = oldSquadState.swarmingUnitId;
    if (!hostId) continue;

    const host = current.currentState.units[hostId];
    if (!host || host.destroyed) continue;

    const squadDef = options.getSquadDef(squadId, unit);
    if (!squadDef) continue;

    const squadView = adaptOldSquadState(oldSquadState, hostId);
    const hostLocationLabel =
      options.getHostLocationLabel?.(squadId, hostId) ?? 'Center Torso';

    current = applyInteractiveSessionSwarmFire({
      session: current,
      squadId,
      hostUnitId: hostId,
      squad: squadView,
      squadDef,
      hostLocationLabel,
    });
  }

  return current;
}
