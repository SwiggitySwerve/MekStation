/**
 * Unit Combat State
 *
 * Persistent per-unit combat state maintained ALONGSIDE construction state
 * (never inside it). The campaign layer reads/writes this after each
 * battle to track armor / structure / ammo / component damage carried
 * forward between scenarios.
 *
 * Construction state defines what the unit *was built with*; combat state
 * defines what it *currently has* after wear and tear. Repair flows
 * eventually return combat state toward construction state.
 *
 * Phase 3 Wave 2 — `add-post-battle-processor`. Wave 3 (salvage/repair)
 * will consume this. Wave 5 (engine wiring) will populate it via the
 * `pendingBattleOutcomes` queue + `postBattleProcessor`.
 *
 * @module types/campaign/UnitCombatState
 */

/**
 * A single component destroyed by a critical hit during combat.
 *
 * `destroyedAt` carries the `matchId` that destroyed the component so we
 * can dedupe on idempotent re-application of the same outcome and so
 * later salvage/repair flows know when each piece broke.
 */
export interface IDestroyedComponent {
  /** Location code (e.g., 'CT', 'LT', 'RA'). */
  readonly location: string;
  /** Slot index inside the location (0-based). */
  readonly slot: number;
  /** Component category (e.g., 'engine', 'gyro', 'weapon', 'ammo'). */
  readonly componentType: string;
  /** Component name (e.g., 'Medium Laser', 'Gyro'). */
  readonly name: string;
  /** Match id that destroyed this component (for dedupe / audit). */
  readonly destroyedAt: string;
}

/**
 * Persisted post-battle combat state for one unit.
 *
 * All numeric maps are keyed by location string ('LT', 'CT', etc.) and
 * carry the *current* value (post-damage). Ammo map is keyed by ammo bin
 * id (not weapon name) and carries remaining rounds.
 */
export interface IUnitCombatState {
  /** Unit id this state describes (matches `IGameUnit.id`). */
  readonly unitId: string;
  /** Current armor remaining per location. */
  readonly currentArmorPerLocation: Readonly<Record<string, number>>;
  /** Current internal structure remaining per location. */
  readonly currentStructurePerLocation: Readonly<Record<string, number>>;
  /** Locations whose internal structure has reached zero. */
  readonly destroyedLocations: readonly string[];
  /** Components destroyed across all battles (deduped by location+slot). */
  readonly destroyedComponents: readonly IDestroyedComponent[];
  /** Heat reading at end of last battle (post heat phase). */
  readonly heatEnd: number;
  /** Ammo remaining per bin id. */
  readonly ammoRemaining: Readonly<Record<string, number>>;
  /** True when CT structure is zero or unit was tagged destroyed. */
  readonly combatReady: boolean;
  /** Match id of the most recent applied outcome (null if untouched). */
  readonly lastCombatOutcomeId: string | null;
  /** ISO-8601 timestamp of last update (null if untouched). */
  readonly lastUpdated: string | null;
}

/**
 * Initial unit combat state. Produced once when a unit first enters the
 * campaign and used as the baseline for all subsequent damage merges.
 *
 * Caller must provide `armorPerLocation` / `structurePerLocation` from
 * the unit's construction data — combat state does NOT introspect
 * construction. `ammoPerBin` is optional; defaults to an empty record
 * (units without ammo bins).
 */
export function createInitialCombatState(params: {
  readonly unitId: string;
  readonly armorPerLocation: Readonly<Record<string, number>>;
  readonly structurePerLocation: Readonly<Record<string, number>>;
  readonly ammoPerBin?: Readonly<Record<string, number>>;
}): IUnitCombatState {
  return {
    unitId: params.unitId,
    currentArmorPerLocation: { ...params.armorPerLocation },
    currentStructurePerLocation: { ...params.structurePerLocation },
    destroyedLocations: [],
    destroyedComponents: [],
    heatEnd: 0,
    ammoRemaining: { ...(params.ammoPerBin ?? {}) },
    combatReady: true,
    lastCombatOutcomeId: null,
    lastUpdated: null,
  };
}

/**
 * Per Wave 3b (`add-repair-queue-integration`): the "full health"
 * reference state for a unit, used by the repair queue builder to
 * diff against current `IUnitCombatState` and emit one ticket per
 * damaged location, destroyed component, and depleted ammo bin.
 *
 * Source of truth: the unit's construction state at deploy time. The
 * builder treats absent locations as "unknown max" (skip diffing) so
 * non-mech / partial-data units don't generate spurious tickets.
 */
export interface IUnitMaxState {
  readonly unitId: string;
  /** Max armor points per location code (e.g., `LT`, `CT`). */
  readonly maxArmorPerLocation: Readonly<Record<string, number>>;
  /** Max internal structure points per location code. */
  readonly maxStructurePerLocation: Readonly<Record<string, number>>;
  /** Max rounds per ammo bin id. */
  readonly maxAmmoPerBin: Readonly<Record<string, number>>;
}

/**
 * Returns true when the unit can deploy in another battle.
 *
 * Combat-ready requires:
 * - CT structure > 0 (or no CT entry yet — assume intact),
 * - the explicit `combatReady` flag is still true (not flipped by
 *   destruction in a prior battle).
 *
 * Salvage / repair flows can flip `combatReady` back to true once a
 * destroyed unit is rebuilt.
 */
export function isUnitCombatReady(state: IUnitCombatState): boolean {
  if (!state.combatReady) return false;
  const ct = state.currentStructurePerLocation['CT'];
  if (ct !== undefined && ct <= 0) return false;
  return true;
}
