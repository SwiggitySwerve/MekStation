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
import type { CampaignArtifactUseReader } from '@/lib/interventions/GmCampaignArtifactUseDurable';
import type { InvalidatedCampaignArtifactRefusal } from '@/lib/interventions/GmCampaignArtifactUseGuard';
import type {
  ICampaignAuthoritativeState,
  ICampaignEvent,
  ICampaignIntent,
} from '@/types/campaign/CampaignSync';

import { readDurableStreamRebuild } from '@/lib/events/journal/EventHistoryDurableRebuild';
import { readDurableCampaignArtifactUse } from '@/lib/interventions/GmCampaignArtifactUseDurable';
import { EXPECTED_HEAD_RESYNC_ACTION } from '@/lib/events/journal/EventHistoryExpectedHead';
import { ROOT_EVENT_BRANCH_ID } from '@/lib/events/journal/EventJournalContract';
import { validateCampaignIntent } from '@/lib/multiplayer/server/CampaignMatchHostIntent';

import type { CampaignAuthorityMode } from './campaignAuthorityMode';
import type {
  CampaignConflictBase,
  CampaignConflictRecoveryAction,
  CampaignConflictRefusalReason,
  ICampaignConflictHead,
} from './campaignConflictDecision';

import { replayCampaignEvents } from '../sync/applyCampaignEvent';
import { freezeCampaignEvent } from '../sync/campaignEventScope';
import {
  appendCampaignCommandBatch,
  computeCampaignStateDigest,
  JournalCampaignEventStore,
  type ICampaignJournalEnvelope,
} from '../sync/JournalCampaignEventStore';
import { diffCampaignFields } from './campaignCommandFieldSet';
import { decideCampaignConflict } from './campaignConflictDecision';
import { campaignStreamRef } from './campaignLaunchHead';

/**
 * Why a command did not commit against the head.
 *
 * The decision's own reasons, plus the one only the append can discover:
 * a race lost between the replay and the commit.
 */
export type CampaignCommandConflictReason =
  | CampaignConflictRefusalReason
  | 'lost-race';

/**
 * The branch a campaign command commits to.
 *
 * A constant because `JournalCampaignEventStore` pins campaign streams to
 * the genesis branch, so this is a FACT about the pipeline rather than an
 * assumption about the journal. When the root-branch pin is lifted this
 * becomes a read of the resolved effective branch, and this function is
 * the only place that has to change.
 */
function campaignCommandBranchId(): string {
  return ROOT_EVENT_BRANCH_ID;
}

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
      /**
       * What the caller should do next, when the block knows.
       *
       * Optional because not every block has an answer: a campaign whose
       * authority is blocked has no action a client can take. A rebuild
       * does - wait and retry - and dropping it here is what left the
       * client rendering a refusal with no recovery at all.
       */
      readonly recoveryAction?: string;
    }
  | ({
      /**
       * The command did not commit because the head was not where it
       * needed to be; nothing was applied.
       *
       * ONE SHAPE FOR BOTH WAYS THAT HAPPENS. A command refused before
       * the append (its base was stale and its fields collided) and one
       * that lost the race at the append are different facts, and
       * `reason` keeps them apart - but both carry the current branch,
       * the current revision, and what to do next, because a client told
       * only "conflict" can do nothing but guess, and the guess it makes
       * is the blind retry task 8.3 removes.
       */
      readonly kind: 'conflict';
      readonly reason: CampaignCommandConflictReason;
      readonly head: ICampaignConflictHead;
      readonly recoveryAction: CampaignConflictRecoveryAction;
      readonly conflictingFields: readonly string[];
    } & {
      /** Present only on a lost race: the sequences the append compared. */
      readonly expectedSequence?: number;
      readonly actualSequence?: number;
    })
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
    }
  /**
   * The effective branch sealed this artifact. Not `rejected`: the
   * client needs the branch and revision, not a reason string.
   */
  | InvalidatedCampaignArtifactRefusal;

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
  /**
   * Seam for a caller that wants to answer later-use itself.
   * Absent means the DURABLE reader, deliberately: the shipped route
   * builds these deps from the journal and the authority alone, so a
   * required field would have left production ungated while the suite
   * passed. An in-memory journal has no manifest table and the reader
   * answers null (usable), which is the same answer it gave before
   * this gate.
   */
  readonly artifactUse?: CampaignArtifactUseReader;
}

export interface ICampaignCommandRequest {
  readonly campaignId: string;
  readonly intent: ICampaignIntent;
  readonly authorPlayerId: string;
  /** Stable identity so a retried command commits at most once. */
  readonly commandId: string;
  readonly ts: string;
  /**
   * The journal revision the client believes it is writing against.
   *
   * Optional, and absent means "I make no claim about the head" - the
   * append's own revision guard still catches a lost race, so a caller
   * that never learned the head keeps working exactly as before. A
   * caller that DOES name one gets the field-level decision.
   */
  readonly expectedRevision?: number;
  /**
   * The client's claim about which fields this command changes.
   *
   * CHECKED, never trusted: the server derives the same set by replaying
   * the command against the base the client named, and a mismatch is
   * refused. A declaration that steered the verdict would let a client
   * describe its overwrite as disjoint and have it serialized.
   */
  readonly declaredFields?: readonly string[];
}

/**
 * Reconstruct what the caller was writing against, so the decision is
 * made over sets the SERVER derived.
 *
 * The base is replayed rather than accepted: journal revision R is the
 * first R events (sequence N lives at streamRevision N + 1), so slicing
 * there and folding gives exactly the state the client held. The
 * command's touched set is then what the intent does TO THAT BASE - not
 * what it would do to the head, which is a different command.
 *
 * A command that will not even validate against the base it names
 * touches nothing on that base. That is deliberately not a fifth refusal
 * reason: any non-empty declaration is then a mismatch and an empty one
 * is undeclared, so both land on `rebase-onto-active-head`, which is the
 * right advice for a client whose derivation is out of step.
 */
function resolveCommandBase(
  request: ICampaignCommandRequest,
  priorEvents: readonly ICampaignEvent[],
  priorState: ICampaignAuthoritativeState,
): CampaignConflictBase {
  const expected = request.expectedRevision;
  if (expected === undefined || expected === priorEvents.length) {
    return { kind: 'at-head' };
  }
  if (expected < 0 || expected > priorEvents.length) {
    return { kind: 'revision-unknown' };
  }
  const baseEvents = priorEvents.slice(0, expected);
  const baseState = replayCampaignEvents(request.campaignId, baseEvents);
  const baseValidation = validateCampaignIntent(
    request.intent,
    baseState,
    request.authorPlayerId,
    request.ts,
  );
  // Sequenced only so the derived events satisfy the event type for the
  // fold. Nothing here is appended - these numbers never leave this
  // function, and the real sequencing happens against the current head.
  const baseDerived = baseValidation.ok
    ? (baseValidation.events.map((event, index) =>
        freezeCampaignEvent({ ...event, sequence: baseEvents.length + index }),
      ) as readonly ICampaignEvent[])
    : [];
  const touchedFields = baseValidation.ok
    ? diffCampaignFields(
        baseState,
        replayCampaignEvents(request.campaignId, [
          ...baseEvents,
          ...baseDerived,
        ]),
      )
    : [];
  return {
    kind: 'reconstructed',
    touchedFields,
    interveningFields: diffCampaignFields(baseState, priorState),
    // An empty declaration is no declaration: a stale command that says
    // it changes nothing, while deriving events, has described something
    // other than itself.
    declaredFields:
      request.declaredFields === undefined ||
      request.declaredFields.length === 0
        ? null
        : request.declaredFields,
  };
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
    return {
      kind: 'blocked',
      reason: rebuilding.code,
      // Carried, not dropped: the rebuild arm is the one block that knows
      // what to do next, and a client told only PROJECTION_REBUILDING has
      // to guess whether to wait or give up.
      recoveryAction: rebuilding.action,
    };
  }

  const store = new JournalCampaignEventStore(deps.journal);
  const priorEvents = await store.getEvents(request.campaignId, 0);
  // The state to validate against comes from the STREAM. A caller
  // supplying it could authorise its own command.
  const priorState = replayCampaignEvents(request.campaignId, priorEvents);

  // The command-based conflict decision (task 8.4). A refusal returns
  // here, BEFORE anything is derived or appended - which is how "SHALL
  // append nothing" is structural rather than remembered. `current` and
  // `revalidate` both fall through to the validation below, and that
  // validation runs against `priorState`: revalidating a disjoint stale
  // command against the current revision is not a separate code path, it
  // is the ordinary one.
  const head: ICampaignConflictHead = {
    branchId: campaignCommandBranchId(),
    revision: priorEvents.length,
  };
  const decision = decideCampaignConflict(
    head,
    resolveCommandBase(request, priorEvents, priorState),
  );
  if (decision.kind === 'refused') {
    return {
      kind: 'conflict',
      reason: decision.reason,
      head: decision.head,
      recoveryAction: decision.recoveryAction,
      conflictingFields: decision.conflictingFields,
    };
  }

  // AcceptContract names the contract id. Every other guest intent
  // names none: AllocateSalvage carries value + recoveredUnit and no
  // matchId; HirePilot, SpendFunds, AdvanceDay, and RemoveParticipant
  // name no sealed artifact. Do not invent ids.
  const namedArtifact =
    request.intent.kind === 'AcceptContract'
      ? {
          artifactKind: 'contract' as const,
          artifactId: request.intent.payload.contract.contractId,
        }
      : null;
  if (namedArtifact !== null) {
    const refused = (deps.artifactUse ?? readDurableCampaignArtifactUse)(
      campaignStreamRef(request.campaignId),
      namedArtifact,
    );
    if (refused !== null) {
      return refused;
    }
  }

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
      reason: 'lost-race',
      // The head from the FAILED APPEND, never the one replayed above:
      // by definition something committed in between, so the replayed
      // revision is already history and sending a client back to it
      // would send it somewhere that no longer exists.
      // `actualNextSequence` carries the journal's `actualRevision`, and
      // for a campaign stream the next sequence and the revision are the
      // same number (sequence N lives at revision N + 1), so this needs
      // no conversion - only the right source.
      head: {
        branchId: campaignCommandBranchId(),
        revision: appended.actualNextSequence,
      },
      // A lost race is not a field collision: this command never got to
      // be compared against anything. Resync is the honest advice.
      recoveryAction: EXPECTED_HEAD_RESYNC_ACTION,
      conflictingFields: [],
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
