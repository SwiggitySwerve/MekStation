/**
 * Shadow compare of the journal decide path against a successful legacy
 * dispatch. Appends nothing; the live session and host capture stay
 * untouched. Mismatch is diagnostic only.
 */

import type {
  IGameEvent,
  IGameState,
} from '@/types/gameplay/GameSessionInterfaces';
import type { IIntent } from '@/types/multiplayer/Protocol';
import type { D6Roller } from '@/utils/gameplay/diceTypes';

import { InteractiveSession } from '@/engine/InteractiveSession';
import { canonicalizeJsonV1 } from '@/lib/events/journal/EventJournalCanonicalizer';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { sha256Sync } from '@/utils/events/hashUtils';
import { hydrateGameSessionFromEvents } from '@/utils/gameplay/gameSession';
import { logger } from '@/utils/logger';

import type { IMatchStore } from './IMatchStore';
import type {
  IShadowAudienceDigestComparison,
  ShadowComparisonRecord,
} from './matchJournalAuthority';
import type { IDecideCommandBatchDeps } from './ServerMatchHostDecision';

import { filterEventForPlayer, FogOfWarVisibilityCache } from './fogOfWar';
import { projectEventForViewerClass } from './projection/ViewerFrameProjector';
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
type ShadowAudienceStateMutator = (state: IGameState) => IGameState;
let shadowAudienceStateMutator: ShadowAudienceStateMutator | null = null;

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

/** Test-only: corrupt only the scratch visibility inputs after decide. */
export function _setShadowAudienceStateForTests(
  mutator: ShadowAudienceStateMutator | null,
): void {
  shadowAudienceStateMutator = mutator;
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
function canonicalEventMaterial(event: IGameEvent): Record<string, unknown> {
  const cloned = JSON.parse(JSON.stringify(event)) as Record<string, unknown>;
  delete cloned.id;
  delete cloned.timestamp;
  return cloned;
}

function canonicalEventContent(event: IGameEvent): string {
  return canonicalizeJsonV1(canonicalEventMaterial(event));
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
  /** Match metadata read by the live broadcaster before fog projection. */
  readonly audience?: IShadowAudienceInput;
}

interface IShadowSideAssignment {
  readonly playerId: string;
  readonly side: string;
}

/**
 * Audience identities come from the same durable match metadata read by
 * ServerMatchHostEvents before it calls filterEventForPlayer.
 */
export interface IShadowAudienceInput {
  readonly gmPlayerId: string;
  readonly playerIds: readonly string[];
  readonly config: { readonly fogOfWar?: boolean };
  readonly sideAssignments: readonly IShadowSideAssignment[];
}

type ShadowAudience = {
  readonly audience: string;
  readonly playerId: string;
  readonly viewerClass: 'gm' | 'player';
};

/**
 * Exported so the combat viewer probe names the SAME audiences this
 * comparison does. Restating the `'gm'` / `'player:<id>'` mapping in a
 * second place is how the two would eventually disagree about who a
 * viewer id refers to.
 */
export function audiencesFor(
  input: IShadowAudienceInput,
): readonly ShadowAudience[] {
  return [
    {
      audience: 'gm',
      playerId: input.gmPlayerId,
      viewerClass: 'gm',
    },
    ...input.playerIds.map((playerId) => ({
      audience: `player:${playerId}`,
      playerId,
      viewerClass: 'player' as const,
    })),
  ];
}

function withVisibilityAssignments(
  state: IGameState,
  input: IShadowAudienceInput,
): IGameState {
  return {
    ...state,
    sideAssignments: input.sideAssignments,
  } as IGameState;
}

/**
 * Hash the exact fog-filtered, field-projected event list for one audience.
 * Every invocation has its own cache because it is a comparison snapshot,
 * never the live broadcaster's mutable cache.
 */
export function audienceDigest(
  events: readonly IGameEvent[],
  state: IGameState,
  audience: ShadowAudience,
  input: IShadowAudienceInput,
): string {
  const cache = new FogOfWarVisibilityCache();
  const projected: Record<string, unknown>[] = [];
  for (const event of events) {
    const fogged = filterEventForPlayer(event, audience.playerId, state, {
      config: input.config,
      cache,
    });
    if (fogged === null) continue;
    const viewerProjected = projectEventForViewerClass(
      fogged,
      audience.viewerClass,
    );
    if (viewerProjected.kind !== 'project') continue;
    projected.push(canonicalEventMaterial(viewerProjected.event as IGameEvent));
  }
  return sha256Sync(canonicalizeJsonV1(projected));
}

function compareAudienceDigests(
  liveEvents: readonly IGameEvent[],
  liveState: IGameState,
  shadowEvents: readonly IGameEvent[],
  shadowState: IGameState,
  input: IShadowAudienceInput,
): readonly IShadowAudienceDigestComparison[] {
  return audiencesFor(input).map((audience) => {
    const liveDigest = audienceDigest(liveEvents, liveState, audience, input);
    const shadowDigest = audienceDigest(
      shadowEvents,
      shadowState,
      audience,
      input,
    );
    return {
      audience: audience.audience,
      liveDigest,
      shadowDigest,
      equal: liveDigest === shadowDigest,
    };
  });
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
    const liveState =
      input.audience === undefined
        ? null
        : withVisibilityAssignments(
            input.liveSession.getSession().currentState,
            input.audience,
          );
    const scratchStateWithAssignments =
      input.audience === undefined
        ? null
        : withVisibilityAssignments(
            preSession.getSession().currentState,
            input.audience,
          );
    const scratchState =
      scratchStateWithAssignments === null
        ? null
        : (shadowAudienceStateMutator?.(scratchStateWithAssignments) ??
          scratchStateWithAssignments);
    const audienceDigests =
      input.audience === undefined ||
      liveState === null ||
      scratchState === null
        ? undefined
        : compareAudienceDigests(
            input.liveEvents,
            liveState,
            decided.events,
            scratchState,
            input.audience,
          );
    const audienceMismatch = audienceDigests?.find((digest) => !digest.equal);
    let reason: string | undefined;
    if (!eventsEqual) reason = 'event-mismatch';
    else if (!digestEqual) reason = 'digest-mismatch';
    else if (audienceMismatch !== undefined) {
      reason = `audience-digest-mismatch:${audienceMismatch.audience}`;
    }
    return {
      intentId: input.intentId,
      equal: eventsEqual && digestEqual && audienceMismatch === undefined,
      eventCountLive: input.liveEvents.length,
      eventCountShadow: decided.events.length,
      liveDigest,
      shadowDigest: decided.postStateDigest,
      ...(audienceDigests !== undefined ? { audienceDigests } : {}),
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

/**
 * Durable audience metadata for a shadow comparison.
 *
 * The live broadcaster reads this same durable meta tuple immediately
 * before fog filtering in ServerMatchHostEvents. Shadow comparison must
 * use those exact player identities and side assignments, never a
 * session-local reconstruction. Best-effort: the legacy command already
 * completed, so unavailable metadata answers null rather than aborting.
 */
export async function shadowAudienceInput(
  store: IMatchStore,
  matchId: string,
): Promise<IShadowAudienceInput | null> {
  try {
    const meta = await store.getMatchMeta(matchId);
    return {
      gmPlayerId: meta.hostPlayerId,
      playerIds: meta.playerIds,
      config: meta.config,
      sideAssignments: meta.sideAssignments,
    };
  } catch {
    return null;
  }
}
