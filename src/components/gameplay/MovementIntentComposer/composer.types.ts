/**
 * MovementIntentComposer — shared prop + view types (change
 * `tactical-movement-intent-composer`, phase 4, tactical-movement-intent
 * capability).
 *
 * The composer is the SOLE movement-composition surface on the tactical HUD
 * (Single Movement Authority): it hosts the Posture Palette, the Cost Ledger,
 * and the Budget Resolver, and it reads the `movementIntent` store slice + the
 * phase-1 derived selectors (`selectBudgetOptions` etc.). Every MP / heat /
 * to-hit value it renders originates from `movement-system` code paths via
 * those selectors — there is NO UI-local movement math in this component tree.
 *
 * @spec openspec/changes/tactical-movement-intent-composer/specs/tactical-movement-intent/spec.md
 */

import type {
  Facing,
  IHexCoordinate,
  IMovementCapability,
  ITacticalCommandContext,
  IUnitGameState,
  MovementHeatProfile,
  PostureActionType,
} from '@/types/gameplay';

/**
 * The context the composer needs to project budgets, legality, and posture
 * costs. Built at the page from the same movement hook + action context the
 * dock already computes, so the composer stays consistent with the map surface.
 * Inert (`active: false`) when the composer does not own the HUD for the
 * selected unit; the container renders nothing in that case.
 */
export interface IMovementComposerContext {
  /** `true` when the composer owns movement composition for the selected unit. */
  readonly active: boolean;
  /** Runtime (damage-adjusted) movement capability of the selected unit. */
  readonly capability: IMovementCapability | null;
  /** The selected unit's runtime state (heat, posture flags, position). */
  readonly unit: IUnitGameState | null;
  /**
   * The tactical command context for the selected unit — reused to drive the
   * posture palette's legality + disabled-reason predicates (the same
   * predicates the dock's posture commands use), so composer and dock agree.
   */
  readonly commandContext: ITacticalCommandContext;
  /** The unit's current hex (commit start hex). */
  readonly startHex: IHexCoordinate | null;
  /** The unit's current facing (commit start facing). */
  readonly startFacing: Facing;
  /** Heat profile for jump-heat projection (feeds `selectBudgetOptions`). */
  readonly movementHeatProfile: MovementHeatProfile | undefined;
}

/**
 * A palette entry: one Posture Action, its rules-derived MP cost, and its
 * current legality/affordability. `offered: false` means the action is illegal
 * for the unit's current state and MUST NOT be rendered (spec: "illegal-for-
 * state actions not offered"). `disabledReason` is set when the action is
 * offered but blocked (either illegal at commit time, or Live-Intersection
 * unaffordable), and drives the non-color-only disabled encoding.
 */
export interface IPosturePaletteEntry {
  readonly action: PostureActionType;
  readonly label: string;
  readonly hotkey?: string;
  /** Rules-derived MP cost (from `movement-system` posture-cost helpers). */
  readonly mpCost: number;
  /** `false` when illegal for the unit's current state (not rendered). */
  readonly offered: boolean;
  /** `true` when offered but blocked (illegal-at-commit or unaffordable). */
  readonly disabled: boolean;
  /** Human reason shown on the disabled entry (tooltip + aria). */
  readonly disabledReason?: string;
}
