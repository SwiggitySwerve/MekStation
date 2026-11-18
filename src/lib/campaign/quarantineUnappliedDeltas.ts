/**
 * Quarantine for player deltas the post-battle apply could not attribute
 * (R3). The delta is written to no unit; a flag in the campaign payload
 * tells the player, and the delta itself goes to the device-local
 * quarantine store outside the payload.
 *
 * The apply is a pure day processor, so its write is fire-and-forget at the
 * commit point. It is not the only copy: the delta stays in the applied
 * outcome's `recentlyAppliedOutcomes` record (31 campaign days), and every
 * load re-quarantines flagged deltas from there (`unappliedDeltaRecordsFor`),
 * so a failed write is repaired on the next load. Re-writes deduplicate.
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import type {
  ILegacyCombatStateFlag,
  ILegacyCombatStateQuarantineRecord,
} from '@/types/campaign/LegacyCombatStateMigration';

import { createIndexedDbLegacyCombatStateQuarantineStore } from '@/services/persistence/legacyCombatStateQuarantineStore';
import { legacyCombatStateFlagKey } from '@/types/campaign/LegacyCombatStateMigration';
import { logger } from '@/utils/logger';

import type { IUnappliedLegacyDelta } from './battleUnitManifest';

/** The payload flags for a battle's unapplied deltas. */
export function unappliedDeltaFlags(
  unapplied: readonly IUnappliedLegacyDelta[],
  matchId: string,
): ILegacyCombatStateFlag[] {
  return unapplied.map(({ delta, reason, candidates }) => ({
    kind: 'unapplied-delta',
    sessionUnitId: delta.unitId,
    reason,
    candidateRosterUnitIds: [...candidates],
    matchIds: [matchId],
  }));
}

/** `existing` plus each added flag not already present. */
export function withLegacyCombatStateFlags(
  existing: readonly ILegacyCombatStateFlag[] | undefined,
  added: readonly ILegacyCombatStateFlag[],
): readonly ILegacyCombatStateFlag[] {
  const known = new Set((existing ?? []).map(legacyCombatStateFlagKey));
  return [
    ...(existing ?? []),
    ...added.filter((flag) => !known.has(legacyCombatStateFlagKey(flag))),
  ];
}

/** Fire-and-forget: store each unapplied delta outside the payload. */
export function quarantineUnappliedDeltas(
  campaignId: string,
  matchId: string,
  unapplied: readonly IUnappliedLegacyDelta[],
  flags: readonly ILegacyCombatStateFlag[],
): void {
  if (unapplied.length === 0) return;
  const records: ILegacyCombatStateQuarantineRecord[] = unapplied.map(
    ({ delta }, index) => ({
      source: 'unapplied-delta',
      campaignId,
      sessionUnitId: delta.unitId,
      matchId,
      delta,
      flag: flags[index],
    }),
  );
  const failed = (error: unknown): void => {
    logger.error(
      '[quarantineUnappliedDeltas] Could not store unapplied deltas now; the next load re-quarantines them from the retained outcomes.',
      error,
    );
  };
  try {
    createIndexedDbLegacyCombatStateQuarantineStore()
      .put(campaignId, records)
      .catch(failed);
  } catch (error) {
    failed(error);
  }
}

/** Quarantine records for the campaign's flagged unapplied deltas that are still retained. */
export function unappliedDeltaRecordsFor(
  campaign: Pick<
    ICampaign,
    'id' | 'legacyCombatStateFlags' | 'recentlyAppliedOutcomes'
  >,
): ILegacyCombatStateQuarantineRecord[] {
  const outcomes = new Map(
    (campaign.recentlyAppliedOutcomes ?? []).map((outcome) => [
      outcome.matchId,
      outcome,
    ]),
  );
  return (campaign.legacyCombatStateFlags ?? []).flatMap((flag) => {
    if (flag.kind !== 'unapplied-delta') return [];
    return flag.matchIds.flatMap((matchId) => {
      const delta = outcomes
        .get(matchId)
        ?.unitDeltas.find(
          (candidate) => candidate.unitId === flag.sessionUnitId,
        );
      return delta
        ? [
            {
              source: 'unapplied-delta' as const,
              campaignId: campaign.id,
              sessionUnitId: flag.sessionUnitId,
              matchId,
              delta,
              flag,
            },
          ]
        : [];
    });
  });
}
