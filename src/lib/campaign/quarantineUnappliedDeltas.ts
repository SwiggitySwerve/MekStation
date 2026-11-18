/**
 * Quarantine for player deltas the post-battle apply could not attribute
 * (R3). The delta is written to no unit; a flag in the campaign payload
 * tells the player, and the delta itself goes to the device-local
 * quarantine store outside the payload.
 *
 * Never lost (review N3): until its quarantine write is CONFIRMED, the
 * campaign payload carries a pending record holding the delta itself
 * (`pendingQuarantineRecords`). It does not depend on the retained
 * outcome (pruned after 31 campaign days) or on the flag (the player may
 * dismiss it). The apply starts the write at its commit point and releases
 * the records once it resolves; every load writes whatever is still
 * pending (`writePendingQuarantineRecords`). Re-writes deduplicate.
 */

import type { ILegacyCombatStateQuarantineStore } from '@/services/persistence/legacyCombatStateQuarantineStore';
import type { ICampaign } from '@/types/campaign/Campaign';
import type {
  ILegacyCombatStateFlag,
  IUnappliedDeltaQuarantineRecord,
} from '@/types/campaign/LegacyCombatStateMigration';

import { createIndexedDbLegacyCombatStateQuarantineStore } from '@/services/persistence/legacyCombatStateQuarantineStore';
import { getCampaignStoreForRoster } from '@/stores/campaign/campaignStoreAccessor';
import {
  legacyCombatStateFlagKey,
  pendingQuarantineKey,
} from '@/types/campaign/LegacyCombatStateMigration';
import { logger } from '@/utils/logger';

import type {
  IOutcomeUnitWritePlan,
  IUnappliedLegacyDelta,
} from './battleUnitManifest';

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

/** The quarantine records (each carrying its delta) for a battle's unapplied deltas. */
export function unappliedDeltaRecords(
  campaignId: string,
  matchId: string,
  unapplied: readonly IUnappliedLegacyDelta[],
  flags: readonly ILegacyCombatStateFlag[],
): IUnappliedDeltaQuarantineRecord[] {
  return unapplied.map(({ delta }, index) => ({
    source: 'unapplied-delta',
    campaignId,
    sessionUnitId: delta.unitId,
    matchId,
    delta,
    flag: flags[index],
  }));
}

/** `existing` plus each added record not already pending. */
export function withPendingQuarantineRecords(
  existing: readonly IUnappliedDeltaQuarantineRecord[] | undefined,
  added: readonly IUnappliedDeltaQuarantineRecord[],
): readonly IUnappliedDeltaQuarantineRecord[] {
  const known = new Set((existing ?? []).map(pendingQuarantineKey));
  return [
    ...(existing ?? []),
    ...added.filter((record) => !known.has(pendingQuarantineKey(record))),
  ];
}

/**
 * What applying a battle's unapplied deltas adds to the campaign: their
 * flags and their pending quarantine records (each carrying its delta).
 */
export function unappliedDeltaEffects(
  campaign: Pick<
    ICampaign,
    'id' | 'legacyCombatStateFlags' | 'pendingQuarantineRecords'
  >,
  matchId: string,
  plan: Pick<IOutcomeUnitWritePlan, 'unapplied'>,
): {
  readonly records: readonly IUnappliedDeltaQuarantineRecord[];
  readonly campaignFields: Partial<
    Pick<ICampaign, 'legacyCombatStateFlags' | 'pendingQuarantineRecords'>
  >;
} {
  if (plan.unapplied.length === 0) return { records: [], campaignFields: {} };
  const flags = unappliedDeltaFlags(plan.unapplied, matchId);
  const records = unappliedDeltaRecords(
    campaign.id,
    matchId,
    plan.unapplied,
    flags,
  );
  return {
    records,
    campaignFields: {
      legacyCombatStateFlags: withLegacyCombatStateFlags(
        campaign.legacyCombatStateFlags,
        flags,
      ),
      pendingQuarantineRecords: withPendingQuarantineRecords(
        campaign.pendingQuarantineRecords,
        records,
      ),
    },
  };
}

/**
 * Drop `confirmed` from the live campaign's pending records (the drop is an
 * ordinary edit, so autosave persists it). A different or absent live
 * campaign is left alone; the records then stay pending until a load
 * writes them again.
 */
export function releasePendingQuarantineRecords(
  campaignId: string,
  confirmed: readonly IUnappliedDeltaQuarantineRecord[],
): void {
  const store = getCampaignStoreForRoster();
  const campaign = store?.getState().campaign;
  if (!store || !campaign || campaign.id !== campaignId) return;
  const done = new Set(confirmed.map(pendingQuarantineKey));
  const pending = campaign.pendingQuarantineRecords ?? [];
  const remaining = pending.filter(
    (record) => !done.has(pendingQuarantineKey(record)),
  );
  if (remaining.length === pending.length) return;
  store.getState().updateCampaign({ pendingQuarantineRecords: remaining });
}

/**
 * Write `records` and release them once the write resolves. A failure is
 * logged; the records stay pending in the payload for the next load.
 */
export async function writePendingQuarantineRecords(
  campaignId: string,
  records: readonly IUnappliedDeltaQuarantineRecord[],
  quarantine: ILegacyCombatStateQuarantineStore,
): Promise<boolean> {
  if (records.length === 0) return true;
  try {
    await quarantine.put(campaignId, records);
  } catch (error) {
    logger.warn(
      '[quarantineUnappliedDeltas] Could not store unapplied deltas; they stay pending in the campaign and are written again on the next load.',
      error,
    );
    return false;
  }
  releasePendingQuarantineRecords(campaignId, records);
  return true;
}

/** Fire-and-forget at the apply's commit point. */
export function quarantineUnappliedDeltas(
  campaignId: string,
  records: readonly IUnappliedDeltaQuarantineRecord[],
): void {
  if (records.length === 0) return;
  let quarantine: ILegacyCombatStateQuarantineStore;
  try {
    quarantine = createIndexedDbLegacyCombatStateQuarantineStore();
  } catch (error) {
    logger.warn(
      '[quarantineUnappliedDeltas] No quarantine store; the deltas stay pending in the campaign.',
      error,
    );
    return;
  }
  void writePendingQuarantineRecords(campaignId, records, quarantine);
}
