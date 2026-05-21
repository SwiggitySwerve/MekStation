/**
 * Battle Armor Combat — §1 squad state helpers + §2 damage allocation.
 *
 * This module is the canonical compute layer for the new `IBASquadCombatState`
 * / `ITrooperState` shape defined in `CombatInterfaces.ts`.  It intentionally
 * does NOT import the older `IBattleArmorCombatState` shape from
 * `BattleArmorCombatInterfaces.ts` — the two shapes co-exist during migration;
 * future PRs will consolidate.
 *
 * Swarm attach/fire (§3-§4) and leg/vibroclaw/brush-off (§5-§8) are deferred
 * to PR-L2, PR-L3, and PR-L4 respectively.
 *
 * @spec openspec/changes/add-battle-armor-combat/specs/battle-armor-combat/spec.md
 * @spec openspec/changes/add-battle-armor-combat/specs/combat-resolution/spec.md
 */

import type {
  BACombatEvent,
  IBASquadCombatState,
  ITrooperState,
} from '@/types/gameplay';

import { D6Roller, defaultD6Roller } from '@/utils/gameplay/diceTypes';

// =============================================================================
// §1 — Squad state helpers
// =============================================================================

/**
 * Return the number of troopers currently alive in the squad.
 * Dead troopers are retained at their index with `alive: false`; this counts
 * only those that are still fighting.
 */
export function getNumberActiveTroopers(state: IBASquadCombatState): number {
  let count = 0;
  for (const t of state.troopers) {
    if (t.alive) count++;
  }
  return count;
}

/**
 * Return true when less than 90% of the original squad size is alive.
 * Mirrors MegaMek `BattleArmor.getDamageLevel` DAMAGE_LIGHT threshold.
 *
 * `squadSize` is derived from `state.troopers.length` (the initial allocation
 * never shrinks — dead troopers are retained).
 */
export function isDmgLight(state: IBASquadCombatState): boolean {
  const squadSize = state.troopers.length;
  if (squadSize === 0) return false;
  return getNumberActiveTroopers(state) / squadSize < 0.9;
}

/**
 * Return true when less than 75% of the original squad size is alive.
 * Mirrors MegaMek `BattleArmor.getDamageLevel` DAMAGE_MODERATE threshold.
 */
export function isDmgModerate(state: IBASquadCombatState): boolean {
  const squadSize = state.troopers.length;
  if (squadSize === 0) return false;
  return getNumberActiveTroopers(state) / squadSize < 0.75;
}

// =============================================================================
// §2 — Squad damage allocation
// =============================================================================

/**
 * A single damage point allocated to one trooper, including whether the
 * Tactical Operations crit-slot rule triggered on this hit.
 */
export interface IBATrooperAllocation {
  readonly trooperIndex: number;
  readonly damage: number;
  readonly criticalHit: boolean;
}

/**
 * Options controlling `allocateSquadDamage` behaviour.
 */
export interface IAllocateSquadDamageOptions {
  /**
   * When true, two consecutive rolls that land on the same trooper index
   * trigger `criticalHit: true` on the second hit — provided the attacker is
   * NOT conventional infantry.  Mirrors MegaMek game option
   * `ADVANCED_COMBAT_TAC_OPS_BA_CRITICAL_SLOTS`.
   */
  readonly tacOpsCritSlots: boolean;
  /**
   * Set true when the attacker unit is conventional infantry so the TacOps
   * crit-slot rule is suppressed even when `tacOpsCritSlots` is enabled.
   */
  readonly isAttackingConvInfantry?: boolean;
}

/**
 * Full result of one damage resolution call against a BA squad.
 *
 * `allocations` describes how each damage point was distributed (one entry per
 * point of `totalDamage`).  `events` contains `BATrooperKilled` events for any
 * trooper whose armor dropped to 0 during this call; they are ordered by the
 * kill sequence so callers can emit them in the correct event-log order.
 *
 * The returned `squad` is the mutated copy — callers MUST replace the
 * session's squad state with this value.
 */
export interface IAllocateSquadDamageResult {
  /** Updated squad state after all damage has been applied. */
  readonly squad: IBASquadCombatState;
  /** One entry per damage point in `totalDamage`. */
  readonly allocations: readonly IBATrooperAllocation[];
  /** `BATrooperKilled` events emitted during this resolution, oldest first. */
  readonly events: BACombatEvent[];
}

/**
 * Allocate `totalDamage` points of incoming damage across the troopers of
 * `squad`.  Each point is assigned by rolling a d6 — roll result is mapped
 * to a trooper index via `(rollResult - 1) % squad.troopers.length`; dead
 * troopers are re-rolled until an alive trooper is selected.
 *
 * When a trooper's `armorRemaining` reaches 0 the trooper is marked
 * `alive: false` and a `BATrooperKilled` event is pushed.  Excess damage
 * beyond the trooper's remaining armor is discarded (per TW anti-infantry
 * rule — each damage point kills at most one trooper).
 *
 * The TacOps crit-slot rule fires when ALL of:
 *   - `options.tacOpsCritSlots === true`
 *   - The previous allocation landed on the SAME trooper index
 *   - The attacker is NOT conventional infantry
 */
export function allocateSquadDamage(
  squad: IBASquadCombatState,
  totalDamage: number,
  rng: D6Roller = defaultD6Roller,
  options: IAllocateSquadDamageOptions = { tacOpsCritSlots: false },
): IAllocateSquadDamageResult {
  // Work on a shallow-cloned copy so each trooper's mutable fields can be
  // updated in-place without touching the caller's original reference.
  const troopers: ITrooperState[] = squad.troopers.map((t) => ({ ...t }));
  const updatedSquad: IBASquadCombatState = { ...squad, troopers };

  const allocations: IBATrooperAllocation[] = [];
  const events: BACombatEvent[] = [];

  let previousTrooperIndex: number | null = null;

  for (let i = 0; i < totalDamage; i++) {
    // Find an alive trooper to receive this damage point, re-rolling on dead
    // slots.  Guard against a fully-destroyed squad (all dead).
    const trooperIndex = selectAliveTrooper(troopers, rng);
    if (trooperIndex === -1) {
      // Squad wiped out mid-allocation — remaining damage is discarded.
      break;
    }

    // Tactical Operations crit-slot rule: second consecutive hit on the same
    // trooper triggers a critical when the option is enabled and the attacker
    // is not conventional infantry.
    const criticalHit =
      options.tacOpsCritSlots &&
      !options.isAttackingConvInfantry &&
      previousTrooperIndex === trooperIndex;

    // Apply 1 damage point to the trooper.
    const trooper = troopers[trooperIndex];
    trooper.armorRemaining = Math.max(0, trooper.armorRemaining - 1);

    // Kill the trooper when armor is exhausted.
    if (trooper.armorRemaining === 0 && trooper.alive) {
      trooper.alive = false;
      events.push({
        kind: 'BATrooperKilled',
        squadId: squad.swarmingUnitId ?? '',
        trooperIndex,
      });
    }

    allocations.push({ trooperIndex, damage: 1, criticalHit });
    previousTrooperIndex = trooperIndex;
  }

  return { squad: updatedSquad, allocations, events };
}

// =============================================================================
// Internal helpers
// =============================================================================

/**
 * Roll a d6 (with re-rolls) until a living trooper is selected.  Returns the
 * 0-based index into `troopers`, or -1 if no troopers are alive.
 *
 * The d6 result is mapped to a trooper slot via `(roll - 1) % troopers.length`
 * which gives a uniform distribution over slots 0..(n-1) for squad sizes 1–6.
 */
function selectAliveTrooper(
  troopers: readonly ITrooperState[],
  rng: D6Roller,
): number {
  const anyAlive = troopers.some((t) => t.alive);
  if (!anyAlive) return -1;

  // Re-roll up to a generous bound to avoid infinite loops in degenerate tests.
  for (let attempt = 0; attempt < 100; attempt++) {
    const roll = rng(); // 1–6
    const idx = (roll - 1) % troopers.length;
    if (troopers[idx].alive) return idx;
  }

  // Fallback: linear scan for the first alive trooper (deterministic safety).
  for (let j = 0; j < troopers.length; j++) {
    if (troopers[j].alive) return j;
  }

  return -1;
}
