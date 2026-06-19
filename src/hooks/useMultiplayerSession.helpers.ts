import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import type {
  IClientAuth,
  IConnectOptions,
  IMultiplayerClient,
} from '@/lib/multiplayer/client';
import type {
  IIntentPayload,
  ILobbyUpdated,
  IMatchPaused,
  ISeatTimedOut,
} from '@/types/multiplayer/Protocol';

import { connect } from '@/lib/multiplayer/client';
import { useGameplayStore } from '@/stores/useGameplayStore';
import { RECONNECT_GRACE_MS } from '@/types/multiplayer/Protocol';

import type {
  IMatchClosedInfo,
  IMatchPausedInfo,
  IMultiplayerError,
  MultiplayerStatus,
} from './useMultiplayerSession';

/**
 * Cap the consumer-facing `events` tail so a long match doesn't unbound
 * React state. The mirror keeps its own uncapped log.
 */
const MAX_EVENTS_RETAINED = 200;

interface MultiplayerSetters {
  readonly setClosedInfo: Dispatch<SetStateAction<IMatchClosedInfo | null>>;
  readonly setError: Dispatch<SetStateAction<IMultiplayerError | null>>;
  readonly setEvents: Dispatch<SetStateAction<readonly unknown[]>>;
  readonly setIntentError: Dispatch<SetStateAction<IMultiplayerError | null>>;
  readonly setLastSeq: Dispatch<SetStateAction<number>>;
  readonly setLobbyState: Dispatch<SetStateAction<ILobbyUpdated | null>>;
  readonly setMirrorLog: Dispatch<SetStateAction<readonly unknown[]>>;
  readonly setPausedInfo: Dispatch<SetStateAction<IMatchPausedInfo | null>>;
  readonly setStatus: Dispatch<SetStateAction<MultiplayerStatus>>;
}

interface ConnectionOptions extends MultiplayerSetters {
  readonly auth: IClientAuth;
  readonly clientRef: MutableRefObject<IMultiplayerClient | null>;
  readonly lobbyStateRef: MutableRefObject<ILobbyUpdated | null>;
  readonly matchId: string;
  readonly options: IConnectOptions;
  readonly url: string;
}

interface EventHandlerContext extends MultiplayerSetters {
  readonly auth: IClientAuth;
  readonly client: IMultiplayerClient;
  readonly lobbyStateRef: MutableRefObject<ILobbyUpdated | null>;
}

export function resetMultiplayerConnectionState(
  setters: Pick<
    MultiplayerSetters,
    | 'setClosedInfo'
    | 'setError'
    | 'setIntentError'
    | 'setMirrorLog'
    | 'setPausedInfo'
    | 'setStatus'
  >,
): void {
  setters.setStatus('connecting');
  setters.setError(null);
  setters.setIntentError(null);
  setters.setPausedInfo(null);
  setters.setClosedInfo(null);
  setters.setMirrorLog([]);
}

export function connectMultiplayerSession(
  params: ConnectionOptions,
): () => void {
  const client = connect(params.url, params.matchId, params.auth, {
    reconnect: params.options.reconnect ?? true,
    socketFactory: params.options.socketFactory,
    lastSeq: params.options.lastSeq,
  });
  params.clientRef.current = client;

  const unsubReady = client.on('ready', () => {
    params.setStatus('ready');
    params.setLastSeq(client.lastSeq());
  });
  const unsubEvent = client.on(
    'event',
    createMultiplayerEventHandler({ ...params, client }),
  );
  const unsubError = client.on('error', createClientErrorHandler(params));
  const unsubClose = client.on('close', createClientCloseHandler(params));

  return () => {
    unsubReady();
    unsubEvent();
    unsubError();
    unsubClose();
    closeClient(params.clientRef, client);
  };
}

export function sendClientIntent(
  client: IMultiplayerClient | null,
  intent: IIntentPayload,
): void {
  if (!client) return;
  client.send(intent);
}

function createMultiplayerEventHandler(
  context: EventHandlerContext,
): (raw: unknown) => void {
  return (raw) => handleMultiplayerEvent(raw, context);
}

function handleMultiplayerEvent(
  raw: unknown,
  context: EventHandlerContext,
): void {
  const kind = getEnvelopeKind(raw);

  if (kind === 'LobbyUpdated') {
    handleLobbyUpdated(raw as ILobbyUpdated, context);
    return;
  }
  if (kind === 'MatchPaused') {
    handleMatchPaused(raw as IMatchPaused, context);
    return;
  }
  if (kind === 'MatchResumed') {
    handleMatchResumed(context);
    return;
  }
  if (kind === 'SeatTimedOut') {
    handleSeatTimedOut(raw as ISeatTimedOut, context);
    return;
  }

  appendGameEvent(raw, context);
}

function handleLobbyUpdated(
  lobby: ILobbyUpdated,
  context: EventHandlerContext,
): void {
  context.lobbyStateRef.current = lobby;
  context.setLobbyState(lobby);
}

function handleMatchPaused(
  paused: IMatchPaused,
  context: EventHandlerContext,
): void {
  context.setStatus('paused');
  const remainingMs = paused.graceRemainingMs ?? RECONNECT_GRACE_MS;
  const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const isHost =
    context.lobbyStateRef.current?.hostPlayerId != null &&
    context.lobbyStateRef.current.hostPlayerId === context.auth.playerId;
  const store = useGameplayStore.getState();

  store.setLocalMatchStatus(isHost ? 'guestPending' : 'hostPending', {
    graceMs: remainingMs,
    nowMs: Date.now(),
  });
  if (paused.pendingExpiresAtMs != null) {
    store.setLocalMatchGraceDeadline(paused.pendingExpiresAtMs);
  }
  context.setPausedInfo({
    pendingSlots: paused.pendingSlots,
    graceRemainingMs: remainingMs,
    pendingExpiresAtMs: paused.pendingExpiresAtMs ?? null,
  });
  context.setError({
    code: 'MATCH_PAUSED',
    reason: `Waiting for opponent to reconnect (${remainingSeconds} seconds remaining)...`,
  });
}

function handleMatchResumed(context: EventHandlerContext): void {
  context.setStatus('ready');
  context.setError(null);
  context.setPausedInfo(null);
  useGameplayStore.getState().resetLocalMatchStatus();
}

function handleSeatTimedOut(
  timed: ISeatTimedOut,
  context: EventHandlerContext,
): void {
  context.setError({
    code: 'SEAT_TIMED_OUT',
    reason: `Seat ${timed.slotId} (player ${timed.playerId}) timed out`,
  });
  useGameplayStore.getState().setLocalMatchStatus('aborted');
}

function appendGameEvent(raw: unknown, context: EventHandlerContext): void {
  context.setEvents((prev) => {
    const next = prev.concat([raw]);
    return next.length > MAX_EVENTS_RETAINED
      ? next.slice(next.length - MAX_EVENTS_RETAINED)
      : next;
  });
  context.setMirrorLog((prev) => prev.concat([raw]));
  context.setLastSeq(context.client.lastSeq());
}

function createClientErrorHandler(
  setters: Pick<
    MultiplayerSetters,
    'setError' | 'setIntentError' | 'setStatus'
  >,
): (payload: unknown) => void {
  return (payload) => handleClientError(payload, setters);
}

function handleClientError(
  payload: unknown,
  setters: Pick<
    MultiplayerSetters,
    'setError' | 'setIntentError' | 'setStatus'
  >,
): void {
  const err = payload as { code?: string; reason?: string } | Error;
  if (err instanceof Error) {
    setters.setStatus('error');
    setters.setError({ code: 'CLIENT_ERROR', reason: err.message });
    return;
  }
  if (typeof err.code === 'string' && err.code !== 'CLIENT_ERROR') {
    setters.setIntentError({ code: err.code, reason: err.reason });
    return;
  }
  setters.setStatus('error');
  setters.setError({ code: err.code, reason: err.reason });
}

function createClientCloseHandler(
  setters: Pick<MultiplayerSetters, 'setClosedInfo' | 'setStatus'>,
): (payload: unknown) => void {
  return (payload) => {
    setters.setStatus('closed');
    setters.setClosedInfo(getClosedInfo(payload));
  };
}

function getClosedInfo(payload: unknown): IMatchClosedInfo {
  if (!payload || typeof payload !== 'object') return {};
  const closeInfo = payload as { code?: string; reason?: string };
  return { code: closeInfo.code, reason: closeInfo.reason };
}

function closeClient(
  clientRef: MutableRefObject<IMultiplayerClient | null>,
  client: IMultiplayerClient,
): void {
  try {
    client.close();
  } catch {
    // ignore - already closed
  }
  if (clientRef.current === client) {
    clientRef.current = null;
  }
}

function getEnvelopeKind(raw: unknown): string | null {
  if (typeof raw !== 'object' || raw === null || !('kind' in raw)) {
    return null;
  }
  const kind = (raw as { kind?: unknown }).kind;
  return typeof kind === 'string' ? kind : null;
}
