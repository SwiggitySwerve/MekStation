/**
 * Attack pre-resolution seam — `prepareAttackContext`.
 *
 * Single entry point that consolidates the three parallel
 * `computeIndirectFireContext` callers (interactive `applyInteractiveSessionAttack`,
 * bot `runAttackPhase`, Quick-Sim `runWeaponAttackPhase`) into one
 * discriminated-union producer. A 4th caller (aerospace deployment,
 * Wave 9 PR-M) is queued — extracting the seam NOW pre-empts the
 * four-way drift the OMO Council Phase-2 hephaestus seat flagged
 * during Wave 8 gap close-out (PR-K11 / G8).
 *
 * The function walks the supplied `weaponIds` and picks the FIRST
 * weapon whose `computeIndirectFireContext` returns
 * `permitted && isIndirect`. LRM volleys share a single spotter
 * election per declaration (matches MegaMek
 * `Compute.findSpottersForArtillery`). When no weapon resolves as
 * indirect, the result is `{ kind: 'direct' }`.
 *
 * Pure collaborator — reads `gameState` + `grid` but mutates nothing.
 *
 * @spec openspec/changes/add-indirect-fire-and-spotter-network/specs/indirect-fire-system/spec.md
 */

import type { IGameState } from '@/types/gameplay/GameSessionInterfaces';
import type { IHexGrid } from '@/types/gameplay/HexGridInterfaces';
import type { IIndirectFireResolution } from '@/types/gameplay/IndirectFireInterfaces';

import { computeIndirectFireContext } from './InteractiveSession.indirectFire';

/**
 * Discriminated union returned by `prepareAttackContext`.
 *
 * - `kind: 'direct'`   — no weapon in the declaration resolves as
 *                        indirect-fire (either none are indirect-
 *                        capable, the attacker has LOS, or no
 *                        spotter / NARC override is available).
 *                        `declareAttack` SHALL treat this identically
 *                        to its pre-PR-K4 contract (no penalty, no
 *                        indirect-fire events emitted).
 * - `kind: 'indirect'` — at least one weapon resolves as
 *                        `permitted && isIndirect`. The carried
 *                        `IIndirectFireResolution` drives the +1/+2
 *                        to-hit penalty and the
 *                        `IndirectFireSpotterSelected` /
 *                        `IndirectFireNarcOverride` event emission.
 */
export type IAttackPreResolution =
  | { readonly kind: 'direct' }
  | { readonly kind: 'indirect'; readonly resolution: IIndirectFireResolution };

/**
 * Derive an `IAttackPreResolution` for an attack declared from
 * `attackerId` against `targetId` carrying `weaponIds`.
 *
 * Iterates `weaponIds` and short-circuits on the first weapon whose
 * `computeIndirectFireContext` returns `permitted && isIndirect`. This
 * mirrors the pre-extraction behavior of `applyInteractiveSessionAttack`
 * and the bot `runAttackPhase` loop. The Quick-Sim per-weapon caller
 * SHOULD pass a single-element `weaponIds` array (it loops externally
 * and emits one AttackDeclared per weapon).
 *
 * @param attackerId - Unit ID declaring the attack.
 * @param weaponIds  - Weapon slot IDs in the declaration. May be empty
 *                     (returns `{ kind: 'direct' }`).
 * @param targetId   - Target unit ID. Target hex is read from
 *                     `gameState.units[targetId].position`. When the
 *                     target unit is absent, returns
 *                     `{ kind: 'direct' }` (no indirect can be derived
 *                     without a target hex).
 * @param gameState  - Current game state snapshot.
 * @param grid       - Active hex grid used by LOS / spotter election.
 *
 * @returns Discriminated union — `{ kind: 'direct' }` or
 *          `{ kind: 'indirect', resolution }`. The returned object is
 *          a fresh value; the function does not mutate inputs.
 */
export function prepareAttackContext(
  attackerId: string,
  weaponIds: readonly string[],
  targetId: string,
  gameState: IGameState,
  grid: IHexGrid,
  pilotSpasByUnitId?: Readonly<Record<string, readonly string[]>>,
): IAttackPreResolution {
  const targetUnit = gameState.units[targetId];
  if (!targetUnit) {
    // No target hex available — cannot compute indirect resolution.
    return { kind: 'direct' };
  }
  const targetHex = targetUnit.position;

  for (const weaponId of weaponIds) {
    const result = computeIndirectFireContext(
      attackerId,
      weaponId,
      targetHex,
      gameState,
      grid,
      pilotSpasByUnitId,
    );
    if (result.permitted && result.isIndirect) {
      return { kind: 'indirect', resolution: result };
    }
  }

  return { kind: 'direct' };
}
