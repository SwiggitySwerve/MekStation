/**
 * DECIDE -> APPEND-AT-REVISION -> APPLY-COMMITTED-BATCH -> VERIFY -> PUBLISH.
 * Apply consumes the committed envelope; mismatch rebuilds from the journal.
 * Failures fold into one host-side recovery result (task 2.4).
 */

import type { IIntent, IServerMessage } from '@/types/multiplayer/Protocol';

import { InteractiveSession } from '@/engine/InteractiveSession';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { nowIso } from '@/types/multiplayer/Protocol';
import { hydrateGameSessionFromEvents } from '@/utils/gameplay/gameSession';

import type { IMatchStore } from './IMatchStore';
import type { IMatchCommandReceipt } from './matchCommandBatch';
import type {
  IJournalAuthorityPathResult,
  IMatchJournalAuthorityStarted,
  JournalAuthorityRecovery,
} from './matchJournalAuthority';
import type {
  IJournalAuthorityHostHandle,
  IServerMatchHostIntentContext,
} from './ServerMatchHostIntent';

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
import {
  errorMessage,
  resumePendingPublications,
} from './ServerMatchHostPublication';

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
  envelope: IIntent,
  reason: string,
): IJournalAuthorityPathResult {
  const err = errorMessage(
    ctx.matchId,
    'STORE_FAILURE',
    reason,
    envelope.intentId,
  );
  ctx.broadcast(err);
  return finish(journal, [err], { kind: 'persistence-failure', reason });
}

async function resumeCommittedCommand(
  ctx: IServerMatchHostIntentContext,
  journal: IJournalAuthorityHostHandle,
  envelope: IIntent,
  prior: IMatchCommandReceipt,
  appendCommandBatch: NonNullable<IMatchStore['appendCommandBatch']>,
): Promise<IJournalAuthorityPathResult> {
  const stored = await ctx.store.getEvents(ctx.matchId);
  const events = stored.filter(
    (event) =>
      event.sequence >= prior.firstRevision &&
      event.sequence <= prior.lastRevision,
  );
  let result;
  try {
    result = await appendCommandBatch(ctx.matchId, {
      commandId: prior.commandId,
      actorId: envelope.playerId,
      expectedRevision: prior.firstRevision,
      events,
      expectedPostStateDigest: prior.expectedPostStateDigest,
    });
  } catch (e) {
    const reason = e instanceof Error ? e.message : 'Store append failed';
    return persistenceFailure(ctx, journal, envelope, reason);
  }
  if (result.kind === 'duplicate-command') {
    const resumed = hasPublicationOutbox(ctx.store)
      ? await resumePendingPublications({
          matchId: ctx.matchId,
          publications: ctx.store,
          broadcastEvent: ctx.broadcastEvent,
        })
      : [];
    await journal.publishDurableCombatOutcome();
    return finish(journal, resumed, null);
  }
  if (result.kind === 'revision-conflict') {
    const err = errorMessage(
      ctx.matchId,
      'STORE_FAILURE',
      'sequence-conflict',
      envelope.intentId,
    );
    ctx.broadcast(err);
    return finish(journal, [err], {
      kind: 'revision-conflict',
      expectedRevision: result.expectedRevision,
      actualRevision: result.actualRevision,
    });
  }
  return persistenceFailure(ctx, journal, envelope, result.kind);
}

export async function commitJournalAuthorityCommand(
  ctx: IServerMatchHostIntentContext,
  envelope: IIntent,
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
      return resumeCommittedCommand(
        ctx,
        journal,
        envelope,
        prior,
        appendCommandBatch,
      );
    }
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
    return finish(journal, [err], null);
  }

  let events = decided.events;
  if (envelope.intentId != null && events.length > 0) {
    events = stampIntentIdOnNewEvents(envelope.intentId, events);
  }
  if (events.length === 0) {
    return finish(journal, [], null);
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

  let result;
  try {
    result = await appendCommandBatch(ctx.matchId, {
      commandId,
      actorId: envelope.playerId,
      expectedRevision,
      events,
      expectedPostStateDigest: decided.postStateDigest,
      journalAuthorityStarted: started,
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
    ctx.broadcast(err);
    return finish(journal, [err], {
      kind: 'revision-conflict',
      expectedRevision: result.expectedRevision,
      actualRevision: result.actualRevision,
    });
  }
  if (result.kind === 'duplicate-command') {
    return resumeCommittedCommand(
      ctx,
      journal,
      envelope,
      result.receipt,
      appendCommandBatch,
    );
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
    ctx.broadcast(err);
    return finish(journal, [err], {
      kind: 'digest-divergence',
      expectedDigest,
      appliedDigest,
      rebuilt: true,
    });
  }

  journal.replaceSession(appliedSession);
  journal.setLastBroadcastSeq(last.sequence);

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
