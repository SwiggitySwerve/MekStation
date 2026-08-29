/**
 * DECIDE -> APPEND-AT-REVISION -> APPLY-COMMITTED-BATCH -> VERIFY -> PUBLISH.
 * Apply consumes the committed envelope; mismatch rebuilds from the journal.
 */

import type { IIntent, IServerMessage } from '@/types/multiplayer/Protocol';

import { InteractiveSession } from '@/engine/InteractiveSession';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { nowIso } from '@/types/multiplayer/Protocol';
import { hydrateGameSessionFromEvents } from '@/utils/gameplay/gameSession';

import type { IMatchJournalAuthorityStarted } from './matchJournalAuthority';
import type { IServerMatchHostIntentContext } from './ServerMatchHostIntent';

import { hasPublicationOutbox } from './IMatchStore';
import {
  MATCH_BASELINE_BRANCH_ID,
  MATCH_BASELINE_FIRST_GENERATION,
} from './matchAuthorityBaseline';
import * as matchJournalAuthority from './matchJournalAuthority';
import {
  decideCommandBatch,
  digestCommandPostState,
} from './ServerMatchHostDecision';
import { stampIntentIdOnNewEvents } from './ServerMatchHostEvents';
import { errorMessage } from './ServerMatchHostPublication';

export async function commitJournalAuthorityCommand(
  ctx: IServerMatchHostIntentContext,
  envelope: IIntent,
): Promise<readonly IServerMessage[]> {
  const journal = ctx.journalAuthority;
  if (journal == null || !journal.enabled) {
    throw new Error('journal-authority path invoked with the flag off');
  }
  const appendCommandBatch = ctx.store.appendCommandBatch;
  if (appendCommandBatch == null) {
    const err = errorMessage(
      ctx.matchId,
      'STORE_FAILURE',
      'appendCommandBatch unavailable',
      envelope.intentId,
    );
    ctx.broadcast(err);
    return [err];
  }

  ctx.installFreshCapture();
  let decided;
  try {
    decided = decideCommandBatch(ctx.session, envelope.intent, {
      ...journal.decideDeps,
      d6Roller: journal.d6,
    });
  } catch (e) {
    const err = errorMessage(
      ctx.matchId,
      'INVALID_INTENT',
      e instanceof Error ? e.message : 'Engine rejected intent',
      envelope.intentId,
    );
    ctx.broadcast(err);
    return [err];
  }

  let events = decided.events;
  if (envelope.intentId != null && events.length > 0) {
    events = stampIntentIdOnNewEvents(envelope.intentId, events);
  }
  if (events.length === 0) {
    return [];
  }

  const expectedRevision = events[0].sequence;
  const commandId =
    envelope.intentId ?? `match-cmd:${ctx.matchId}:${expectedRevision}`;
  const existingStarted = ctx.store.getJournalAuthorityStarted
    ? await ctx.store.getJournalAuthorityStarted(ctx.matchId)
    : null;
  const last = events[events.length - 1];
  const started: IMatchJournalAuthorityStarted | undefined =
    existingStarted != null
      ? undefined
      : {
          matchId: ctx.matchId,
          commandId,
          firstRevision: events[0].sequence,
          lastRevision: last.sequence,
          head: {
            streamType: 'match',
            streamId: ctx.matchId,
            branchId: MATCH_BASELINE_BRANCH_ID,
            revision: last.sequence,
            digest: decided.postStateDigest,
            effectiveGeneration: MATCH_BASELINE_FIRST_GENERATION,
          },
          committedAt: '',
        };

  const result = await appendCommandBatch(ctx.matchId, {
    commandId,
    actorId: envelope.playerId,
    expectedRevision,
    events,
    expectedPostStateDigest: decided.postStateDigest,
    journalAuthorityStarted: started,
  });

  if (result.kind === 'revision-conflict') {
    const err = errorMessage(
      ctx.matchId,
      'STORE_FAILURE',
      'sequence-conflict',
      envelope.intentId,
    );
    ctx.broadcast(err);
    return [err];
  }
  if (result.kind === 'duplicate-command') {
    return [];
  }
  if (result.kind !== 'committed') {
    const err = errorMessage(
      ctx.matchId,
      'STORE_FAILURE',
      result.kind,
      envelope.intentId,
    );
    ctx.broadcast(err);
    return [err];
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
    ctx.broadcast(err);
    return [err];
  }

  journal.replaceSession(appliedSession);
  journal.setLastBroadcastSeq(last.sequence);

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
  ctx.tryPublishOutcome();
  return messages;
}
