/**
 * Vehicle-specific to-hit modifiers.
 *
 * This module owns to-hit penalties that fire only for ground vehicles —
 * separate from the generic mech / unit modifiers in `movementModifiers.ts`,
 * `equipmentModifiers.ts`, etc. — so the vehicle pipeline stays
 * surgically scoped.
 *
 * @spec openspec/changes/tier5-audit-cleanup/specs/firing-arc-calculation/spec.md
 *   Requirement: Vehicle Chin Turret Pivot Penalty
 */

import {
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';
import { IToHitModifierDetail } from '@/types/gameplay';
import { TurretType } from '@/types/unit/VehicleInterfaces';

/**
 * Compute the chin-turret pivot to-hit penalty for a vehicle weapon attack.
 *
 * Per `add-vehicle-combat-behavior` task 9.3 (deferred without pickup) and
 * the Tier 5 audit decision **D2** (IMPLEMENT, not de-scope), a ground
 * vehicle that pivots its chin turret during the current turn incurs a
 * +1 to-hit modifier on every weapon attack from that turret in the same
 * turn. The 360° chin-turret arc shipped in the parent change; only the
 * pivot-penalty modifier was missing.
 *
 * Returns `null` when no penalty applies (so callers can spread-or-omit
 * cleanly into the modifier accumulator). Returns a +1 modifier with
 * attribution `chin-turret-pivot` when:
 *   - the vehicle is configured with `TurretType.CHIN`
 *   - the turret pivoted from its previous facing during the current turn
 *   - the firing weapon is mounted IN the chin turret (not body or sponson)
 *
 * Body- and sponson-mounted weapons are unaffected by chin-turret pivot
 * even when both are co-resident on the same vehicle.
 *
 * @param params.turretType - Vehicle's primary turret type (must be CHIN).
 * @param params.turretPivotedThisTurn - Pivot tracker carried on the
 *   per-turn vehicle combat state. Caller is responsible for setting this
 *   true when the turret rotates and clearing it at end-of-turn alongside
 *   other per-turn flags.
 * @param params.weaponMountLocation - Where on the vehicle the firing
 *   weapon is mounted. Only weapons mounted in the chin turret receive
 *   the penalty.
 * @param params.weaponIsTurretMounted - True when the weapon's mount is the
 *   primary turret. False for body/sponson mounts.
 * @returns A +1 modifier when all conditions met; `null` otherwise.
 */
export function calculateChinTurretPivotModifier(params: {
  readonly turretType?: TurretType;
  readonly turretPivotedThisTurn: boolean;
  readonly weaponMountLocation: VehicleLocation | VTOLLocation;
  readonly weaponIsTurretMounted: boolean;
}): IToHitModifierDetail | null {
  // Penalty only applies to weapons in a CHIN turret.
  if (params.turretType !== TurretType.CHIN) {
    return null;
  }

  // Body / sponson weapons share the chassis with the chin turret but do
  // not move with it — they are not penalized when the chin pivots.
  if (!params.weaponIsTurretMounted) {
    return null;
  }

  // No pivot this turn -> no penalty.
  if (!params.turretPivotedThisTurn) {
    return null;
  }

  return {
    name: 'Chin Turret Pivot',
    value: 1,
    source: 'other',
    description:
      'Chin turret pivoted from previous facing this turn (+1 to-hit)',
  };
}
