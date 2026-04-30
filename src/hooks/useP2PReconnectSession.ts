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

    let cancelled = false;
    let cleanupChannel: (() => void) | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let pollId: ReturnType<typeof setInterval> | null = null;
    let requestSent = false;
    let replayChain = Promise.resolve();

    const clearTimers = (): void => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (pollId) {
        clearInterval(pollId);
        pollId = null;
      }
    };

    const getLastSequence =
      options.getLastSequence ??
      matchLogStorage.getLastSequence.bind(matchLogStorage);
    const getMatchMetadata =
      options.getMatchMetadata ??
      matchLogStorage.getMatchMetadata.bind(matchLogStorage);
    const ensureSyncRoom = options.ensureSyncRoom ?? defaultEnsureSyncRoom;
    const getLocalPeerId = options.getLocalPeerId ?? defaultGetLocalPeerId;
    const getHostPresent = options.getHostPresent ?? defaultGetHostPresent;
    const createChannel = options.createChannel ?? defaultCreateChannel;
    const appendReplayEvent =
      options.appendReplayEvent ?? appendReplayEventToActiveSession;
    const hydrateFromMatchLog =
      options.hydrateFromMatchLog ?? InteractiveSession.fromMatchLog;
    const setHydratedSession =
      options.setHydratedSession ?? defaultSetHydratedSession;
    const setHostPending = options.setHostPending ?? defaultSetHostPending;
    const setLive = options.setLive ?? defaultSetLive;
    const redirectToLobby = options.redirectToLobby ?? defaultRedirectToLobby;
    const timeoutMs = options.timeoutMs ?? RECONNECT_HOST_WAIT_MS;
    const pollIntervalMs = options.pollIntervalMs ?? HOST_POLL_INTERVAL_MS;

    void (async () => {
      const [lastSequenceResult, metadata] = await Promise.all([
        getLastSequence(matchId),
        getMatchMetadata(matchId),
      ]);
      const lastLocalSeq = lastSequenceResult ?? 0;

      await ensureSyncRoom(matchId);
      if (cancelled) return;

      const localPeerId = getLocalPeerId();
      if (!localPeerId) return;

      const channel = createChannel(matchId, localPeerId);

      if (metadata?.hostPeerId === localPeerId) {
        cleanupChannel = channel.onReconnectRequest((request) => {
          void answerReconnectRequest(request, {
            matchId,
            metadata,
            channel,
            getEventsFromSeq:
              options.getHostEventsFromSeq ?? defaultGetHostEventsFromSeq,
          });
        });
        return;
      }

      if (!metadata?.guestPeerId || metadata.guestPeerId !== localPeerId) {
        redirectToLobby(matchId, 'Match in progress');
        return;
      }

      const unsubscribeReplay = channel.onReplayStream((stream) => {
        if (stream.matchId !== matchId) return;
        replayChain = replayChain.then(async () => {
          const events = stream.events.slice().sort((left, right) => {
            return left.sequence - right.sequence;
          });
          for (const event of events) {
            await appendReplayEvent(matchId, event);
          }
          if (!stream.done || cancelled) return;
          if (!useGameplayStore.getState().interactiveSession) {
            setHydratedSession(await hydrateFromMatchLog(matchId));
          }
          setLive();
        });
      });

      const unsubscribeReject = channel.onReconnectReject((rejection) => {
        if (rejection.matchId !== matchId) return;
        clearTimers();
        redirectToLobby(matchId, rejection.reason);
      });

      cleanupChannel = () => {
        unsubscribeReplay();
        unsubscribeReject();
      };

      const sendReconnectRequest = (): void => {
        if (requestSent || cancelled) return;
        requestSent = true;
        clearTimers();
        channel.broadcastReconnectRequest({ matchId, lastLocalSeq });
      };

      const checkHost = (): void => {
        if (getHostPresent(metadata.hostPeerId)) {
          sendReconnectRequest();
        }
      };

      timeoutId = setTimeout(() => {
        if (requestSent || cancelled) return;
        clearTimers();
        void hydrateFromMatchLog(matchId).then((session) => {
          if (cancelled) return;
          setHydratedSession(session);
          setHostPending();
        });
      }, timeoutMs);

      pollId = setInterval(checkHost, pollIntervalMs);
      checkHost();
    })();

    return () => {
      cancelled = true;
      clearTimers();
      cleanupChannel?.();
    };
    // Reconnect dependencies are intentionally captured at mount time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);
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
    .sort((left, right) => left.sequence - right.sequence);
}
