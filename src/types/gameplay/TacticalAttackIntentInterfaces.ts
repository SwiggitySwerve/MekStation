/**
 * Attack Intent Composer state shapes (change `attack-phase-intent-composer`,
 * ADR 0002 design D2/D6/D7).
 *
 * Only the composed intent is STORED — everything the composer displays
 * (per-weapon legality under the composed twist, forecast rows, ledger
 * totals, primary/secondary designation) is DERIVED via selectors from
 * `assignments` + `composedTwist` + live unit state, mirroring the
 * movement-intent slice's single-source-of-truth rule (ADR 0001 / design
 * D5 precedent).
 *
 * @spec openspec/changes/attack-phase-intent-composer/specs/tactical-attack-intent/spec.md
 */

import type { Facing } from './HexGridInterfaces';
import type { WeaponFireMode } from './IndirectFireInterfaces';

/**
 * One weapon→target assignment in the composed volley. Assignment ORDER is
 * meaningful: the first assignment's target is the volley's primary target
 * (per `secondary-target-tracking`, consumed as-is); assignments against
 * any other target are secondary and surface their penalty inline (D5/D6).
 */
export interface IWeaponAssignment {
  readonly weaponId: string;
  readonly targetId: string;
  /** Fire mode for multi-mode weapons; absent = the weapon's default. */
  readonly mode?: WeaponFireMode;
}

/**
 * The stored attack-intent slice (design D2: this compiles down to the
 * preserved `attackPlan` contract at Fire; it never replaces it).
 *
 * - `focusedTargetId` — the working target (D6 target-first): enemy click
 *   focuses; weapon toggles assign against it. Purely a composition aid —
 *   it is NOT part of the committed volley.
 * - `assignments` — the composed volley in assignment order.
 * - `composedTwist` — the torso-twist intent (D7); `null` = no twist
 *   composed. Arc feasibility derives against this value, and clearing it
 *   restores prior gating exactly.
 */
export interface IAttackIntentState {
  readonly focusedTargetId: string | null;
  readonly assignments: readonly IWeaponAssignment[];
  readonly composedTwist: Facing | null;
}
