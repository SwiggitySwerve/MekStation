/**
 * Encounter Broken-Reference Detection Helper
 *
 * Pure function — no IO, no logging, no mutation. Compares the hydrated
 * `IEncounter` against the raw stored force-id strings to report which
 * sides are "broken" (i.e. a forceId is stored on the row but the hydrated
 * playerForce / opponentForce came back as null because the force was
 * deleted).
 *
 * Used by the encounter list page (broken-pill rendering) and the encounter
 * detail page (repair banner) so both surfaces share the same predicate
 * without each having to re-implement it.
 *
 * The shape of `rawForceIds` mirrors what `EncounterRepository.getEncounterWithRawIds`
 * (and the list variant) returns — `string | null` for each side.
 *
 * @spec openspec/changes/repair-broken-encounter-drafts/specs/game-session-management/spec.md
 *       (Requirement: Broken-Reference Detection Helper)
 */

import type { IEncounter } from '@/types/encounter';

export interface IRawForceIds {
  readonly playerForceId: string | null;
  readonly opponentForceId: string | null;
}

export interface IEncounterBrokenRefs {
  readonly playerForceMissing: boolean;
  readonly opponentForceMissing: boolean;
}

/**
 * Detect orphaned force references on an encounter.
 *
 * `playerForceMissing` is true if and only if a forceId was stored on the
 * row (rawForceIds.playerForceId !== null) AND the hydration boundary set
 * `encounter.playerForce` to null (resolver returned null). Same predicate
 * for opponent.
 *
 * NOTE: an `undefined` `encounter.playerForce` (slot was never set) is NOT
 * "missing" — it's empty. Only the explicit-null case from the hydration
 * boundary counts as missing. The pure-helper unit tests pin this behavior.
 */
export function encounterBrokenRefs(
  encounter: IEncounter,
  rawForceIds: IRawForceIds,
): IEncounterBrokenRefs {
  const playerForceMissing =
    rawForceIds.playerForceId !== null && encounter.playerForce === null;
  const opponentForceMissing =
    rawForceIds.opponentForceId !== null && encounter.opponentForce === null;
  return { playerForceMissing, opponentForceMissing };
}
