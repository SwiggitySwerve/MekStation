/**
 * Replay retained source commands onto a correction candidate
 * (umbrella 16.2, Seam C1c-ii).
 *
 * This module does not decide what to keep. A bare `ICampaignEvent[]`
 * has already lost the D10 batch boundary, so each retained row still
 * carries the stored `commandId` it arrived with. Groups are replayed
 * as one atomic `appendCampaignCommandBatch` each.
 *
 * Three numbers that are easy to mix up, and why they stay separate:
 *
 * - Campaign SEQUENCE is stream-global. A dropped command leaves a
 *   hole in sequence that the retained rows keep (C5 can still be
 *   sequence 6).
 * - Journal REVISION is per branch. The candidate is anchored at a
 *   base and numbers from there. After a drop, sequence and revision
 *   live in the same stored row as different values (finding #70).
 * - `expectedRevision` is the head the batch must land ON, read from
 *   `readCampaignBranchAnchor` and re-read after every group. A
 *   once-and-arithmetic answer (`base + groupIndex`) is right by
 *   accident when every group is one event, or when the multi-event
 *   group is last. A drop plus a two-event group that is not last
 *   is the case that exposes it.
 *
 * Command identity is journal-global and is checked BEFORE the
 * revision guard. Reusing the source command id does not throw: it
 * returns the original receipt as a plausible commit. The derived id
 * is what makes the candidate's receipt (event ids, count, revisions)
 * a different object from the source's cached one.
 *
 * A colon is not admissible inside that derived id. Stored event ids
 * are `${commandId}:${commandIndex}` (`toAppendEvent`); a first-colon
 * split of `<branch>:<source>:<index>` takes the branch as the command
 * and the source as the index. Index 1 of a two-event group is the
 * first place hydrateEvent sees the broken pair. `--` is admitted by
 * DurableIdSchema (`z.string().trim().min(1)`) and cannot be that
 * split.
 *
 * Stops at a verified, materialisable candidate. No activation, no
 * family derivation, no manifest, no checkpoint.
 */

import type Database from 'better-sqlite3';

import type { IEventJournal } from '@/lib/events/journal/EventJournalContract';
import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

import {
  appendCampaignCommandBatch,
  type CampaignBatchAppendResult,
  type ICampaignJournalEnvelope,
} from '@/lib/campaign/sync/JournalCampaignEventStore';

import { readCampaignBranchAnchor } from './CampaignBranchAnchor';

/** One retained source event, still carrying the D10 command it belonged to. */
export interface IRetainedSourceEvent {
  readonly commandId: string;
  readonly event: ICampaignEvent;
}

export interface ICampaignReplacementReplayInput {
  readonly campaignId: string;
  readonly candidateBranchId: string;
  readonly events: readonly IRetainedSourceEvent[];
}

export interface ICampaignReplacementReplayReceipt {
  readonly sourceCommandId: string;
  readonly receipt: Extract<
    CampaignBatchAppendResult,
    { readonly kind: 'committed' }
  >['receipt'];
}

interface ICommandGroup {
  readonly commandId: string;
  readonly events: ICampaignEvent[];
}

/**
 * Candidate-scoped command id. See the module header for why a colon
 * is not admissible and why the source id must not be reused.
 */
export function candidateScopedCommandId(
  candidateBranchId: string,
  sourceCommandId: string,
): string {
  return `${candidateBranchId}--${sourceCommandId}`;
}

/**
 * Group retained rows by the stored command id, in first-seen order.
 *
 * Flattening this to one event per batch would still commit, and would
 * even land at the right revisions if the anchor is re-read - but each
 * source command would produce more than one receipt.
 */
function groupByStoredCommandId(
  events: readonly IRetainedSourceEvent[],
): readonly ICommandGroup[] {
  const groups: ICommandGroup[] = [];
  const indexByCommand = new Map<string, number>();
  for (const item of events) {
    const existing = indexByCommand.get(item.commandId);
    if (existing === undefined) {
      indexByCommand.set(item.commandId, groups.length);
      groups.push({ commandId: item.commandId, events: [item.event] });
    } else {
      groups[existing].events.push(item.event);
    }
  }
  return groups;
}

/**
 * Replay each retained source command onto the candidate as one batch.
 *
 * `journal` and `db` must be the same handle: the anchor is read from
 * the tables the writer will append against.
 */
export async function replayCampaignReplacement(
  journal: IEventJournal<ICampaignJournalEnvelope>,
  db: Database.Database,
  input: ICampaignReplacementReplayInput,
): Promise<readonly ICampaignReplacementReplayReceipt[]> {
  const receipts: ICampaignReplacementReplayReceipt[] = [];
  for (const group of groupByStoredCommandId(input.events)) {
    // Re-read every time. The previous group may have moved the head
    // by more than one revision, and sequence is not a substitute.
    const anchor = readCampaignBranchAnchor(
      db,
      input.campaignId,
      input.candidateBranchId,
    );
    const result = await appendCampaignCommandBatch(journal, {
      campaignId: input.campaignId,
      commandId: candidateScopedCommandId(
        input.candidateBranchId,
        group.commandId,
      ),
      events: group.events,
      expectedPostStateDigest: null,
      branchId: input.candidateBranchId,
      expectedRevision: anchor.revision,
    });
    if (result.kind !== 'committed') {
      throw new Error(
        `Replacement replay of command '${group.commandId}' onto '${input.candidateBranchId}' was refused: ${result.kind}`,
      );
    }
    receipts.push({
      sourceCommandId: group.commandId,
      receipt: result.receipt,
    });
  }
  return receipts;
}
