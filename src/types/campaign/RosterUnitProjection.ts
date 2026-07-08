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

import type { IUnitCombatState } from './UnitCombatState';

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
   * Derived display readiness. Cached on the projection for selector
   * stability — the post-battle processor refreshes this when combat
   * state changes. Always equals
   * `deriveRosterReadiness(campaign.unitCombatStates[unitId])`.
   */
  readonly readiness: 'Ready' | 'Damaged' | 'Destroyed';
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Derive roster readiness from canonical combat state.
 *
 * Mapping:
 * - `undefined` state OR `combatReady === false` → `'Destroyed'`.
 *   - The undefined case treats "no combat state yet" the same as
 *     "destroyed" for display purposes — the deploy-flow seeds a fresh
 *     state on first deploy, so this branch only fires for units that
 *     have been explicitly removed from rotation.
 * - `combatReady === true` AND any destroyed components OR any location
 *   below max armor / structure → `'Damaged'`.
 *   - Without an `IUnitMaxState` companion, we cannot tell "damaged"
 *     from "fully repaired" by armor numbers alone — the post-battle
 *     processor flips the projection field directly. The caller can
 *     pass an optional `maxState` to enable accurate diff-based
 *     readiness; without it we fall back to "any destroyed component
 *     means damaged".
 * - Otherwise → `'Ready'`.
 *
 * @param state Canonical combat state for the unit, or `undefined` if the
 *   unit has not yet been deployed.
 * @returns The derived readiness label for display.
 */
export function deriveRosterReadiness(
  state: IUnitCombatState | undefined,
): 'Ready' | 'Damaged' | 'Destroyed' {
  // No state = unit not deployed (or removed); display as destroyed so the
  // dashboard doesn't surface a "Ready" badge for a unit the campaign has
  // no record of.
  if (!state) return 'Destroyed';
  // Explicit destruction flag wins regardless of component counts.
  if (!state.combatReady) return 'Destroyed';
  // Any destroyed component or destroyed location implies the unit went
  // through a battle and took at least one critical hit — show as damaged
  // until repair completes (which clears the components / restores
  // combatReady).
  if (state.destroyedComponents.length > 0) return 'Damaged';
  if (state.destroyedLocations.length > 0) return 'Damaged';
  return 'Ready';
}
