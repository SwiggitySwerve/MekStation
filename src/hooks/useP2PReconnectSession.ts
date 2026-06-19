import { useEffect } from 'react';

import type { IGameSession } from '@/types/gameplay';
import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import { InteractiveSession } from '@/engine/InteractiveSession';
import {
  answerReconnectRequest,
  createGameSessionChannel,
  getGameSessionAwarenessStates,
  getLocalPeerId as getSyncLocalPeerId,
  matchLogStorage,
  normalizeRoomCode,
  type IGameSessionChannel,
  type IMatchMetadataRecord,
} from '@/lib/p2p';
import { useSyncRoomStore } from '@/lib/p2p/useSyncRoomStore';
import { useGameplayStore } from '@/stores/useGameplayStore';

export const RECONNECT_HOST_WAIT_MS = 10_000;
const HOST_POLL_INTERVAL_MS = 250;
const P2P_MATCH_ID_PREFIX = 'p2p-';

type ReplayEventAppender = (
  matchId: string,
  event: IGameEvent,
) => Promise<void> | void;

type ReplayStreamMessage = Parameters<
  Parameters<IGameSessionChannel['onReplayStream']>[0]
>[0];

interface ReconnectDependencies {
  readonly timeoutMs: number;
  readonly pollIntervalMs: number;
  readonly getLastSequence: (matchId: string) => Promise<number | null>;
  readonly getMatchMetadata: (
    matchId: string,
  ) => Promise<IMatchMetadataRecord | undefined>;
  readonly ensureSyncRoom: (matchId: string) => Promise<void> | void;
  readonly getLocalPeerId: () => string | null;
  readonly getHostPresent: (hostPeerId: string | null) => boolean;
  readonly createChannel: (
    matchId: string,
    localPeerId: string,
  ) => IGameSessionChannel;
  readonly appendReplayEvent: ReplayEventAppender;
  readonly hydrateFromMatchLog: (matchId: string) => Promise<IGameSession>;
  readonly setHydratedSession: (session: IGameSession) => void;
  readonly setHostPending: () => void;
  readonly setLive: () => void;
  readonly redirectToLobby: (matchId: string, reason: string) => void;
  readonly getHostEventsFromSeq: (
    seq: number,
  ) => readonly IGameEvent[] | Promise<readonly IGameEvent[]>;
}

interface ReconnectRuntime {
  cancelled: boolean;
  cleanupChannel: (() => void) | null;
  timeoutId: ReturnType<typeof setTimeout> | null;
  pollId: ReturnType<typeof setInterval> | null;
  requestSent: boolean;
  replayChain: Promise<void>;
}

export interface IUseP2PReconnectSessionOptions {
  readonly timeoutMs?: number;
  readonly pollIntervalMs?: number;
  readonly getLastSequence?: (matchId: string) => Promise<number | null>;
  readonly getMatchMetadata?: (
    matchId: string,
  ) => Promise<IMatchMetadataRecord | undefined>;
  readonly ensureSyncRoom?: (matchId: string) => Promise<void> | void;
  readonly getLocalPeerId?: () => string | null;
  readonly getHostPresent?: (hostPeerId: string | null) => boolean;
  readonly createChannel?: (
    matchId: string,
    localPeerId: string,
  ) => IGameSessionChannel;
  readonly appendReplayEvent?: ReplayEventAppender;
  readonly hydrateFromMatchLog?: (matchId: string) => Promise<IGameSession>;
  readonly setHydratedSession?: (session: IGameSession) => void;
  readonly setHostPending?: () => void;
  readonly setLive?: () => void;
  readonly redirectToLobby?: (matchId: string, reason: string) => void;
  readonly getHostEventsFromSeq?: (
    seq: number,
  ) => readonly IGameEvent[] | Promise<readonly IGameEvent[]>;
}

export function useP2PReconnectSession(
  matchId: string | null,
  options: IUseP2PReconnectSessionOptions = {},
): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!matchId) return;

    const runtime = createReconnectRuntime();
    void startReconnectSession(matchId, options, runtime);

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
    requestSent: false,
    replayChain: Promise.resolve(),
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
    hydrateFromMatchLog:
      options.hydrateFromMatchLog ?? InteractiveSession.fromMatchLog,
    setHydratedSession: options.setHydratedSession ?? defaultSetHydratedSession,
    setHostPending: options.setHostPending ?? defaultSetHostPending,
    setLive: options.setLive ?? defaultSetLive,
    redirectToLobby: options.redirectToLobby ?? defaultRedirectToLobby,
    getHostEventsFromSeq:
      options.getHostEventsFromSeq ?? defaultGetHostEventsFromSeq,
    timeoutMs: options.timeoutMs ?? RECONNECT_HOST_WAIT_MS,
    pollIntervalMs: options.pollIntervalMs ?? HOST_POLL_INTERVAL_MS,
  };
}

async function startReconnectSession(
  matchId: string,
  options: IUseP2PReconnectSessionOptions,
  runtime: ReconnectRuntime,
): Promise<void> {
  const deps = resolveReconnectDependencies(options);
  const [lastSequenceResult, metadata] = await Promise.all([
    deps.getLastSequence(matchId),
    deps.getMatchMetadata(matchId),
  ]);
  const lastLocalSeq = lastSequenceResult ?? 0;

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
      getEventsFromSeq: deps.getHostEventsFromSeq,
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
  const unsubscribeReplay = subscribeReplayStream(
    matchId,
    channel,
    deps,
    runtime,
  );
  const unsubscribeReject = subscribeReconnectReject(
    matchId,
    channel,
    deps,
    runtime,
  );

  runtime.cleanupChannel = () => {
    unsubscribeReplay();
    unsubscribeReject();
  };

  const sendReconnectRequest = (): void => {
    if (runtime.requestSent || runtime.cancelled) return;
    runtime.requestSent = true;
    clearReconnectTimers(runtime);
    channel.broadcastReconnectRequest({ matchId, lastLocalSeq });
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

function subscribeReplayStream(
  matchId: string,
  channel: IGameSessionChannel,
  deps: ReconnectDependencies,
  runtime: ReconnectRuntime,
): () => void {
  return channel.onReplayStream((stream) => {
    if (stream.matchId !== matchId) return;
    runtime.replayChain = runtime.replayChain.then(() =>
      applyReplayStream(matchId, stream, deps, runtime),
    );
  });
}

async function applyReplayStream(
  matchId: string,
  stream: ReplayStreamMessage,
  deps: ReconnectDependencies,
  runtime: ReconnectRuntime,
): Promise<void> {
  const events = stream.events.slice().sort(compareEventsBySequence);
  for (const event of events) {
    await deps.appendReplayEvent(matchId, event);
  }
  if (!stream.done || runtime.cancelled) return;
  if (!useGameplayStore.getState().interactiveSession) {
    deps.setHydratedSession(await deps.hydrateFromMatchLog(matchId));
  }
  deps.setLive();
}

function compareEventsBySequence(left: IGameEvent, right: IGameEvent): number {
  return left.sequence - right.sequence;
}

function subscribeReconnectReject(
  matchId: string,
  channel: IGameSessionChannel,
  deps: ReconnectDependencies,
  runtime: ReconnectRuntime,
): () => void {
  return channel.onReconnectReject((rejection) => {
    if (rejection.matchId !== matchId) return;
    clearReconnectTimers(runtime);
    deps.redirectToLobby(matchId, rejection.reason);
  });
}

function handleReconnectTimeout(
  matchId: string,
  deps: ReconnectDependencies,
  runtime: ReconnectRuntime,
): void {
  if (runtime.requestSent || runtime.cancelled) return;
  clearReconnectTimers(runtime);
  void deps.hydrateFromMatchLog(matchId).then((session) => {
    if (runtime.cancelled) return;
    deps.setHydratedSession(session);
    deps.setHostPending();
  });
}

export function deriveReconnectRoomCode(matchId: string): string | null {
  if (!matchId.startsWith(P2P_MATCH_ID_PREFIX)) return null;
  const rawRoomCode = matchId.slice(P2P_MATCH_ID_PREFIX.length);
  return rawRoomCode ? normalizeRoomCode(rawRoomCode) : null;
}

async function defaultEnsureSyncRoom(matchId: string): Promise<void> {
  const store = useSyncRoomStore.getState();
  const roomCode = deriveReconnectRoomCode(matchId);
  if (!roomCode) return;
  if (store.activeRoom?.roomCode === roomCode) return;
  await store.joinRoom(roomCode);
}

function defaultGetLocalPeerId(): string | null {
  return getSyncLocalPeerId() ?? useSyncRoomStore.getState().localPeerId;
}

function defaultGetHostPresent(hostPeerId: string | null): boolean {
  if (!hostPeerId) return false;
  return getGameSessionAwarenessStates().some((peer) => {
    return peer.role === 'host' && peer.peerId === hostPeerId;
  });
}

function defaultCreateChannel(
  matchId: string,
  localPeerId: string,
): IGameSessionChannel {
  return createGameSessionChannel({ matchId, localPeerId });
}

async function appendReplayEventToActiveSession(
  matchId: string,
  event: IGameEvent,
): Promise<void> {
  const store = useGameplayStore.getState();
  const interactiveSession = store.interactiveSession;
  if (interactiveSession) {
    interactiveSession.appendEvent(event);
    store.setSession(interactiveSession.getSession());
    return;
  }
  await matchLogStorage.appendEvent(matchId, event);
}

function defaultSetHydratedSession(session: IGameSession): void {
  useGameplayStore.getState().setSession(session);
}

function defaultSetHostPending(): void {
  useGameplayStore.getState().setLocalMatchStatus('hostPending');
}

function defaultSetLive(): void {
  useGameplayStore.getState().resetLocalMatchStatus();
}

function defaultRedirectToLobby(matchId: string, reason: string): void {
  const roomCode = deriveReconnectRoomCode(matchId);
  const target = roomCode
    ? `/gameplay/lobby/${encodeURIComponent(roomCode)}`
    : '/gameplay/games';
  window.location.assign(`${target}?error=${encodeURIComponent(reason)}`);
}

function defaultGetHostEventsFromSeq(seq: number): readonly IGameEvent[] {
  const interactiveSession = useGameplayStore.getState().interactiveSession;
  const session =
    interactiveSession?.getSession() ?? useGameplayStore.getState().session;
  return (session?.events ?? [])
    .filter((event) => event.sequence >= seq)
    .sort(compareEventsBySequence);
}
