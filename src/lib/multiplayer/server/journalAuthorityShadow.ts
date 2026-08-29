/**
 * Shadow compare of the journal decide path against a successful legacy
 * dispatch. Appends nothing; the live session and host capture stay
 * untouched. Mismatch is diagnostic only.
 */

import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';
import type { IIntent } from '@/types/multiplayer/Protocol';
import type { D6Roller } from '@/utils/gameplay/diceTypes';

import { InteractiveSession } from '@/engine/InteractiveSession';
import { canonicalizeJsonV1 } from '@/lib/events/journal/EventJournalCanonicalizer';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { hydrateGameSessionFromEvents } from '@/utils/gameplay/gameSession';
import { logger } from '@/utils/logger';

import type { ShadowComparisonRecord } from './matchJournalAuthority';
import type { IDecideCommandBatchDeps } from './ServerMatchHostDecision';

import {
  decideCommandBatch,
  digestCommandPostState,
} from './ServerMatchHostDecision';

export class ShadowRollExhaustedError extends Error {
  readonly name = 'ShadowRollExhaustedError';

  constructor() {
    super('roll-exhaustion');
  }
}

type ShadowDecideFn = typeof decideCommandBatch;

let replayRollsOverride: readonly number[] | null = null;
let decideHook: ShadowDecideFn | null = null;

/** Test-only: replace the replay sequence (wrong roll / exhaustion). */
export function _setShadowReplayRollsForTests(
  rolls: readonly number[] | null,
): void {
  replayRollsOverride = rolls;
}

/** Test-only: replace decide without touching live dispatch. */
export function _setShadowDecideForTests(fn: ShadowDecideFn | null): void {
  decideHook = fn;
}

function rollsFromStampedEvents(
  events: readonly IGameEvent[],
): readonly number[] {
  if (events.length === 0) return [];
  const payload = events[0].payload as { rolls?: unknown } | undefined;
  if (payload == null || !Array.isArray(payload.rolls)) return [];
  return payload.rolls.filter(
    (value): value is number => typeof value === 'number',
  );
}

function createReplayD6Roller(rolls: readonly number[]): D6Roller {
  let index = 0;
  return () => {
    if (index >= rolls.length) {
      throw new ShadowRollExhaustedError();
    }
    const value = rolls[index];
    index += 1;
    return value;
  };
}

/**
 * Event ids (and mint timestamps) are dispatch-scoped; the journal
 * path derives command-scoped ids, so canonical compare excludes them.
 */
function canonicalEventContent(event: IGameEvent): string {
  const cloned = JSON.parse(JSON.stringify(event)) as Record<string, unknown>;
  delete cloned.id;
  delete cloned.timestamp;
  return canonicalizeJsonV1(cloned);
}

function eventsCanonicallyEqual(
  liveEvents: readonly IGameEvent[],
  shadowEvents: readonly IGameEvent[],
): boolean {
  if (liveEvents.length !== shadowEvents.length) return false;
  for (let i = 0; i < liveEvents.length; i += 1) {
    if (
      canonicalEventContent(liveEvents[i]) !==
      canonicalEventContent(shadowEvents[i])
    ) {
      return false;
    }
  }
  return true;
}

function reconstructPreSession(
  liveSession: InteractiveSession,
  headIndex: number,
  decideDeps: IDecideCommandBatchDeps,
): InteractiveSession {
  const live = liveSession.getSession();
  const prefix = JSON.parse(
    JSON.stringify(live.events.slice(0, headIndex)),
  ) as IGameEvent[];
  const hydrated = hydrateGameSessionFromEvents(live.id, prefix);
  return InteractiveSession.fromHydratedSession(hydrated, {
    random: new SeededRandom(decideDeps.randomSeed),
    playerUnits: decideDeps.playerUnits,
    opponentUnits: decideDeps.opponentUnits,
    // Shadow pre-state is a comparison artifact - never a bus author.
    suppressOutcomePublication: true,
  });
}

export interface ICompareJournalAuthorityShadowInput {
  readonly liveSession: InteractiveSession;
  readonly headIndex: number;
  readonly liveEvents: readonly IGameEvent[];
  readonly intent: IIntent['intent'];
  readonly intentId: string | undefined;
  readonly decideDeps: IDecideCommandBatchDeps;
}

export function compareJournalAuthorityShadow(
  input: ICompareJournalAuthorityShadowInput,
): ShadowComparisonRecord {
  const liveDigest = digestCommandPostState(input.liveSession.getSession());
  const rolls = replayRollsOverride ?? rollsFromStampedEvents(input.liveEvents);
  const preSession = reconstructPreSession(
    input.liveSession,
    input.headIndex,
    input.decideDeps,
  );
  const decide = decideHook ?? decideCommandBatch;
  try {
    const decided = decide(preSession, input.intent, {
      ...input.decideDeps,
      d6Roller: createReplayD6Roller(rolls),
    });
    const eventsEqual = eventsCanonicallyEqual(
      input.liveEvents,
      decided.events,
    );
    const digestEqual = decided.postStateDigest === liveDigest;
    let reason: string | undefined;
    if (!eventsEqual) reason = 'event-mismatch';
    else if (!digestEqual) reason = 'digest-mismatch';
    return {
      intentId: input.intentId,
      equal: eventsEqual && digestEqual,
      eventCountLive: input.liveEvents.length,
      eventCountShadow: decided.events.length,
      liveDigest,
      shadowDigest: decided.postStateDigest,
      ...(reason != null ? { reason } : {}),
    };
  } catch (error) {
    if (error instanceof ShadowRollExhaustedError) {
      return {
        intentId: input.intentId,
        equal: false,
        eventCountLive: input.liveEvents.length,
        eventCountShadow: 0,
        liveDigest,
        shadowDigest: '',
        reason: 'roll-exhaustion',
      };
    }
    throw error;
  }
}

export interface IShadowComparisonJournal {
  readonly decideDeps: IDecideCommandBatchDeps;
  recordShadowComparison(record: ShadowComparisonRecord): void;
}

/**
 * Best-effort compare after a successful legacy dispatch. Never throws
 * into the intent path; never writes the store or wraps live capture.
 */
export function runLegacyShadowComparison(
  journal: IShadowComparisonJournal,
  input: Omit<ICompareJournalAuthorityShadowInput, 'decideDeps'>,
): void {
  try {
    const record = compareJournalAuthorityShadow({
      ...input,
      decideDeps: journal.decideDeps,
    });
    journal.recordShadowComparison(record);
    if (!record.equal) {
      logger.warn(
        `[match-journal-shadow] mismatch intentId=${record.intentId ?? 'none'} reason=${record.reason ?? 'content'} live=${record.liveDigest} shadow=${record.shadowDigest}`,
      );
    }
  } catch (error) {
    const liveDigest = digestCommandPostState(input.liveSession.getSession());
    const record: ShadowComparisonRecord = {
      intentId: input.intentId,
      equal: false,
      eventCountLive: input.liveEvents.length,
      eventCountShadow: 0,
      liveDigest,
      shadowDigest: '',
      reason:
        error instanceof Error ? error.message : 'shadow-comparison-failed',
    };
    journal.recordShadowComparison(record);
    logger.warn(
      `[match-journal-shadow] mismatch intentId=${record.intentId ?? 'none'} reason=${record.reason} live=${record.liveDigest} shadow=${record.shadowDigest}`,
    );
  }
}
