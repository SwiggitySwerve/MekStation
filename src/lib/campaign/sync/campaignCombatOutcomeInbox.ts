/**
 * Combat-outcome inbox receipts for the journal campaign event store.
 *
 * Extracted from `JournalCampaignEventStore` so that adapter stays under
 * the 400-line lint cap after capability-port field declarations. The
 * inbox is its own write path: consequence events and the outcome
 * receipt commit in one transaction, and a replay returns the original
 * range without entering the consequence path.
 */

import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

import { SQLiteEventJournalWriter } from '@/lib/events/journal/SQLiteEventJournalWriter';

import {
  type CampaignCombatOutcomeInboxResult,
  type ICampaignCombatOutcomeReceipt,
} from './ICampaignEventStore';
import {
  toJournalBatch,
  type ICampaignJournalEnvelope,
} from './JournalCampaignEventStore';

interface ICampaignCombatOutcomeInboxRow {
  readonly outcome_id: string;
  readonly outcome_version: number;
  readonly campaign_id: string;
  readonly command_id: string;
  readonly command_digest: string;
  readonly first_stream_revision: number;
  readonly last_stream_revision: number;
  readonly first_commit_position: number;
  readonly last_commit_position: number;
  readonly received_at: string;
}

function receiptOf(
  row: ICampaignCombatOutcomeInboxRow,
): ICampaignCombatOutcomeReceipt {
  return {
    outcomeId: row.outcome_id,
    outcomeVersion: row.outcome_version,
    campaignId: row.campaign_id,
    commandId: row.command_id,
    commandDigest: row.command_digest,
    firstStreamRevision: row.first_stream_revision,
    lastStreamRevision: row.last_stream_revision,
    firstCommitPosition: row.first_commit_position,
    lastCommitPosition: row.last_commit_position,
    receivedAt: row.received_at,
  };
}

/**
 * Commit campaign consequences and their combat-outcome receipt as one
 * transaction. The receipt lookup happens before journal append, so a replay
 * returns the original range without entering the consequence path.
 */
let failReceiptInsertForTests = false;

/** Test-only: crash between the consequence append and the receipt
 * insert, inside the extension transaction - the crash seam the
 * rollback proof drives without depending on engine CHECK behavior. */
export function _setFailReceiptInsertForTests(fail: boolean): void {
  failReceiptInsertForTests = fail;
}

export async function appendCampaignCombatOutcomeBatch(
  journal: SQLiteEventJournalWriter<ICampaignJournalEnvelope>,
  input: {
    readonly campaignId: string;
    readonly outcomeId: string;
    readonly outcomeVersion: number;
    readonly commandId: string;
    readonly events: readonly ICampaignEvent[];
    readonly expectedPostStateDigest: string;
  },
): Promise<CampaignCombatOutcomeInboxResult> {
  const batch = toJournalBatch(input);
  return journal.appendWithExtension(batch, (db, append) => {
    const accepted = db
      .prepare(
        `SELECT outcome_id, outcome_version, campaign_id, command_id,
                command_digest, first_stream_revision, last_stream_revision,
                first_commit_position, last_commit_position, received_at
           FROM campaign_combat_outcome_inbox
          WHERE outcome_id = ?`,
      )
      .get(input.outcomeId) as ICampaignCombatOutcomeInboxRow | undefined;
    if (accepted) {
      const receipt = receiptOf(accepted);
      if (receipt.outcomeVersion === input.outcomeVersion) {
        return { kind: 'duplicate', receipt };
      }
      return {
        kind: 'outcome-version-conflict',
        outcomeId: input.outcomeId,
        acceptedVersion: receipt.outcomeVersion,
        receivedVersion: input.outcomeVersion,
      };
    }

    const appended = append();
    if (appended.kind !== 'committed') {
      if (appended.kind === 'revision-conflict') {
        return {
          kind: 'sequence-conflict',
          expectedNextSequence: appended.expectedRevision,
          actualNextSequence: appended.actualRevision,
        };
      }
      if (appended.kind === 'command-identity-conflict') {
        return { kind: 'duplicate-command', commandId: appended.commandId };
      }
      return { kind: 'integrity-conflict' };
    }
    const receipt: ICampaignCombatOutcomeReceipt = {
      outcomeId: input.outcomeId,
      outcomeVersion: input.outcomeVersion,
      campaignId: input.campaignId,
      commandId: appended.receipt.commandId,
      commandDigest: appended.receipt.commandDigest,
      firstStreamRevision: appended.receipt.firstStreamRevision,
      lastStreamRevision: appended.receipt.lastStreamRevision,
      firstCommitPosition: appended.receipt.firstCommitPosition,
      lastCommitPosition: appended.receipt.lastCommitPosition,
      receivedAt: appended.receipt.recordedAt,
    };
    if (failReceiptInsertForTests) {
      throw new Error('test-crash-before-receipt-insert');
    }
    db.prepare(
      `INSERT INTO campaign_combat_outcome_inbox
         (outcome_id, outcome_version, campaign_id, command_id, command_digest,
          first_stream_revision, last_stream_revision, first_commit_position,
          last_commit_position, received_at)
       VALUES (@outcomeId, @outcomeVersion, @campaignId, @commandId,
               @commandDigest, @firstStreamRevision, @lastStreamRevision,
               @firstCommitPosition, @lastCommitPosition, @receivedAt)`,
    ).run(receipt);
    return { kind: 'committed', receipt };
  });
}
