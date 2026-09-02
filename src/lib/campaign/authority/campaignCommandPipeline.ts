/**
 * The source command pipeline for one campaign (task 1.2; design D4/D10).
 *
 * command → validate → append (fsync) → acknowledge → project, in one
 * place, for campaigns whose authority is the journal.
 *
 * Until now that sequence only existed inside `CampaignMatchHost`, which
 * means it only ran when a MULTIPLAYER session happened to be open. A
 * campaign is not more or less authoritative depending on whether anyone
 * else is connected, so the pipeline is lifted out of the session and
 * keyed on authority instead.
 *
 * Three properties the ordering exists to give, none of which survive
 * being rearranged for convenience:
 *
 * - **Validation runs against the projected stream, never against
 *   anything the caller supplied.** A caller that could hand in the
 *   state to validate against could authorise its own command by
 *   describing a campaign that can afford it.
 * - **The append carries the expected post-state digest**, so a command
 *   that would produce a state the source did not derive fails at the
 *   commit rather than after it.
 * - **The acknowledgement is the projection AFTER the commit**, replayed
 *   from the stream rather than assumed from the pre-state plus the
 *   events. Assuming is how a projector bug becomes invisible: the
 *   caller would be told the state the source INTENDED, which is exactly
 *   the state a broken reducer fails to produce.
 *
 * Rejections stay typed and distinct all the way out. A command refused
 * because the campaign cannot afford it, one refused because the
 * campaign's authority is blocked, and one that lost a race are three
 * different facts, and a caller that cannot tell them apart will retry
 * the ones that can never succeed.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D4, D10)
 * @spec openspec/changes/design-campaign-authority-and-sync/specs/campaign-authority/spec.md
 */

import type { IEventHistoryStreamRef } from '@/lib/events/journal/EventHistoryBranchContract';
import type { StreamRebuildRefusal } from '@/lib/events/journal/EventHistoryCommandAdmission';
import type { IEventJournal } from '@/lib/events/journal/EventJournalContract';
import type {
  ICampaignAuthoritativeState,
  ICampaignEvent,
  ICampaignIntent,
} from '@/types/campaign/CampaignSync';

import { readDurableStreamRebuild } from '@/lib/events/journal/EventHistoryDurableRebuild';
import { validateCampaignIntent } from '@/lib/multiplayer/server/CampaignMatchHostIntent';

import type { CampaignAuthorityMode } from './campaignAuthorityMode';

import { replayCampaignEvents } from '../sync/applyCampaignEvent';
import { freezeCampaignEvent } from '../sync/campaignEventScope';
import {
  appendCampaignCommandBatch,
  computeCampaignStateDigest,
  JournalCampaignEventStore,
  type ICampaignJournalEnvelope,
} from '../sync/JournalCampaignEventStore';
import { campaignStreamRef } from './campaignLaunchHead';

/** Every way a command can fail to commit, kept distinguishable. */
export type CampaignCommandResult =
  | {
      readonly kind: 'committed';
      readonly events: readonly ICampaignEvent[];
      /** Projected from the stream AFTER the commit, never assumed. */
      readonly state: ICampaignAuthoritativeState;
    }
  | {
      /** The campaign cannot do this: no funds, no standing, bad target. */
      readonly kind: 'rejected';
      readonly reason: string;
    }
  | {
      /** Authority says no log is safe to write (task 5.7). */
      readonly kind: 'blocked';
      readonly reason: string;
    }
  | {
      /** Another writer got there first; nothing was applied. */
      readonly kind: 'conflict';
      readonly expectedSequence: number;
      readonly actualSequence: number;
    }
  | {
      /** This exact command already committed. Not an error. */
      readonly kind: 'duplicate';
      readonly commandId: string;
    }
  | {
      /**
       * The command committed but the stream did not replay to the state
       * the source derived. Nothing is acknowledged as successful.
       */
      readonly kind: 'divergent';
      readonly expectedDigest: string;
      readonly actualDigest: string;
    };

/**
 * Reads whether a correction lease is rebuilding a stream's history.
 * Same signature as the durable reader, which is the default.
 */
export type CampaignRebuildReader = (
  stream: IEventHistoryStreamRef,
) => StreamRebuildRefusal | null;

export interface ICampaignCommandDeps {
  readonly journal: IEventJournal<ICampaignJournalEnvelope>;
  /** Per-campaign authority (task 5.7). Commands run only where a log is. */
  readonly authority: CampaignAuthorityMode;
  /**
   * Seam for a caller that wants to answer the rebuild question itself.
   * Absent means the DURABLE reader, deliberately: the shipped route
   * builds these deps from the journal and the authority alone, so a
   * required field would have left production ungated while the suite
   * passed. An in-memory journal has no lease table and the reader
   * answers null, which is the same answer it gave before this gate.
   */
  readonly rebuild?: CampaignRebuildReader;
}

export interface ICampaignCommandRequest {
  readonly campaignId: string;
  readonly intent: ICampaignIntent;
  readonly authorPlayerId: string;
  /** Stable identity so a retried command commits at most once. */
  readonly commandId: string;
  readonly ts: string;
}

/**
 * Runs one command against the campaign's journal.
 *
 * Only a journal-authority campaign is eligible. A snapshot-authority
 * campaign is NOT an error here - it simply has not migrated, and its
 * mutations still run on the pre-cutover path. Saying so explicitly
 * beats a generic refusal a caller would read as a fault.
 */
export async function executeCampaignCommand(
  deps: ICampaignCommandDeps,
  request: ICampaignCommandRequest,
): Promise<CampaignCommandResult> {
  if (deps.authority.kind === 'blocked') {
    return { kind: 'blocked', reason: deps.authority.reason };
  }
  if (deps.authority.kind !== 'journal') {
    return { kind: 'blocked', reason: 'campaign-not-on-journal-authority' };
  }
  // A correction lease is rebuilding this campaign's history. `blocked`
  // rather than `rejected`: the campaign may well be able to afford the
  // command, and a caller told "rejected" would give up on something
  // that succeeds the moment the rebuild lands. Refused before the
  // stream is even read, so nothing is appended to the history a
  // correction is about to replace, and nothing is queued to drain
  // afterwards. Only the rebuild arm of the shared admission is
  // consumed: this request carries no client-claimed expected head, so
  // the staleness arm has nothing here to compare.
  const rebuilding = (deps.rebuild ?? readDurableStreamRebuild)(
    campaignStreamRef(request.campaignId),
  );
  if (rebuilding !== null) {
    return { kind: 'blocked', reason: rebuilding.code };
  }

  const store = new JournalCampaignEventStore(deps.journal);
  const priorEvents = await store.getEvents(request.campaignId, 0);
  // The state to validate against comes from the STREAM. A caller
  // supplying it could authorise its own command.
  const priorState = replayCampaignEvents(request.campaignId, priorEvents);

  const validation = validateCampaignIntent(
    request.intent,
    priorState,
    request.authorPlayerId,
    request.ts,
  );
  if (!validation.ok) {
    return { kind: 'rejected', reason: validation.reason };
  }
  if (validation.events.length === 0) {
    // A validated intent that derives nothing would append an empty
    // batch and acknowledge a commit that never happened.
    return { kind: 'rejected', reason: 'no-derived-events' };
  }

  const nextSequence = priorEvents.length;
  const sequenced = validation.events.map((event, index) =>
    freezeCampaignEvent({ ...event, sequence: nextSequence + index }),
  ) as readonly ICampaignEvent[];

  // Derived on a scratch projection so the digest describes the state
  // this batch SHOULD produce, computed before anything is written.
  const expectedState = replayCampaignEvents(request.campaignId, [
    ...priorEvents,
    ...sequenced,
  ]);
  const expectedDigest = computeCampaignStateDigest(expectedState);

  const appended = await appendCampaignCommandBatch(deps.journal, {
    campaignId: request.campaignId,
    commandId: request.commandId,
    events: sequenced,
    expectedPostStateDigest: expectedDigest,
  });
  if (appended.kind === 'sequence-conflict') {
    return {
      kind: 'conflict',
      expectedSequence: appended.expectedNextSequence,
      actualSequence: appended.actualNextSequence,
    };
  }
  if (appended.kind === 'command-identity-conflict') {
    return { kind: 'duplicate', commandId: appended.commandId };
  }
  if (appended.kind !== 'committed') {
    return { kind: 'rejected', reason: 'journal-rejected-batch' };
  }

  // Acknowledge from the stream, not from the intent. Replaying is what
  // makes a projector bug visible instead of self-confirming.
  const committedEvents = await store.getEvents(request.campaignId, 0);
  const projected = replayCampaignEvents(request.campaignId, committedEvents);
  const actualDigest = computeCampaignStateDigest(projected);
  if (actualDigest !== expectedDigest) {
    return { kind: 'divergent', expectedDigest, actualDigest };
  }

  return { kind: 'committed', events: sequenced, state: projected };
}
