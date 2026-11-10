import { useEffect } from 'react';

import type { IGameSession } from '@/types/gameplay';
import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import { InteractiveSession } from '@/engine/InteractiveSession';
import {
  answerReconnectRequest,
  matchLogStorage,
  MatchLogStorageUnavailableError,
  reconcileMatchLogMirror,
  type IGameSessionChannel,
  type IMatchMetadataRecord,
  type MatchLogPrefixVerdict,
} from '@/lib/p2p';
import { useP2PMirrorStore } from '@/lib/p2p/p2pMirrorStore';
import { useGameplayStore } from '@/stores/useGameplayStore';
import { GameEventType } from '@/types/gameplay';
import { assertGameEventBatchAdmissible } from '@/utils/gameplay/gameSession';

import {
  appendReplayEventToActiveSession,
  defaultAdoptRebuiltSession,
  defaultCreateChannel,
  defaultEnsureSyncRoom,
  defaultGetHostEventsFromSeq,
  defaultGetHostPresent,
  defaultGetLocalPeerId,
  defaultRedirectToLobby,
  defaultSetHostPending,
  defaultSetHydratedSession,
  defaultSetLive,
  deriveReconnectRoomCode,
  persistReplayEventToMatchLog,
  reportReconnectFailure,
} from './useP2PReconnectSession.defaults';

export { deriveReconnectRoomCode };
import { logger } from '@/utils/logger';

export const RECONNECT_HOST_WAIT_MS = 10_000;
/** How long a sent reconnect request may go without any host reply. */
export const RECONNECT_REPLAY_WAIT_MS = 10_000;
const HOST_POLL_INTERVAL_MS = 250;
/** The only `peer-rejected` reason a reconnect request can provoke. */
const WRONG_MATCH_REASON = 'wrong-match';

type ReplayEventAppender = (
  matchId: string,
  event: IGameEvent,
) => Promise<void> | void;

type ReplayStreamMessage = Parameters<
  Parameters<IGameSessionChannel['onReplayStream']>[0]
>[0];

interface ReconnectDependencies {
  readonly timeoutMs: number;
  readonly replayWaitMs: number;
  readonly pollIntervalMs: number;
  readonly getLastSequence: (matchId: string) => Promise<number | null>;
  readonly getMatchMetadata: (
    matchId: string,
  ) => Promise<IMatchMetadataRecord | undefined>;
  readonly ensureSyncRoom: (matchId: string) => Promise<void> | void;
  readonly getLocalPeerId: () => string | null;
  readonly getHostPresent: (hostPeerId: string | null) => boolean;
  readonly createChannel: typeof defaultCreateChannel;
  readonly appendReplayEvent: ReplayEventAppender;
  /**
   * Durable write used for full baselines and divergence rebuilds. Distinct from
   * `appendReplayEvent`, which short-circuits to the in-memory
   * session whenever one exists and therefore leaves the log empty
   * exactly when the rebuild needs it (finding #85).
   */
  readonly persistReplayEvent: ReplayEventAppender;
  /** Replace the live board with a session rebuilt from the log. */
  readonly adoptRebuiltSession: (session: IGameSession) => void;
  readonly hydrateFromMatchLog: (matchId: string) => Promise<IGameSession>;
  readonly setHydratedSession: (session: IGameSession) => void;
  readonly setHostPending: () => void;
  readonly setLive: () => void;
  readonly redirectToLobby: (matchId: string, reason: string) => void;
  readonly getHostEventsFromSeq: (
    seq: number,
  ) => readonly IGameEvent[] | Promise<readonly IGameEvent[]>;
  readonly getEventsForMatch: (matchId: string) => Promise<IGameEvent[]>;
  readonly deleteEventsForMatch: (matchId: string) => Promise<void>;
  readonly onMirrorPrefixDivergence?: (verdict: MatchLogPrefixVerdict) => void;
}

interface ReconnectRuntime {
  cancelled: boolean;
  cleanupChannel: (() => void) | null;
  timeoutId: ReturnType<typeof setTimeout> | null;
  pollId: ReturnType<typeof setInterval> | null;
  /** Armed once the request is sent; restarted by every replay chunk. */
  replayWaitId: ReturnType<typeof setTimeout> | null;
  requestSent: boolean;
  /** True once any replay chunk for this match has arrived. */
  replayStarted: boolean;
  replayChain: Promise<void>;
  replayEvents: IGameEvent[];
  requestedFullReplay: boolean;
}

export interface IUseP2PReconnectSessionOptions {
  readonly timeoutMs?: number;
  readonly replayWaitMs?: number;
  readonly pollIntervalMs?: number;
  readonly getLastSequence?: (matchId: string) => Promise<number | null>;
  readonly getMatchMetadata?: (
    matchId: string,
  ) => Promise<IMatchMetadataRecord | undefined>;
  readonly ensureSyncRoom?: (matchId: string) => Promise<void> | void;
  readonly getLocalPeerId?: () => string | null;
  readonly getHostPresent?: (hostPeerId: string | null) => boolean;
  readonly createChannel?: typeof defaultCreateChannel;
  readonly appendReplayEvent?: ReplayEventAppender;
  readonly persistReplayEvent?: ReplayEventAppender;
  readonly adoptRebuiltSession?: (session: IGameSession) => void;
  readonly hydrateFromMatchLog?: (matchId: string) => Promise<IGameSession>;
  readonly setHydratedSession?: (session: IGameSession) => void;
  readonly setHostPending?: () => void;
  readonly setLive?: () => void;
  readonly redirectToLobby?: (matchId: string, reason: string) => void;
  readonly getHostEventsFromSeq?: (
    seq: number,
  ) => readonly IGameEvent[] | Promise<readonly IGameEvent[]>;
  readonly getEventsForMatch?: (matchId: string) => Promise<IGameEvent[]>;
  readonly deleteEventsForMatch?: (matchId: string) => Promise<void>;
  readonly onMirrorPrefixDivergence?: (verdict: MatchLogPrefixVerdict) => void;
}

export function useP2PReconnectSession(
  matchId: string | null,
  options: IUseP2PReconnectSessionOptions = {},
): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!matchId) return;

    const runtime = createReconnectRuntime();
    void startReconnectSession(matchId, options, runtime).catch(
      (error: unknown) => {
        if (runtime.cancelled) return;
        clearReconnectTimers(runtime);
        reportReconnectFailure(error);
      },
    );

    return () => stopReconnectRuntime(runtime);
    // Reconnect dependencies are intentionally captured at mount time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);
}

function createReconnectRuntime(): ReconnectRuntime {
  return {
    cancelled: false,
    cleanupChannel: null,
    timeoutId: null,
    pollId: null,
    replayWaitId: null,
    requestSent: false,
    replayStarted: false,
    replayChain: Promise.resolve(),
    replayEvents: [],
    requestedFullReplay: false,
  };
}

function clearReconnectTimers(runtime: ReconnectRuntime): void {
  if (runtime.timeoutId) {
    clearTimeout(runtime.timeoutId);
    runtime.timeoutId = null;
  }
  if (runtime.pollId) {
    clearInterval(runtime.pollId);
    runtime.pollId = null;
  }
  if (runtime.replayWaitId) {
    clearTimeout(runtime.replayWaitId);
    runtime.replayWaitId = null;
  }
}

function stopReconnectRuntime(runtime: ReconnectRuntime): void {
  runtime.cancelled = true;
  clearReconnectTimers(runtime);
  runtime.cleanupChannel?.();
}

function resolveReconnectDependencies(
  options: IUseP2PReconnectSessionOptions,
): ReconnectDependencies {
  return {
    getLastSequence:
      options.getLastSequence ??
      matchLogStorage.getLastSequence.bind(matchLogStorage),
    getMatchMetadata:
      options.getMatchMetadata ??
      matchLogStorage.getMatchMetadata.bind(matchLogStorage),
    ensureSyncRoom: options.ensureSyncRoom ?? defaultEnsureSyncRoom,
    getLocalPeerId: options.getLocalPeerId ?? defaultGetLocalPeerId,
    getHostPresent: options.getHostPresent ?? defaultGetHostPresent,
    createChannel: options.createChannel ?? defaultCreateChannel,
    appendReplayEvent:
      options.appendReplayEvent ?? appendReplayEventToActiveSession,
    persistReplayEvent:
      options.persistReplayEvent ?? persistReplayEventToMatchLog,
    adoptRebuiltSession:
      options.adoptRebuiltSession ?? defaultAdoptRebuiltSession,
    hydrateFromMatchLog:
      options.hydrateFromMatchLog ?? InteractiveSession.fromMatchLog,
    setHydratedSession: options.setHydratedSession ?? defaultSetHydratedSession,
    setHostPending: options.setHostPending ?? defaultSetHostPending,
    setLive: options.setLive ?? defaultSetLive,
    redirectToLobby: options.redirectToLobby ?? defaultRedirectToLobby,
    getHostEventsFromSeq:
      options.getHostEventsFromSeq ?? defaultGetHostEventsFromSeq,
    getEventsForMatch:
      options.getEventsForMatch ??
      matchLogStorage.getEventsForMatch.bind(matchLogStorage),
    deleteEventsForMatch:
      options.deleteEventsForMatch ??
      matchLogStorage.deleteEventsForMatch.bind(matchLogStorage),
    onMirrorPrefixDivergence: options.onMirrorPrefixDivergence,
    timeoutMs: options.timeoutMs ?? RECONNECT_HOST_WAIT_MS,
    replayWaitMs: options.replayWaitMs ?? RECONNECT_REPLAY_WAIT_MS,
    pollIntervalMs: options.pollIntervalMs ?? HOST_POLL_INTERVAL_MS,
  };
}

async function startReconnectSession(
  matchId: string,
  options: IUseP2PReconnectSessionOptions,
  runtime: ReconnectRuntime,
): Promise<void> {
  const deps = resolveReconnectDependencies(options);
  const [lastSequenceResult, metadata, storedEvents] = await Promise.all([
    deps.getLastSequence(matchId),
    deps.getMatchMetadata(matchId),
    deps
      .getEventsForMatch(matchId)
      .catch((error: unknown) =>
        error instanceof MatchLogStorageUnavailableError
          ? []
          : Promise.reject(error),
      ),
  ]);
  const lastLocalSeq = lastSequenceResult ?? 0;
  runtime.requestedFullReplay = storedEvents.length > 0;

  await deps.ensureSyncRoom(matchId);
  if (runtime.cancelled) return;

  const localPeerId = deps.getLocalPeerId();
  if (!localPeerId) return;

  const channel = deps.createChannel(matchId, localPeerId);

  if (metadata?.hostPeerId === localPeerId) {
    setupHostReconnectResponder(matchId, metadata, channel, deps, runtime);
    return;
  }

  if (!metadata?.guestPeerId || metadata.guestPeerId !== localPeerId) {
    deps.redirectToLobby(matchId, 'Match in progress');
    return;
  }

  setupGuestReconnect(matchId, metadata, lastLocalSeq, channel, deps, runtime);
}

function setupHostReconnectResponder(
  matchId: string,
  metadata: IMatchMetadataRecord,
  channel: IGameSessionChannel,
  deps: ReconnectDependencies,
  runtime: ReconnectRuntime,
): void {
  runtime.cleanupChannel = channel.onReconnectRequest((request) => {
    void answerReconnectRequest(request, {
      matchId,
      metadata,
      channel,
      getEventsFromSeq: (seq) =>
        deps.getHostEventsFromSeq(request.lastLocalSeq === 0 ? 0 : seq),
    });
  });
}

function setupGuestReconnect(
  matchId: string,
  metadata: IMatchMetadataRecord,
  lastLocalSeq: number,
  channel: IGameSessionChannel,
  deps: ReconnectDependencies,
  runtime: ReconnectRuntime,
): void {
  const armReplayWait = (): void => {
    if (runtime.replayWaitId) clearTimeout(runtime.replayWaitId);
    runtime.replayWaitId = setTimeout(() => {
      runtime.replayWaitId = null;
      enterHostPending(matchId, deps, runtime);
    }, deps.replayWaitMs);
  };

  const unsubscribeReplay = channel.onReplayStream((stream) => {
    if (stream.matchId !== matchId) return;
    runtime.replayStarted = true;
    // Progress restarts the wait; the final chunk ends it.
    if (stream.done) clearReconnectTimers(runtime);
    else armReplayWait();
    // One failed chunk must not poison the chain for every later one.
    runtime.replayChain = runtime.replayChain
      .then(() => applyReplayStream(matchId, stream, deps, runtime))
      .catch((error: unknown) => {
        if (runtime.cancelled) return;
        clearReconnectTimers(runtime);
        reportReconnectFailure(error);
      });
  });
  const unsubscribeReject = channel.onReconnectReject((rejection) => {
    if (rejection.matchId !== matchId) return;
    clearReconnectTimers(runtime);
    deps.redirectToLobby(matchId, rejection.reason);
  });
  // An unmatched request is answered with a match-less `peer-rejected`,
  // not a `reconnect-reject`. Only this request can provoke it, and only
  // before any replay chunk has started.
  const unsubscribePeerRejection = channel.onPeerRejection((rejection) => {
    if (!runtime.requestSent || runtime.replayStarted) return;
    if (rejection.reason !== WRONG_MATCH_REASON) return;
    clearReconnectTimers(runtime);
    deps.redirectToLobby(matchId, 'Wrong match');
  });

  runtime.cleanupChannel = () => {
    unsubscribeReplay();
    unsubscribeReject();
    unsubscribePeerRejection();
  };

  const sendReconnectRequest = (): void => {
    if (runtime.requestSent || runtime.cancelled) return;
    runtime.requestSent = true;
    clearReconnectTimers(runtime);
    channel.broadcastReconnectRequest({
      matchId,
      lastLocalSeq: runtime.requestedFullReplay ? 0 : lastLocalSeq,
    });
    armReplayWait();
  };

  const checkHost = (): void => {
    if (deps.getHostPresent(metadata.hostPeerId)) {
      sendReconnectRequest();
    }
  };

  runtime.timeoutId = setTimeout(() => {
    handleReconnectTimeout(matchId, deps, runtime);
  }, deps.timeoutMs);

  runtime.pollId = setInterval(checkHost, deps.pollIntervalMs);
  checkHost();
}

async function applyReplayStream(
  matchId: string,
  stream: ReplayStreamMessage,
  deps: ReconnectDependencies,
  runtime: ReconnectRuntime,
): Promise<void> {
  runtime.replayEvents.push(...stream.events);
  if (!stream.done || runtime.cancelled) return;

  const events = runtime.replayEvents.slice();
  runtime.replayEvents = [];
  if (events.every((event) => typeof event.sequence === 'number')) {
    events.sort((left, right) => left.sequence - right.sequence);
  }
  const assumePrefixSnapshot = runtime.requestedFullReplay;
  runtime.requestedFullReplay = false;
  const verdict = await reconcileMatchLogMirror({
    matchId,
    receivedEvents: events,
    storage: {
      getEventsForMatch: deps.getEventsForMatch,
      deleteEventsForMatch: deps.deleteEventsForMatch,
    },
    assumePrefixSnapshot,
  });
  if (verdict.kind !== 'match') {
    logger.warn('Match log mirror prefix diverged; discarding mirror', verdict);
    deps.onMirrorPrefixDivergence?.(verdict);
  }

  // Full baselines replace even a matching recovered prefix. Persist before
  // hydrating, as on divergence: the ordinary appender short-circuits to the
  // in-memory session and would duplicate the prefix or leave storage empty.
  const diverged = verdict.kind !== 'match';
  const rebuild =
    diverged ||
    assumePrefixSnapshot ||
    events[0]?.type === GameEventType.GameCreated;
  const held = useGameplayStore.getState().interactiveSession?.getSession();
  if (!rebuild && held) {
    // Admission is pure. Refuse the entire tail before the first live append,
    // including conflicting repeats that the batch's delivery dedup would skip.
    assertGameEventBatchAdmissible(held, events);
  }
  const seen = new Set<string>();
  for (const event of events) {
    if (seen.has(event.id)) continue;
    seen.add(event.id);
    await (rebuild
      ? deps.persistReplayEvent(matchId, event)
      : deps.appendReplayEvent(matchId, event));
  }
  if (runtime.cancelled) return;
  if (rebuild) {
    deps.adoptRebuiltSession(await deps.hydrateFromMatchLog(matchId));
    // Only here. The flag records "your board is not theirs", and this
    // is the one moment that stops being true.
    useP2PMirrorStore.getState().resolveDivergenceAfterRebuild(matchId);
  } else if (!useGameplayStore.getState().interactiveSession) {
    deps.setHydratedSession(await deps.hydrateFromMatchLog(matchId));
  }
  deps.setLive();
}

function handleReconnectTimeout(
  matchId: string,
  deps: ReconnectDependencies,
  runtime: ReconnectRuntime,
): void {
  if (runtime.requestSent || runtime.cancelled) return;
  enterHostPending(matchId, deps, runtime);
}

/** Show the locally logged board and wait on the absent host. */
function enterHostPending(
  matchId: string,
  deps: ReconnectDependencies,
  runtime: ReconnectRuntime,
): void {
  if (runtime.cancelled) return;
  clearReconnectTimers(runtime);
  void deps
    .hydrateFromMatchLog(matchId)
    .then((session) => {
      if (runtime.cancelled) return;
      deps.setHydratedSession(session);
      deps.setHostPending();
    })
    .catch((error: unknown) => {
      if (!runtime.cancelled) reportReconnectFailure(error);
    });
}
