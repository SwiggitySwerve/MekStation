/**
 * A mission choice goes stale when the units behind it do
 * (umbrella task 9.2, the readiness half).
 *
 * A participation record is a player saying "this force, this mission,
 * deploying or not". The campaign then keeps moving underneath it —
 * days advance, battles resolve, mechs are destroyed — and nothing
 * revisited that choice.
 *
 * The revision counter that looks like it should have caught this does
 * not: `ICampaignHostRegistryEntry.advanceRevision` is never called by
 * production code, so `entry.revision` is frozen at registration and the
 * `stale-revision` refusal in participation admission can never fire.
 * Grepped rather than assumed — the only references are one test and one
 * test stub.
 *
 * The harm was bounded but landed at the worst moment. A stale choice
 * naming a destroyed unit is caught at LAUNCH, by
 * `materializeCampaignMissionEncounter` throwing "roster contains
 * blocked unit" — so players discovered it as a failed launch rather
 * than as a choice that quietly needed remaking.
 *
 * COMPUTED, NOT STORED. This filters at read time from current state
 * rather than clearing records when something happens. A stored
 * "cleared" flag has to be maintained by every path that can invalidate
 * a unit, and the one path that forgets leaves a record that claims to
 * be fresh. A projection cannot drift from the state it is projected
 * from.
 *
 * AND ONLY THE AFFECTED ONE. The task's wording is exact: clear only the
 * readiness a change actually touched. One player losing a mech must not
 * reset the other player's choice.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md (9.2)
 */

import type { ICampaignRosterUnit } from '@/types/campaign/CampaignSync';

import type { ICampaignParticipationRecord } from './CampaignHostRegistry';

/**
 * Whether a unit can still be taken on a mission.
 *
 * A unit MISSING from the roster is unusable too, not just one marked
 * destroyed — it was removed from the campaign, which is at least as
 * final.
 */
export function unitIsDeployable(
  unitId: string,
  rosterUnits: Readonly<Record<string, ICampaignRosterUnit>>,
): boolean {
  const unit = rosterUnits[unitId];
  if (unit === undefined) return false;
  return unit.status !== 'destroyed';
}

/**
 * Whether this participation still stands against the current roster.
 *
 * A `command-hq` choice survives anything: that player is not putting
 * units on the map, so the state of their force cannot invalidate it.
 * Only a `deploy` choice depends on its units still existing.
 */
export function participationIsFresh(
  record: ICampaignParticipationRecord,
  rosterUnits: Readonly<Record<string, ICampaignRosterUnit>>,
): boolean {
  if (record.choice !== 'deploy') return true;
  return record.force.unitIds.every((unitId) =>
    unitIsDeployable(unitId, rosterUnits),
  );
}
