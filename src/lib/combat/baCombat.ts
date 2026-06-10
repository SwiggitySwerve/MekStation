/**
 * Battle Armor Combat — §1 squad state helpers + §2 damage allocation +
 * §4 swarm-fire damage formula.
 *
 * This module is the canonical compute layer for the new `IBASquadCombatState`
 * / `ITrooperState` shape defined in `CombatInterfaces.ts`.  It intentionally
 * does NOT import the older `IBattleArmorCombatState` shape from
 * `BattleArmorCombatInterfaces.ts` — the two shapes co-exist during migration;
 * future PRs will consolidate.
 *
 * §3 swarm attach to-hit + state-machine, §5 mounted-trooper adapter,
 * §6 leg attack, §7 vibroclaw, and §8 brush-off / dislodge are deferred
 * to PR-L3 and PR-L4 respectively.
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
   * When true, each hit rolls a SECOND confirmation d6 after trooper
   * selection; the hit is `criticalHit: true` when the confirmation matches
   * the selection roll — provided the attacker is NOT conventional infantry.
   * Mirrors MegaMek game option `ADVANCED_COMBAT_TAC_OPS_BA_CRITICAL_SLOTS`
   * (TO:AR p.108, `BattleArmor.rollHitLocation`; audit C-10).
   */
  readonly tacOpsCritSlots: boolean;
  /**
   * Set true when the attacker unit is conventional infantry so the TacOps
   * crit-slot rule is suppressed even when `tacOpsCritSlots` is enabled.
   * The confirmation d6 is still consumed (mirrors MegaMek's short-circuit
   * evaluation order) — only the crit outcome is suppressed.
   */
  readonly isAttackingConvInfantry?: boolean;
  /**
   * Unit id of the BA squad taking the damage. Stamped onto emitted
   * `BATrooperKilled` events as `squadId` (audit C-11 — previously the HOST
   * mech id leaked into that field). The squad shape itself does not carry
   * its own unit id, so callers thread it through here.
   */
  readonly squadId?: string;
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
 * `squad`.  Each point is assigned by rolling a d6 mapped DIRECTLY to a
 * trooper slot (`roll - 1`); rolls that point past the last trooper or at a
 * dead trooper are re-rolled until a living trooper is selected. This mirrors
 * MegaMek `BattleArmor.rollHitLocation` — the previous modulo reduction
 * biased damage 2× onto low-index troopers in 4/5-trooper squads (audit C-9).
 *
 * When a trooper's `armorRemaining` reaches 0 the trooper is marked
 * `alive: false` and a `BATrooperKilled` event is pushed.  Excess damage
 * beyond the trooper's remaining armor is discarded (per TW anti-infantry
 * rule — each damage point kills at most one trooper).
 *
 * The TacOps crit-slot rule (TO:AR p.108; audit C-10) fires when ALL of:
 *   - `options.tacOpsCritSlots === true`
 *   - A SECOND confirmation d6 equals the selection roll
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

  for (let i = 0; i < totalDamage; i++) {
    // Find an alive trooper to receive this damage point, re-rolling on dead
    // or out-of-range slots.  Guard against a fully-destroyed squad.
    const selection = selectAliveTrooper(troopers, rng);
    if (selection === null) {
      // Squad wiped out mid-allocation — remaining damage is discarded.
      break;
    }
    const trooperIndex = selection.trooperIndex;

    // Tactical Operations crit-slot rule (TO:AR p.108, audit C-10): roll a
    // SECOND d6; the hit is a critical when it matches the selection roll and
    // the attacker is not conventional infantry. The confirmation die is
    // consumed whenever the option is enabled — mirrors the short-circuit
    // evaluation order in MegaMek `BattleArmor.rollHitLocation`.
    let criticalHit = false;
    if (options.tacOpsCritSlots) {
      const confirmRoll = rng();
      criticalHit =
        confirmRoll === selection.roll && !options.isAttackingConvInfantry;
    }

    // Apply 1 damage point to the trooper.
    const trooper = troopers[trooperIndex];
    trooper.armorRemaining = Math.max(0, trooper.armorRemaining - 1);

    // Kill the trooper when armor is exhausted.
    if (trooper.armorRemaining === 0 && trooper.alive) {
      trooper.alive = false;
      events.push({
        kind: 'BATrooperKilled',
        // Audit C-11: squadId carries the BA squad's OWN unit id (threaded by
        // the caller) — never the host mech id. The host, when the squad is
        // swarming, is reported separately via hostId.
        squadId: options.squadId ?? '',
        trooperIndex,
        hostId: squad.swarmingUnitId,
      });
    }

    allocations.push({ trooperIndex, damage: 1, criticalHit });
  }

  return { squad: updatedSquad, allocations, events };
}

// =============================================================================
// Internal helpers
// =============================================================================

/**
 * Result of one trooper-selection roll sequence: the 0-based index of the
 * living trooper hit, plus the raw d6 value that selected it (needed by the
 * TacOps crit confirmation, which compares raw d6 location values).
 */
interface ITrooperSelection {
  readonly trooperIndex: number;
  readonly roll: number;
}

/**
 * Roll a d6 (with re-rolls) until a living trooper is selected.  Returns the
 * selection (index + raw roll), or null if no troopers are alive.
 *
 * Per MegaMek `BattleArmor.rollHitLocation` (audit C-9): the d6 maps DIRECTLY
 * to a trooper slot (`roll - 1`); rolls past the last trooper or onto a dead
 * trooper are re-rolled. No modulo reduction — that wrapped rolls 5/6 onto
 * troopers 0/1 and biased damage 2× in 4/5-trooper squads.
 */
function selectAliveTrooper(
  troopers: readonly ITrooperState[],
  rng: D6Roller,
): ITrooperSelection | null {
  const anyAlive = troopers.some((t) => t.alive);
  if (!anyAlive) return null;

  // Re-roll up to a generous bound to avoid infinite loops in degenerate
  // tests (a real d6 terminates with probability 1).
  for (let attempt = 0; attempt < 100; attempt++) {
    const roll = rng(); // 1–6
    const idx = roll - 1;
    if (idx < troopers.length && troopers[idx].alive) {
      return { trooperIndex: idx, roll };
    }
  }

  // Fallback: linear scan for the first alive trooper (deterministic safety).
  // Synthesize the matching raw roll so crit confirmation stays well-defined.
  for (let j = 0; j < troopers.length; j++) {
    if (troopers[j].alive) return { trooperIndex: j, roll: j + 1 };
  }

  return null;
}

// =============================================================================
// §4 — Swarm-fire damage formula (PR-L2)
// =============================================================================

/**
 * Squad-mounted weapon contributing to swarm-fire damage. Only non-missile,
 * non-body-mounted, non-InfantryAttack weapons feed the formula — callers
 * filter the squad's full weapon set before invoking `calculateSwarmDamage`.
 *
 * `damage` is the published per-shot damage value (catalog field) — the
 * formula multiplies it by the squad's active-trooper count (shootingStrength)
 * to scale with squad health.
 */
export interface IBASwarmFireWeapon {
  /** Catalog weapon id (used only for event attribution; not for math). */
  readonly weaponId: string;
  /** Per-shot damage value. */
  readonly damage: number;
}

/**
 * Squad-level loadout fields required by the swarm-fire formula. Kept narrow
 * on purpose: this struct represents what `calculateSwarmDamage` actually
 * reads, not the full BA squad definition (which lives in
 * `IBattleArmorUnit`). Callers extract these from the canonical squad data.
 */
export interface IBASwarmFireSquadDef {
  /** Eligible squad-mounted weapons (already filtered by the caller). */
  readonly weapons: readonly IBASwarmFireWeapon[];
  /**
   * Squad-level vibroclaw count (0, 1, or 2). Adds flat damage equal to the
   * count when > 0 (per MegaMek `SwarmWeaponAttackHandler.calculateSwarmDamage`
   * — vibroclaws contribute the count, not the count × troopers). Matches the
   * spec scenario "Vibroclaws add flat squad damage" (12 + 2 = 14).
   */
  readonly vibroClaws: number;
  /**
   * True when the squad has a Myomer Booster AND it is currently active
   * (booster active = not destroyed and powered on this turn). Adds
   * `activeTroopers × 2` to total damage when true.
   */
  readonly myomerBoosterActive: boolean;
}

/**
 * Pure swarm-fire damage formula for a BA squad attached to a host mek.
 *
 * Formula (per MegaMek `SwarmWeaponAttackHandler.calculateSwarmDamage`
 * referenced in the OMO Council Librarian seat):
 *
 * ```
 * total = sum(weapon.damage × activeTroopers) over squadDef.weapons
 *       + (squadDef.vibroClaws > 0 ? squadDef.vibroClaws : 0)
 *       + (squadDef.myomerBoosterActive ? activeTroopers × 2 : 0)
 * ```
 *
 * Missile, body-mounted, and Infantry-Attack weapons SHALL be excluded —
 * callers filter them out before passing `squadDef.weapons`.
 *
 * Returns 0 when no troopers are alive (a destroyed squad cannot fire).
 *
 * Spec test cases:
 *   - 4-trooper × 1 SmallLaser (3 dmg)                       → 12
 *   - +2 vibroclaws                                          → 14
 *   - +myomer booster active                                 → 22
 *   - 2 of 4 troopers dead (only SmallLaser, no claws/myomer)→ 6
 *
 * @spec openspec/changes/add-battle-armor-combat/specs/battle-armor-combat/spec.md
 *   (Requirement: Swarm Fire While Attached)
 */
export function calculateSwarmDamage(
  squad: IBASquadCombatState,
  squadDef: IBASwarmFireSquadDef,
): number {
  const activeTroopers = getNumberActiveTroopers(squad);
  if (activeTroopers === 0) return 0;

  // Sum per-weapon damage × shootingStrength. Caller has already filtered out
  // missile / body-mounted / InfantryAttack weapons, so every entry in
  // `squadDef.weapons` contributes.
  let weaponSum = 0;
  for (const w of squadDef.weapons) {
    weaponSum += w.damage * activeTroopers;
  }

  // Vibroclaws contribute the squad-level count as flat damage (0, 1, or 2).
  // Spec: "Vibroclaws add flat squad damage" → +2 for a 2-vibroclaw squad.
  const vibroclawBonus = squadDef.vibroClaws > 0 ? squadDef.vibroClaws : 0;

  // Myomer Booster (when active) adds activeTroopers × 2.
  // Spec: "Myomer Booster adds per-trooper damage" → +(4 × 2) = +8 for 4 troopers.
  const myomerBonus = squadDef.myomerBoosterActive ? activeTroopers * 2 : 0;

  return weaponSum + vibroclawBonus + myomerBonus;
}
// =============================================================================
// §5 — Leg-attack damage formula (PR-L3)
// =============================================================================

/**
 * Squad-level loadout fields required by the leg-attack damage formula.
 * Kept narrow on purpose: this struct represents what `calculateLegAttackDamage`
 * actually reads, not the full BA squad definition (which lives in
 * `IBattleArmorUnit`). Callers extract these from the canonical squad data.
 *
 * Distinct from `IBASwarmFireSquadDef`:
 *   - swarm fire trusts a caller-pre-filtered weapon list and scales
 *     per-weapon damage by surviving troopers;
 *   - leg attack has NO per-weapon damage component — it deals a flat
 *     base of 4 plus the squad's vibroclaw count plus an optional myomer
 *     booster bonus that scales with active troopers.
 */
export interface IBALegAttackSquadDef {
  /**
   * Squad-level vibroclaw count. Each vibroclaw adds one flat point of
   * damage to the leg-attack total (matches the spec formula
   * `4 + vibroClaws + ...`). Typical loadouts: 0, 1, 2, or 4 for a
   * 4-trooper squad where every trooper carries a single vibroclaw.
   */
  readonly vibroClaws: number;
  /**
   * True when the squad has a Myomer Booster AND it is currently active
   * (booster active = not destroyed and powered on this turn). Adds
   * `activeTroopers × 2` to total damage when true (matches the spec
   * formula `(myomerBooster ? activeTroopers × 2 : 0)`).
   */
  readonly myomerBoosterActive: boolean;
}

/**
 * Pure leg-attack damage formula for a BA squad performing an anti-mech
 * (or anti-vehicle) leg attack.
 *
 * Formula (per `add-battle-armor-combat` Requirement: Leg Attack):
 *
 * ```
 * total = 4
 *       + squadDef.vibroClaws
 *       + (squadDef.myomerBoosterActive ? activeTroopers × 2 : 0)
 * ```
 *
 * Returns 0 when no troopers are alive (a destroyed squad cannot perform
 * the attack at all — the base-4 component is gated on having at least
 * one surviving trooper, matching the swarm-fire `0 troopers → 0 damage`
 * contract).
 *
 * Spec canonical numbers:
 *   - 4 troopers, no equipment                     → 4   (4 + 0 + 0)
 *   - +1 squad vibroclaw                           → 5   (4 + 1 + 0)
 *   - +4 squad vibroclaws (one per trooper)        → 8   (4 + 4 + 0)
 *   - +myomer booster active, 4 troopers           → 12  (4 + 0 + 8)
 *   - +4 vibroclaws + myomer + 4 troopers          → 16  (4 + 4 + 8)
 *   - 0 active troopers                            → 0
 *
 * @spec openspec/changes/add-battle-armor-combat/specs/battle-armor-combat/spec.md
 *   (Requirement: Leg Attack)
 */
export function calculateLegAttackDamage(
  squad: IBASquadCombatState,
  squadDef: IBALegAttackSquadDef,
): number {
  const activeTroopers = getNumberActiveTroopers(squad);
  if (activeTroopers === 0) return 0;

  // Base damage component — flat 4 per the spec, only when the squad has at
  // least one surviving trooper to perform the attack.
  const baseDamage = 4;

  // Vibroclaw bonus — each squad-level vibroclaw adds one flat point.
  // Spec: "+ vibroClaws" — a count, not multiplied by troopers.
  const vibroclawBonus = squadDef.vibroClaws > 0 ? squadDef.vibroClaws : 0;

  // Myomer Booster bonus — `activeTroopers × 2` when active.
  // Spec: "(myomerBooster ? activeTroopers × 2 : 0)".
  const myomerBonus = squadDef.myomerBoosterActive ? activeTroopers * 2 : 0;

  return baseDamage + vibroclawBonus + myomerBonus;
}
