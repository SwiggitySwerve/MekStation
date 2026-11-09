/**
 * Roster Unit Projection
 *
 * Thin display projection for the roster store. Carries only roster-identity
 * and derived display fields — NEVER the canonical post-deploy combat state
 * fields (`currentArmorPerLocation`, `destroyedComponents`, etc.). Those
 * live on `IUnitCombatState` under `ICampaign.unitCombatStates[unitId]`,
 * the single source of truth per
 * `openspec/specs/campaign-unit-combat-state/spec.md`.
 *
 * ## Cleavage
 *
 * Three orthogonal type families sit in the roster/combat domain:
 *
 * 1. **Construction state** (owned by `unit-entity-model`) — what the unit
 *    was built with: armor max, structure max, ammo bins, components.
 * 2. **Combat state** (`IUnitCombatState` here in `./UnitCombatState`) —
 *    what the unit currently has after wear: remaining armor, destroyed
 *    components, ammo remaining, end-of-battle heat.
 * 3. **Roster projection** (this file) — display identity + derived
 *    readiness. NEVER duplicates fields from the other two.
 *
 * ## Why a separate type?
 *
 * The legacy roster-unit shape (deleted in PR-C of
 * `canonicalize-unit-combat-state`) conflated all three concerns into one
 * shape carried by the roster store. PR-B split them so:
 *
 * - The roster store holds only this projection (`IRosterUnitProjection`),
 *   which is cheap to subscribe to and selector-stable across battles.
 * - Damage data is read from `campaign.unitCombatStates[unitId]` via a
 *   `useShallow` selector at the component that needs it (e.g., damage
 *   bar). This avoids re-rendering the entire roster on unrelated
 *   campaign-store writes.
 * - Repair tickets diff the canonical `IUnitCombatState` against
 *   `IUnitMaxState` — the projection is irrelevant to repair flows.
 *
 * ## Naming rationale
 *
 * The projection is NOT named `IUnitDamageState` because three definitions
 * for that name already exist in the codebase:
 *
 * - `src/utils/gameplay/damage/types.ts` — canonical mech damage state used
 *   by the damage pipeline.
 * - `src/lib/combat/acar.ts` — autonomous-combat aggregate state.
 * - (formerly) `src/stores/campaign/useCampaignRosterStore.ts` — the
 *   carry-forward shape consumed by `applyDamageCarryForward`.
 *
 * `IRosterUnitProjection` is unambiguous and accurately describes the
 * shape: it's a projection of the roster onto display fields.
 *
 * @see openspec/specs/campaign-unit-combat-state/spec.md — canonical spec.
 * @see openspec/changes/canonicalize-unit-combat-state/design.md — PR-B
 *   selector memoization decision.
 *
 * @module types/campaign/RosterUnitProjection
 */

import type { RosterUnitSource } from './RosterUnitSource';

import {
  isUnitCombatReady,
  type IUnitCombatState,
  type IUnitMaxState,
} from './UnitCombatState';

// =============================================================================
// Type
// =============================================================================

/**
 * Display projection for a single roster unit.
 *
 * Field set:
 * - Identity: `unitId`, `unitName`, optional `pilotId`, `chassisVariant`.
 * - Derived: `readiness` — cached on the projection so Zustand subscribers
 *   don't re-render on unrelated combat-state changes. Source-of-truth
 *   derivation lives in `deriveRosterReadiness`.
 *
 * The projection is constructed at roster-add time (e.g., campaign creation
 * wizard, repair-bay re-add) and refreshed when combat state changes
 * meaningfully (post-battle processor). Consumers needing damage values
 * SHALL read `campaign.unitCombatStates[unitId]` directly.
 */
export interface IRosterUnitProjection {
  /** Unit id this projection describes (matches `IUnitCombatState.unitId`). */
  readonly unitId: string;
  /** Canonical unit-dataset key; distinct from `unitId`, the roster-instance id. */
  readonly unitRef?: string;
  /**
   * Persisted roster source. Absent is legacy canonical. Invalid
   * persisted values are rejected by `parseRosterUnitSource` and are
   * never rewritten here.
   */
  readonly unitSource?: RosterUnitSource;
  /**
   * Pinned library version at enroll (`IInstanceProvenance.sourceVersion`).
   * Vault edits publish newer versions and do not change this pin.
   */
  readonly sourceVersion?: number;
  /** Display name (cached at roster-add time). */
  readonly unitName: string;
  /** Assigned pilot id, if any. */
  readonly pilotId?: string;
  /**
   * Chassis variant string (e.g., `"AS7-D"`, `"WHM-6R"`). Cached at
   * roster-add time so the dashboard can render the variant tag without
   * touching the unit-entity vault on every render.
   */
  readonly chassisVariant: string;
  /**
   * Legacy display cache; current decisions use selectUnitReadiness.
   * In the browser the post-battle processor refreshes it from
   * `deriveRosterReadiness(campaign.unitCombatStates[unitId])` when combat
   * state changes. On the saved record of a journal-native campaign, the
   * record rewrite that runs after a journal command batch or a co-op
   * combat outcome commits (`rewriteCampaignRecordAfterCommand`) sets it
   * from the journal's roster status (operational, damaged, destroyed)
   * without touching `unitCombatStates`, so there it can differ from the
   * value the combat state derives.
   */
  readonly readiness: 'Ready' | 'Damaged' | 'Destroyed';
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Physical condition from canonical facts. Full-health evidence is required to
 * reconcile a stale false combatReady flag; missing maxima never prove repair.
 * Campaign absence/authority and deployment reasons belong to selectUnitReadiness.
 */
export function deriveRosterReadiness(
  state: IUnitCombatState | undefined,
  maxState?: IUnitMaxState,
): IRosterUnitProjection['readiness'] {
  if (!state) return 'Destroyed';
  const fullyRestored =
    maxState !== undefined &&
    maxState.unitId === state.unitId &&
    state.heatEnd === 0 &&
    state.destroyedComponents.length === 0 &&
    state.destroyedLocations.length === 0 &&
    completeFullHealthMap(
      state.currentArmorPerLocation,
      maxState.maxArmorPerLocation,
      false,
    ) &&
    completeFullHealthMap(
      state.currentStructurePerLocation,
      maxState.maxStructurePerLocation,
      true,
    ) &&
    completeFullHealthMap(
      state.ammoRemaining,
      maxState.maxAmmoPerBin,
      false,
      true,
    );
  const effectiveState =
    !state.combatReady && fullyRestored
      ? { ...state, combatReady: true }
      : state;
  if (
    !isUnitCombatReady(effectiveState) ||
    state.destroyedLocations.includes('CT')
  )
    return 'Destroyed';
  if (
    state.destroyedComponents.length > 0 ||
    state.destroyedLocations.length > 0
  )
    return 'Damaged';
  if (
    maxState &&
    (hasDeficit(state.currentArmorPerLocation, maxState.maxArmorPerLocation) ||
      hasDeficit(
        state.currentStructurePerLocation,
        maxState.maxStructurePerLocation,
      ))
  )
    return 'Damaged';
  return 'Ready';
}

function hasDeficit(
  current: Readonly<Record<string, number>>,
  max: Readonly<Record<string, number>>,
): boolean {
  return Object.entries(max).some(
    ([key, value]) => current[key] !== undefined && current[key] < value,
  );
}

function completeFullHealthMap(
  current: Readonly<Record<string, number>>,
  max: Readonly<Record<string, number>>,
  positive: boolean,
  allowEmpty = false,
): boolean {
  const entries = Object.entries(max);
  return (
    (allowEmpty || entries.length > 0) &&
    entries.length === Object.keys(current).length &&
    entries.every(
      ([key, value]) =>
        Number.isFinite(value) &&
        (positive ? value > 0 : value >= 0) &&
        current[key] === value,
    )
  );
}
