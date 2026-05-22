/**
 * BA leg-attack resolver (PR-L3 — G5 + G6).
 *
 * Pure-function pipeline that resolves a BA squad's leg attack against
 * either a Mek or a Vehicle target, layered on the new
 * `IBASquadCombatState` shape established by PR-L2. The resolver
 *
 *   1. computes the damage via `calculateLegAttackDamage`,
 *   2. picks a hit location:
 *        - Mek target:  d6 → 1-3 = Left Leg, 4-6 = Right Leg, with a
 *          destroyed-leg fallback to the OTHER leg, and a clean-miss
 *          short-circuit when both legs are destroyed,
 *        - Vehicle target: `calculateFiringArc(attacker → target.facing)`
 *          maps the arc onto a `VehicleHitLocation` ('front' /
 *          'left_side' / 'right_side' / 'rear'),
 *   3. applies the crit-modifier delta (Hardened armor → −2; attacking
 *      pilot's `MISC_HUMAN_TRO_MEK` SPA → +1; both stack additively).
 *
 * This module is the FIRST PRODUCTION CALLER of the orphan helpers
 * `vehicleFiringArc.ts` and `vehicleCriticalHitResolution.ts` (G5 + G6
 * orphan-rot risk closed). Existing helper tests (`vehicleFiringArc.test.ts`
 * + `vehicleCriticalHitResolution.test.ts`) remain authoritative for the
 * helper internals — this module's tests cover the wiring contract.
 *
 * @spec openspec/changes/add-battle-armor-combat/specs/battle-armor-combat/spec.md
 *   (Requirement: Leg Attack)
 */

import type { IBASquadCombatState } from '@/types/gameplay';
import type {
  IVehicleCombatState,
  IVehicleCritRollResult,
} from '@/types/gameplay';

import {
  calculateLegAttackDamage,
  type IBALegAttackSquadDef,
} from '@/lib/combat/baCombat';
import { EngineType } from '@/types/construction/EngineType';
import {
  type Facing,
  type FiringArc,
  type IHexCoordinate,
} from '@/types/gameplay/HexGridInterfaces';
import { D6Roller, defaultD6Roller } from '@/utils/gameplay/diceTypes';

import { calculateFiringArc } from '../firingArc';
import {
  applyVehicleCritEffect,
  type IVehicleCritEffectResult,
  rollVehicleCrit,
  vehicleCritFromRoll,
} from '../vehicleCriticalHitResolution';

// =============================================================================
// Crit-modifier constants
// =============================================================================

/**
 * `-2` crit modifier when the targeted location has Hardened armor (per the
 * spec "Hardened armor reduces crit chance" scenario).
 */
export const LEG_ATTACK_HARDENED_CRIT_MODIFIER = -2;

/**
 * `+1` crit modifier when the attacking pilot has the
 * `MISC_HUMAN_TRO_MEK` SPA (per the spec "HUMAN_TRO_MEK SPA increases crit
 * chance" scenario).
 */
export const LEG_ATTACK_HUMAN_TRO_MEK_CRIT_MODIFIER = 1;

// =============================================================================
// Mek leg-location labels
// =============================================================================

/**
 * Canonical mek-leg labels emitted on the `LegAttackResolved` event.
 * Match the `MechLocation.LEFT_LEG` / `MechLocation.RIGHT_LEG` string values
 * but kept as bare constants so this module does not pull in the full
 * construction `MechLocation` enum (cross-layer hygiene).
 */
export const MEK_LEFT_LEG_LABEL = 'Left Leg';
export const MEK_RIGHT_LEG_LABEL = 'Right Leg';

/**
 * Discriminant for which leg side a d6 roll picks before the destroyed-leg
 * fallback runs. Stored separately from the final hit-location label so
 * callers can reason about the rolled-then-rejected case.
 */
export type LegSide = 'left' | 'right';

// =============================================================================
// Inputs
// =============================================================================

/**
 * Inputs for `resolveMekLegAttack`. A "Mek target" here is any unit whose
 * leg-destruction state caller exposes via the `legDestroyed` predicate —
 * the resolver does NOT reach into the unit state directly so this module
 * stays decoupled from `IUnitGameState` / `IComponentDamageState`. Callers
 * (the action handler) bridge the unit state to this predicate.
 */
export interface IResolveMekLegAttackInput {
  /** Snapshot of the attacking BA squad (new shape). */
  readonly squad: IBASquadCombatState;
  /** Squad-level vibroclaw + myomer flags for the damage formula. */
  readonly squadDef: IBALegAttackSquadDef;
  /**
   * Predicate the caller supplies that returns true when the given leg
   * is destroyed (internal structure at 0) on the target Mek.
   */
  readonly legDestroyed: (side: LegSide) => boolean;
  /**
   * True when the targeted leg location's armor type is Hardened
   * (applies `-2` crit modifier per the spec).
   */
  readonly hardenedArmor?: boolean;
  /**
   * True when the attacking pilot has the `MISC_HUMAN_TRO_MEK` SPA
   * (applies `+1` crit modifier per the spec).
   */
  readonly humanTroMekSpa?: boolean;
  /** Optional D6 roller override (test determinism). */
  readonly diceRoller?: D6Roller;
}

/**
 * Inputs for `resolveVehicleLegAttack`. Mirrors the Mek input but routes
 * the hit-location through the vehicle firing-arc helper (G5) instead of
 * a leg-side roll.
 */
export interface IResolveVehicleLegAttackInput {
  /** Snapshot of the attacking BA squad (new shape). */
  readonly squad: IBASquadCombatState;
  /** Squad-level vibroclaw + myomer flags for the damage formula. */
  readonly squadDef: IBALegAttackSquadDef;
  /** Attacker's current hex (drives the firing-arc geometry). */
  readonly attackerPos: IHexCoordinate;
  /** Target vehicle's current hex. */
  readonly targetPos: IHexCoordinate;
  /** Target vehicle's chassis facing. */
  readonly targetFacing: Facing;
  /**
   * True when the targeted vehicle arc's armor type is Hardened
   * (applies `-2` crit modifier per the spec).
   */
  readonly hardenedArmor?: boolean;
  /** True when the attacking pilot has the `MISC_HUMAN_TRO_MEK` SPA. */
  readonly humanTroMekSpa?: boolean;
}

// =============================================================================
// Outputs
// =============================================================================

/**
 * Outcome of a resolved leg attack. `hit: false` only fires on the Mek
 * clean-miss case (both legs destroyed); vehicle leg attacks ALWAYS hit
 * because the arc geometry always resolves a location (no destroyed-arc
 * fallback exists in the spec).
 */
export interface ILegAttackResolution {
  /** True on a successful hit; false only on Mek both-legs-destroyed miss. */
  readonly hit: boolean;
  /** Total damage applied to the target (0 on miss). */
  readonly damage: number;
  /** Resolved hit-location label (mek leg name or vehicle arc string). */
  readonly hitLocation: string;
  /** Net crit modifier (Hardened: -2; HUMAN_TRO_MEK: +1). */
  readonly critModifier: number;
  /**
   * The leg the d6 originally rolled, before the destroyed-leg fallback
   * ran. Only set for Mek resolutions; undefined for vehicle targets.
   */
  readonly rolledLegSide?: LegSide;
}

// =============================================================================
// Internal helpers
// =============================================================================

/**
 * Compute the net crit modifier for a leg attack:
 *   `(hardenedArmor ? -2 : 0) + (humanTroMekSpa ? +1 : 0)`.
 *
 * Defaults to 0 when both flags are absent — matches the spec "Basic leg
 * attack" scenario which carries `critModifier: 0`.
 */
function computeCritModifier(
  hardenedArmor: boolean | undefined,
  humanTroMekSpa: boolean | undefined,
): number {
  let modifier = 0;
  if (hardenedArmor) modifier += LEG_ATTACK_HARDENED_CRIT_MODIFIER;
  if (humanTroMekSpa) modifier += LEG_ATTACK_HUMAN_TRO_MEK_CRIT_MODIFIER;
  return modifier;
}

/**
 * Convert a d6 result to a leg side. 1-3 → 'left', 4-6 → 'right'.
 * Mirrors the spec "roll for a leg location" rule.
 */
function d6ToLegSide(roll: number): LegSide {
  return roll <= 3 ? 'left' : 'right';
}

/**
 * Convert a `LegSide` to the on-the-wire hit-location label emitted on
 * the `LegAttackResolved` event payload.
 */
function legSideToLabel(side: LegSide): string {
  return side === 'left' ? MEK_LEFT_LEG_LABEL : MEK_RIGHT_LEG_LABEL;
}

/**
 * Map a vehicle firing-arc result onto the canonical `VehicleHitLocation`
 * label emitted on the `LegAttackResolved` event payload. Mirrors the
 * `VehicleHitLocation` 'front' / 'left_side' / 'right_side' / 'rear'
 * naming (see `src/types/gameplay/VehicleCombatInterfaces.ts`).
 *
 * The `FiringArc` enum carries `Front` / `Left` / `Right` / `Rear` —
 * vehicle hit-location strings use snake_case for the side variants, so
 * we translate explicitly rather than lower-casing the enum.
 */
function firingArcToVehicleLocation(arc: FiringArc): string {
  // FiringArc enum string values are 'front' / 'left' / 'right' / 'rear'.
  // Vehicle hit-location uses 'left_side' / 'right_side' for sides.
  switch (arc) {
    case 'front':
      return 'front';
    case 'left':
      return 'left_side';
    case 'right':
      return 'right_side';
    case 'rear':
      return 'rear';
    default:
      // Defensive: should be unreachable given the FiringArc enum is closed.
      return 'front';
  }
}

// =============================================================================
// Mek leg-attack resolver
// =============================================================================

/**
 * Resolve a BA leg attack against a Mek target.
 *
 * Behaviour:
 *   - Damage is computed via `calculateLegAttackDamage`.
 *   - A d6 picks the rolled leg side (1-3 = left, 4-6 = right).
 *   - If the rolled leg is destroyed, the OTHER leg is hit instead
 *     (per the spec "Destroyed leg fallback" scenario).
 *   - If BOTH legs are destroyed, the attack is a clean miss
 *     (`hit: false`, `damage: 0`). The squad's attack action is still
 *     considered consumed by the calling action handler.
 *   - The crit-modifier is the additive net of Hardened (−2) and
 *     HUMAN_TRO_MEK SPA (+1) flags.
 */
export function resolveMekLegAttack(
  input: IResolveMekLegAttackInput,
): ILegAttackResolution {
  const diceRoller = input.diceRoller ?? defaultD6Roller;
  const damage = calculateLegAttackDamage(input.squad, input.squadDef);
  const critModifier = computeCritModifier(
    input.hardenedArmor,
    input.humanTroMekSpa,
  );

  const rolled = diceRoller();
  const rolledLegSide = d6ToLegSide(rolled);

  // Destroyed-leg fallback: if the rolled leg is dead, switch sides.
  // If BOTH legs are dead, the attack misses cleanly.
  const rolledDestroyed = input.legDestroyed(rolledLegSide);
  const otherSide: LegSide = rolledLegSide === 'left' ? 'right' : 'left';
  const otherDestroyed = input.legDestroyed(otherSide);

  if (rolledDestroyed && otherDestroyed) {
    return {
      hit: false,
      damage: 0,
      // Stamp the rolled-then-rejected leg on the event payload so replay
      // consumers can see which leg the resolver TRIED to hit.
      hitLocation: legSideToLabel(rolledLegSide),
      critModifier,
      rolledLegSide,
    };
  }

  const finalLegSide: LegSide = rolledDestroyed ? otherSide : rolledLegSide;
  return {
    hit: true,
    damage,
    hitLocation: legSideToLabel(finalLegSide),
    critModifier,
    rolledLegSide,
  };
}

// =============================================================================
// Vehicle leg-attack resolver (FIRST CALLER of vehicleFiringArc.ts)
// =============================================================================

/**
 * Resolve a BA leg attack against a Vehicle target.
 *
 * Behaviour:
 *   - Damage is computed via `calculateLegAttackDamage` (identical to the
 *     Mek path — the squad-side formula does not vary by target type).
 *   - Hit location is derived from
 *     `calculateFiringArc(attackerPos, targetPos, targetFacing)`, mapped
 *     onto a vehicle hit-location label ('front' / 'left_side' /
 *     'right_side' / 'rear'). Same-hex attacker resolves to 'front' per
 *     the underlying helper's same-hex shortcut.
 *   - There is no destroyed-arc fallback (no clean-miss case) — the
 *     attack always lands.
 *   - The crit-modifier is the additive net of Hardened (−2) and
 *     HUMAN_TRO_MEK SPA (+1) flags.
 *
 * This is the first production caller of `vehicleFiringArc.calculateFiringArc`
 * outside the helper's own tests (G5 orphan-rot risk closed).
 * `vehicleCriticalHitResolution.applyVehicleCritEffect` is consumed by the
 * downstream damage pipeline once the action handler routes the
 * `LegAttackResolved` event into vehicle-damage application (G6 — see
 * the action-handler module in `src/engine/InteractiveSession.actions.ts`).
 */
export function resolveVehicleLegAttack(
  input: IResolveVehicleLegAttackInput,
): ILegAttackResolution {
  const damage = calculateLegAttackDamage(input.squad, input.squadDef);
  const critModifier = computeCritModifier(
    input.hardenedArmor,
    input.humanTroMekSpa,
  );

  // FIRST PRODUCTION CALLER of vehicleFiringArc.ts (G5 orphan-rot closed).
  const arc = calculateFiringArc(
    input.attackerPos,
    input.targetPos,
    input.targetFacing,
  );
  const hitLocation = firingArcToVehicleLocation(arc);

  return {
    hit: true,
    damage,
    hitLocation,
    critModifier,
  };
}
// =============================================================================
// Vehicle leg-attack crit pipeline (FIRST CALLER of vehicleCriticalHitResolution.ts)
// =============================================================================

/**
 * Inputs for `applyVehicleLegAttackCrit`. Carries the live vehicle
 * combat-state plus the engine type + ammo-slot context that
 * `applyVehicleCritEffect` needs to resolve the crit table.
 *
 * The `critModifier` field is the SAME crit modifier produced by
 * `resolveVehicleLegAttack` (Hardened: -2; HUMAN_TRO_MEK SPA: +1) and is
 * applied additively to the 2d6 crit roll. This wires the spec-required
 * crit modifier directly into the vehicle crit table — Hardened armor
 * shifts the roll DOWN (less severe), and HUMAN_TRO_MEK shifts it UP.
 */
export interface IApplyVehicleLegAttackCritInput {
  /** Target vehicle's combat state. */
  readonly vehicleState: IVehicleCombatState;
  /**
   * Engine type (drives the fuel-tank reroll branch in
   * `applyVehicleCritEffect`).
   */
  readonly engineType: EngineType | string | number;
  /**
   * Whether ammo is mounted at the crit location (drives the
   * ammo-explosion branch).
   */
  readonly hasAmmoInSlot: boolean;
  /**
   * Crit modifier from the leg-attack resolution (Hardened: -2;
   * HUMAN_TRO_MEK: +1). Applied additively to the 2d6 roll, clamped
   * into the table's [2, 12] range.
   */
  readonly critModifier: number;
  /** Optional D6 roller override (test determinism). */
  readonly diceRoller?: D6Roller;
}

/**
 * Roll a vehicle crit with the leg-attack `critModifier` baked into the
 * 2d6 result, then apply its effect to the vehicle's combat state.
 *
 * This is the FIRST production caller of
 * `vehicleCriticalHitResolution.applyVehicleCritEffect` outside the
 * helper's own tests (G6 orphan-rot risk closed).
 *
 * Algorithm:
 *   1. Roll a fresh 2d6 vehicle crit via `rollVehicleCrit`.
 *   2. Apply the `critModifier` to the roll's total, clamping into
 *      [2, 12] so a Hardened roll cannot drop below "no crit" and a
 *      HUMAN_TRO_MEK SPA roll cannot exceed "ammo explosion".
 *   3. Map the modified total back onto a crit kind via
 *      `vehicleCritFromRoll` (preserving the original dice pair for
 *      replay/audit but treating the SUM as if it had been the
 *      modified total).
 *   4. Apply the resulting crit effect via `applyVehicleCritEffect`.
 *
 * Returns the helper's `IVehicleCritEffectResult` shape verbatim so the
 * caller can chain it through the damage pipeline.
 */
export function applyVehicleLegAttackCrit(
  input: IApplyVehicleLegAttackCritInput,
): IVehicleCritEffectResult {
  const diceRoller = input.diceRoller ?? defaultD6Roller;

  // 1. Roll a fresh 2d6 vehicle crit.
  const rolled = rollVehicleCrit(diceRoller);

  // 2. Apply the leg-attack crit modifier to the rolled total, clamped
  // into the table's [2, 12] range.
  const modifiedTotal = Math.min(
    12,
    Math.max(2, rolled.roll + input.critModifier),
  );

  // 3. Re-derive the crit kind from the modified total. We synthesize
  // a dice pair whose sum equals the modified total so
  // `vehicleCritFromRoll` resolves the correct kind — the helper's
  // table-lookup is sum-driven (it does not inspect individual dice).
  const synthD1 = Math.max(1, Math.min(6, modifiedTotal - 1));
  const synthD2 = modifiedTotal - synthD1;
  const modifiedCrit: IVehicleCritRollResult = vehicleCritFromRoll([
    synthD1,
    synthD2,
  ]);

  // 4. Apply the crit effect to the vehicle state.
  return applyVehicleCritEffect(input.vehicleState, modifiedCrit, {
    engineType: input.engineType,
    hasAmmoInSlot: input.hasAmmoInSlot,
  });
}
