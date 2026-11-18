/**
 * DECIDE -> APPEND-AT-REVISION -> APPLY-COMMITTED-BATCH -> VERIFY -> PUBLISH.
 * Apply consumes the committed envelope; mismatch rebuilds from the journal.
 * Failures fold into one host-side recovery result (task 2.4).
 */

import type { IIntent, IServerMessage } from '@/types/multiplayer/Protocol';

import { InteractiveSession } from '@/engine/InteractiveSession';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { nowIso } from '@/types/multiplayer/Protocol';
import {
  prepareEventForSerialization,
  UnreadableStoredEventError,
} from '@/utils/gameplay/gameEvents/serialization';
import { hydrateGameSessionFromEvents } from '@/utils/gameplay/gameSession';

import type { IMatchCommandReceipt } from './matchCommandBatch';
import type {
  IJournalAuthorityPathResult,
  JournalAuthorityRecovery,
} from './matchJournalAuthority';
import type {
  IJournalAuthorityHostHandle,
  IServerMatchHostIntentContext,
} from './ServerMatchHostIntent';

import { hasPublicationOutbox } from './IMatchStore';
import { intentRefusalMessage as errorMessage } from './intentRefusal';
import {
  firstNonContiguousSequence,
  matchesCommandFingerprint,
} from './matchCommandBatch';
import { markMatchCompleted } from './matchCompletion';
import * as matchJournalAuthority from './matchJournalAuthority';
import { preflightMatchPublications } from './MatchPublicationReadability';
import { foldMatchSession } from './MatchSessionProjector';
import {
  digestCommandPostState,
  type ICommandDecision,
  type IDecideCommandBatchDeps,
} from './ServerMatchHostDecision';
import { stampIntentIdOnNewEvents } from './ServerMatchHostEvents';
import { resumePendingPublications } from './ServerMatchHostPublication';

function finish(
  journal: IJournalAuthorityHostHandle,
  messages: readonly IServerMessage[],
  recovery: JournalAuthorityRecovery | null,
): IJournalAuthorityPathResult {
  journal.recordRecovery(recovery);
  return { messages, recovery };
}

function persistenceFailure(
  ctx: IServerMatchHostIntentContext,
  journal: IJournalAuthorityHostHandle,
  envelope: Pick<IIntent, 'playerId' | 'intentId'>,
  reason: string,
): IJournalAuthorityPathResult {
  const err = errorMessage(
    ctx.matchId,
    'STORE_FAILURE',
    reason,
    envelope.intentId,
  );
  ctx.sendRefusal(err);
  return finish(journal, [err], { kind: 'persistence-failure', reason });
}

async function resumeCommittedCommand(
  ctx: IServerMatchHostIntentContext,
  journal: IJournalAuthorityHostHandle,
  envelope: Pick<IIntent, 'playerId' | 'intentId'>,
  prior: IMatchCommandReceipt,
): Promise<IJournalAuthorityPathResult> {
  const stored = await ctx.store.getEvents(ctx.matchId);
  const events = stored.filter(
    (event) =>
      event.sequence >= prior.firstRevision &&
      event.sequence <= prior.lastRevision,
  );
  const batch = {
    commandId: prior.commandId,
    actorId: envelope.playerId,
    expectedRevision: prior.firstRevision,
    events,
  };
  if (
    prior.actorId !== envelope.playerId ||
    events.length !== prior.eventCount ||
    firstNonContiguousSequence(batch) !== null ||
    !matchesCommandFingerprint(prior.fingerprint, batch)
  )
    return persistenceFailure(ctx, journal, envelope, 'integrity-conflict');
  // A receipt proves these facts committed. Resume their publication; never
  // offer legacy rows to the current write schema as a second append.
  let resumed: readonly IServerMessage[];
  try {
    for (const event of events)
      prepareEventForSerialization(event, 'match-broadcast');
    await preflightMatchPublications(ctx.matchId, ctx.store, stored, events);
    if (
      prior.expectedPostStateDigest != null &&
      !matchJournalAuthority.verifyAppliedDigest(
        digestCommandPostState(
          foldMatchSession(
            ctx.matchId,
            stored.filter((event) => event.sequence <= prior.lastRevision),
          ),
        ),
        prior.expectedPostStateDigest,
      )
    )
      return persistenceFailure(ctx, journal, envelope, 'integrity-conflict');
    // A previous append may have committed its receipt before journal mirroring
    // failed. Let the store's recovery owner heal that gap without re-appending.
    try {
      const recovered = await ctx.store.recoverJournalBatches?.(ctx.matchId);
      if (recovered?.kind === 'blocked')
        return persistenceFailure(ctx, journal, envelope, recovered.reason);
    } catch (error) {
      return persistenceFailure(
        ctx,
        journal,
        envelope,
        error instanceof Error ? error.message : 'journal recovery failed',
      );
    }
    resumed = hasPublicationOutbox(ctx.store)
      ? await resumePendingPublications({
          matchId: ctx.matchId,
          publications: ctx.store,
          broadcastEvent: ctx.broadcastUndeliveredEvent ?? ctx.broadcastEvent,
        })
      : [];
  } catch (error) {
    if (!(error instanceof UnreadableStoredEventError)) throw error;
    const refusal = errorMessage(
      ctx.matchId,
      'INTERNAL_ERROR',
      error.message,
      envelope.intentId,
    );
    ctx.sendRefusal(refusal);
    return finish(journal, [refusal], null);
  }
  await markMatchCompleted(ctx.store, ctx.matchId, events);
  await journal.publishDurableCombatOutcome();
  return finish(journal, resumed, null);
}

export async function commitJournalAuthorityCommand(
  ctx: IServerMatchHostIntentContext,
  envelope: Pick<IIntent, 'playerId' | 'intentId'>,
  decide: (deps: IDecideCommandBatchDeps) => ICommandDecision,
): Promise<IJournalAuthorityPathResult> {
  const journal = ctx.journalAuthority;
  if (journal == null || !journal.enabled) {
    throw new Error('journal-authority path invoked with the flag off');
  }
  const appendCommandBatch = ctx.store.appendCommandBatch;
  if (appendCommandBatch == null) {
    return persistenceFailure(
      ctx,
      journal,
      envelope,
      'appendCommandBatch unavailable',
    );
  }

  if (envelope.intentId != null && ctx.store.getCommandReceipt != null) {
    const prior = await ctx.store.getCommandReceipt(
      ctx.matchId,
      envelope.intentId,
    );
    if (prior != null) {
      return resumeCommittedCommand(ctx, journal, envelope, prior);
    }
  }

  const rollbackDice = ctx.installFreshCapture();
  let decided;
  try {
    decided = decide({
      ...journal.decideDeps,
      d6Roller: journal.d6,
    });
  } catch (e) {
    if (typeof rollbackDice === 'function') rollbackDice();
    const err = errorMessage(
      ctx.matchId,
      'INVALID_INTENT',
      e instanceof Error ? e.message : 'Engine rejected intent',
      envelope.intentId,
    );
    ctx.sendRefusal(err);
    return finish(journal, [err], null);
  }

  let events = decided.events;
  if (envelope.intentId != null && events.length > 0) {
    events = stampIntentIdOnNewEvents(envelope.intentId, events);
  }
  try {
    events = events.map((event) =>
      prepareEventForSerialization(event, 'match-broadcast'),
    );
    await preflightMatchPublications(
      ctx.matchId,
      ctx.store,
      [...ctx.session.getSession().events, ...events],
      events,
    );
  } catch (error) {
    if (!(error instanceof UnreadableStoredEventError)) throw error;
    if (typeof rollbackDice === 'function') rollbackDice();
    const refusal = errorMessage(
      ctx.matchId,
      'INTERNAL_ERROR',
      error.message,
      envelope.intentId,
    );
    ctx.sendRefusal(refusal);
    return finish(journal, [refusal], null);
  }
  if (events.length === 0) {
    if (typeof rollbackDice === 'function') rollbackDice();
    return finish(journal, [], null);
  }

  const expectedRevision = events[0].sequence;
  const commandId =
    envelope.intentId ?? `match-cmd:${ctx.matchId}:${expectedRevision}`;
  // NO STARTED MARKER IS WRITTEN HERE ANY MORE (task 1.3, sub-prefix 3).
  // The first command of a journal-authority match used to carry a
  // one-time `mp_journal_authority_started` fact, and the derived-head
  // read beside it existed only to keep that write to once. Recovery
  // stopped reading the marker in the previous commit, so both are
  // gone: the mirrored effective head is the one source of "started",
  // and on a store that has no journal behind it the honest answer is
  // that the stream never started rather than a row saying it did.
  //
  // What this removes is ONLY the side write. The batch below still
  // carries the same events, expected revision and post-state digest,
  // and the store still commits them in one transaction.
  const last = events[events.length - 1];

  let result;
  try {
    result = await appendCommandBatch(ctx.matchId, {
      commandId,
      actorId: envelope.playerId,
      expectedRevision,
      events,
      expectedPostStateDigest: decided.postStateDigest,
      journalAuthorityCommand: true,
      ...(decided.terminalOutcome
        ? {
            combatOutcome: {
              outcomeId: ctx.matchId,
              outcomeVersion: decided.terminalOutcome.version,
              outcome: decided.terminalOutcome,
            },
          }
        : {}),
    });
  } catch (e) {
    const reason = e instanceof Error ? e.message : 'Store append failed';
    return persistenceFailure(ctx, journal, envelope, reason);
  }

  if (result.kind === 'revision-conflict') {
    const err = errorMessage(
      ctx.matchId,
      'STORE_FAILURE',
      'sequence-conflict',
      envelope.intentId,
    );
    ctx.sendRefusal(err);
    return finish(journal, [err], {
      kind: 'revision-conflict',
      expectedRevision: result.expectedRevision,
      actualRevision: result.actualRevision,
    });
  }
  if (result.kind === 'duplicate-command') {
    return resumeCommittedCommand(ctx, journal, envelope, result.receipt);
  }
  if (result.kind !== 'committed') {
    return persistenceFailure(ctx, journal, envelope, result.kind);
  }

  if (envelope.intentId != null) {
    ctx.acceptedIntents.record(envelope.intentId);
  }

  const expectedDigest =
    result.receipt.expectedPostStateDigest ?? decided.postStateDigest;
  const appliedSession = matchJournalAuthority.applyCommittedEvents(
    ctx.session,
    events,
    journal.decideDeps,
  );
  const appliedDigest = digestCommandPostState(appliedSession.getSession());
  if (
    !matchJournalAuthority.verifyAppliedDigest(appliedDigest, expectedDigest)
  ) {
    journal.markDivergence();
    const journalEvents = await ctx.store.getEvents(ctx.matchId);
    journal.replaceSession(
      InteractiveSession.fromHydratedSession(
        hydrateGameSessionFromEvents(ctx.matchId, [...journalEvents]),
        {
          random: new SeededRandom(journal.decideDeps.randomSeed),
          playerUnits: journal.decideDeps.playerUnits,
          opponentUnits: journal.decideDeps.opponentUnits,
        },
      ),
    );
    const err = errorMessage(
      ctx.matchId,
      'INTERNAL_ERROR',
      'projection-divergence',
      envelope.intentId,
    );
    ctx.sendRefusal(err);
    return finish(journal, [err], {
      kind: 'digest-divergence',
      expectedDigest,
      appliedDigest,
      rebuilt: true,
    });
  }

  journal.replaceSession(appliedSession);
  journal.setLastBroadcastSeq(last.sequence);

  await markMatchCompleted(ctx.store, ctx.matchId, events);
  if (matchJournalAuthority._shouldSkipPublishForTests()) {
    return finish(journal, [], null);
  }

  const messages: IServerMessage[] = [];
  for (const event of events) {
    const envelopeOut = {
      kind: 'Event' as const,
      matchId: ctx.matchId,
      ts: nowIso(),
      event,
    };
    await ctx.broadcastEvent(envelopeOut);
    messages.push(envelopeOut);
  }
  if (hasPublicationOutbox(ctx.store) && events.length > 0) {
    await ctx.store.markPublicationsPublished(
      ctx.matchId,
      events.map((event) => event.sequence),
    );
  }
  // The journal path never asks the engine-primary publisher to inspect its
  // constructor session: `replaceSession` above made that session stale.
  // The durable row is the authority boundary and is the only source for the
  // notification, both here and after recovery.
  await journal.publishDurableCombatOutcome();
  return finish(journal, messages, null);
}
