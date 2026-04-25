/**
 * Physical-attack displacement helpers.
 *
 * Per `implement-physical-attack-phase` design.md Resolved Question 1
 * (charge miss) + Resolved Question 3 (push). Mirrors MegaMek's
 * `Compute.getMissedChargeDisplacement` (Compute.java:1116-1158) and the
 * push branch of `TWGameManager.resolvePushAttack`
 * (TWGameManager.java:13452-13510).
 *
 * @spec openspec/changes/implement-physical-attack-phase/specs/physical-attack-system/spec.md
 */

import { Facing, IHexCoordinate, IHexGrid } from '@/types/gameplay';

import { D6Roller } from '../diceTypes';
import { isInBounds, isOccupied } from '../hexGrid';
import { hexNeighbor } from '../hexMath';

/**
 * Per Resolved Q3: thin wrapper over `hexNeighbor` to mirror MegaMek's
 * `Coords.translated(facing)` API name. `facing` is the integer 0-5
 * encoding from `Facing`.
 */
export function translateHex(
  coord: IHexCoordinate,
  facing: Facing,
): IHexCoordinate {
  return hexNeighbor(coord, facing);
}

/**
 * Per Resolved Q3: a hex is a valid displacement destination when it's
 * in-bounds AND unoccupied. Mirrors `Compute.isValidDisplacement` in
 * MegaMek (returns false for off-map / occupied hexes).
 *
 * `excludeUnitId` is the entity being displaced — its current hex still
 * counts as "occupied" but should NOT block a self-displacement (the
 * caller is moving it OUT of that hex). Pass the displaced entity's id
 * to ignore its own occupant check.
 */
export function isValidDisplacement(
  grid: IHexGrid,
  coord: IHexCoordinate,
  excludeUnitId?: string,
): boolean {
  if (!isInBounds(grid, coord)) return false;
  if (!isOccupied(grid, coord)) return true;
  // Same-unit-already-here case: allow.
  const hex = grid.hexes.get(`${coord.q},${coord.r}`);
  if (hex && excludeUnitId && hex.occupantId === excludeUnitId) return true;
  return false;
}

/**
 * Per `implement-physical-attack-phase` Resolved Q1 (charge miss): on
 * miss, the attacker is displaced to one of the two side hexes 60° off
 * the charge direction (`(facing + 1) % 6` or `(facing + 5) % 6`) from
 * the attacker's pre-charge source position. The higher-elevation hex
 * is preferred; on tie, the seeded RNG picks. If neither side hex is
 * a valid displacement target, returns the source hex (attacker stays
 * put).
 *
 * Returns the resolved destination coordinate. Caller is responsible
 * for emitting the position-change event; this helper is pure and
 * has no side effects.
 *
 * Source: MegaMek `Compute.getMissedChargeDisplacement`
 * (Compute.java:1116-1158).
 */
export function computeMissedChargeDisplacement(
  grid: IHexGrid,
  attackerId: string,
  source: IHexCoordinate,
  facing: Facing,
  d6: D6Roller,
): IHexCoordinate {
  const leftFacing = ((facing + 5) % 6) as Facing;
  const rightFacing = ((facing + 1) % 6) as Facing;
  const leftHex = translateHex(source, leftFacing);
  const rightHex = translateHex(source, rightFacing);

  const leftValid = isValidDisplacement(grid, leftHex, attackerId);
  const rightValid = isValidDisplacement(grid, rightHex, attackerId);

  if (!leftValid && !rightValid) return source;
  if (leftValid && !rightValid) return leftHex;
  if (rightValid && !leftValid) return rightHex;

  // Both valid — prefer higher elevation.
  const leftElev = grid.hexes.get(`${leftHex.q},${leftHex.r}`)?.elevation ?? 0;
  const rightElev =
    grid.hexes.get(`${rightHex.q},${rightHex.r}`)?.elevation ?? 0;
  if (leftElev > rightElev) return leftHex;
  if (rightElev > leftElev) return rightHex;

  // Tie on elevation — seeded RNG picks per Compute.java:1147-1153.
  const roll = d6();
  return roll <= 3 ? leftHex : rightHex;
}

/**
 * Per `implement-physical-attack-phase` task 8.3 + Resolved Q3:
 * compute the push destination — one hex in the attacker's facing
 * direction from the target's current position. Returns the destination
 * coordinate (which may be off-map; caller validates via
 * `isValidDisplacement`).
 *
 * Source: MegaMek `TWGameManager.java:13452-13460`.
 */
export function computePushDisplacement(
  targetPosition: IHexCoordinate,
  attackerFacing: Facing,
): IHexCoordinate {
  return translateHex(targetPosition, attackerFacing);
}
