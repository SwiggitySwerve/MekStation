import type * as Y from 'yjs';

import {
  canLaunchLobby,
  createInitialLobbyState,
  getLobbyReadyBlockReason,
  getLobbyOwnerForSide,
  getLobbySideForPeer,
  parseLobbyState,
  type ILobbyState,
  type ILoadout,
  type IMapConfig,
  type LobbyHostSide,
  type LobbySide,
} from '@/types/gameplay/GameLobbyInterfaces';

import type { IPeerRejectedEnvelope } from './gameSessionChannel';

import { getLocalPeerId, getYMap } from './SyncProvider';

export const LOBBY_MAP_NAME = 'lobby';
export const LOBBY_STATE_KEY = 'state';

export type LobbyRejectionReason =
  | 'unauthorized-slot'
  | 'host-only'
  | 'invalid-state'
  | 'invalid-loadout'
  | 'lobby-full'
  | 'match-started'
  | 'not-ready'
  | 'unknown-peer';

export interface ILobbyChannelResult {
  readonly ok: boolean;
  readonly state: ILobbyState | null;
  readonly reason?: LobbyRejectionReason;
}

export type LobbyStateCallback = (state: ILobbyState | null) => void;
export type LobbyRejectionCallback = (envelope: IPeerRejectedEnvelope) => void;

export interface ILobbyChannel {
  readonly getState: () => ILobbyState | null;
  readonly initializeHost: (hostPeerId?: string) => ILobbyState;
  readonly joinGuest: (guestPeerId?: string) => ILobbyChannelResult;
  readonly updateLoadout: (
    side: LobbySide,
    loadout: ILoadout,
  ) => ILobbyChannelResult;
  readonly updateMapConfig: (config: IMapConfig) => ILobbyChannelResult;
  readonly setReady: (peerId: string, ready: boolean) => ILobbyChannelResult;
  readonly setHostSide: (hostSide: LobbyHostSide) => ILobbyChannelResult;
  readonly launch: (matchId?: string) => ILobbyChannelResult;
  /**
   * Per `add-game-session-invite-and-lobby-1v1` § 9: react to a peer
   * disappearing from the sync room before the match has launched.
   *
   * - If the disconnected peer was the host: marks the lobby `closed`
   *   so the guest UI can route back to the landing page (§ 9.2).
   * - If the disconnected peer was the guest: clears `guestPeerId` and
   *   resets `guestReady` so the host falls back to "Waiting for
   *   opponent..." until a new guest joins (§ 9.3).
   * - In every case: resets the disconnected peer's `ready` flag to
   *   `false` so a re-join doesn't inherit stale readiness (§ 9.1).
   *
   * No-op once `matchId` is set — at that point the match has already
   * launched and the in-game reconnect grace window (Wave 4) takes
   * over.
   */
  readonly handlePeerDisconnect: (peerId: string) => ILobbyChannelResult;
  readonly onStateChange: (callback: LobbyStateCallback) => () => void;
  readonly onPeerRejection: (callback: LobbyRejectionCallback) => () => void;
}

export interface ILobbyChannelOptions {
  readonly localPeerId?: string;
  readonly lobbyMap?: Y.Map<unknown>;
  readonly getLobbyMap?: () => Y.Map<unknown> | null;
  readonly matchIdFactory?: () => string;
}

interface ILobbyRuntime {
  readonly options: ILobbyChannelOptions;
  readonly rejectionListeners: Set<LobbyRejectionCallback>;
}

export function createLobbyChannel(
  options: ILobbyChannelOptions = {},
): ILobbyChannel {
  const runtime: ILobbyRuntime = {
    options,
    rejectionListeners: new Set<LobbyRejectionCallback>(),
  };

  return {
    getState: () => readLobbyState(options),

    initializeHost: (hostPeerId?: string): ILobbyState =>
      initializeLobbyHost(runtime, hostPeerId),

    joinGuest: (guestPeerId?: string): ILobbyChannelResult =>
      joinLobbyGuest(runtime, guestPeerId),

    updateLoadout: (side: LobbySide, loadout: ILoadout): ILobbyChannelResult =>
      updateLobbyLoadout(runtime, side, loadout),

    updateMapConfig: (config: IMapConfig): ILobbyChannelResult =>
      updateLobbyMapConfig(runtime, config),

    setReady: (peerId: string, ready: boolean): ILobbyChannelResult =>
      setLobbyReady(runtime, peerId, ready),

    setHostSide: (hostSide: LobbyHostSide): ILobbyChannelResult =>
      setLobbyHostSide(runtime, hostSide),

    launch: (matchId?: string): ILobbyChannelResult =>
      launchLobby(runtime, matchId),

    handlePeerDisconnect: (peerId: string): ILobbyChannelResult =>
      handleLobbyPeerDisconnect(runtime, peerId),

    onStateChange: (callback: LobbyStateCallback): (() => void) => {
      const lobbyMap = requireLobbyMap(options);
      const observer = (): void => {
        callback(readLobbyState(options));
      };
      lobbyMap.observe(observer);
      return () => lobbyMap.unobserve(observer);
    },

    onPeerRejection: (callback: LobbyRejectionCallback): (() => void) => {
      runtime.rejectionListeners.add(callback);
      return () => {
        runtime.rejectionListeners.delete(callback);
      };
    },
  };
}

function currentPeerId(runtime: ILobbyRuntime): string {
  return requireLocalPeerId(runtime.options);
}

function rejectLobbyIntent(
  runtime: ILobbyRuntime,
  intentId: string,
  reason: LobbyRejectionReason,
): ILobbyChannelResult {
  const envelope: IPeerRejectedEnvelope = {
    kind: 'peer-rejected',
    intentId,
    reason,
  };
  runtime.rejectionListeners.forEach((listener) => listener(envelope));
  return {
    ok: false,
    state: readLobbyState(runtime.options),
    reason,
  };
}

function writeLobbyState(
  runtime: ILobbyRuntime,
  state: ILobbyState,
): ILobbyChannelResult {
  const parsed = parseLobbyState(state);
  if (!parsed) {
    return rejectLobbyIntent(runtime, 'lobby:update', 'invalid-state');
  }
  requireLobbyMap(runtime.options).set(LOBBY_STATE_KEY, parsed);
  return { ok: true, state: parsed };
}

function initializeLobbyHost(
  runtime: ILobbyRuntime,
  hostPeerId?: string,
): ILobbyState {
  const state = createInitialLobbyState(hostPeerId ?? currentPeerId(runtime));
  requireLobbyMap(runtime.options).set(LOBBY_STATE_KEY, state);
  return state;
}

function joinLobbyGuest(
  runtime: ILobbyRuntime,
  guestPeerId?: string,
): ILobbyChannelResult {
  const state = readLobbyState(runtime.options);
  if (!state)
    return rejectLobbyIntent(runtime, 'lobby:joinGuest', 'invalid-state');

  const peerId = guestPeerId ?? currentPeerId(runtime);
  if (state.hostPeerId === peerId) return { ok: true, state };
  if (state.guestPeerId && state.guestPeerId !== peerId) {
    return rejectLobbyIntent(runtime, 'lobby:joinGuest', 'lobby-full');
  }

  return writeLobbyState(runtime, {
    ...state,
    guestPeerId: peerId,
    guestReady: false,
  });
}

function updateLobbyLoadout(
  runtime: ILobbyRuntime,
  side: LobbySide,
  loadout: ILoadout,
): ILobbyChannelResult {
  const state = readLobbyState(runtime.options);
  if (!state) {
    return rejectLobbyIntent(
      runtime,
      `lobby:updateLoadout:${side}`,
      'invalid-state',
    );
  }
  if (state.matchId) {
    return rejectLobbyIntent(
      runtime,
      `lobby:updateLoadout:${side}`,
      'match-started',
    );
  }

  const ownerPeerId = getLobbyOwnerForSide(state, side);
  if (!ownerPeerId || ownerPeerId !== currentPeerId(runtime)) {
    return rejectLobbyIntent(
      runtime,
      `lobby:updateLoadout:${side}`,
      'unauthorized-slot',
    );
  }

  return writeLobbyState(runtime, {
    ...state,
    hostLoadout: side === 'host' ? loadout : state.hostLoadout,
    guestLoadout: side === 'guest' ? loadout : state.guestLoadout,
    hostReady: side === 'host' ? false : state.hostReady,
    guestReady: side === 'guest' ? false : state.guestReady,
  });
}

function updateLobbyMapConfig(
  runtime: ILobbyRuntime,
  config: IMapConfig,
): ILobbyChannelResult {
  const state = readLobbyState(runtime.options);
  if (!state)
    return rejectLobbyIntent(runtime, 'lobby:updateMapConfig', 'invalid-state');
  if (state.matchId) {
    return rejectLobbyIntent(runtime, 'lobby:updateMapConfig', 'match-started');
  }
  if (state.hostPeerId !== currentPeerId(runtime)) {
    return rejectLobbyIntent(runtime, 'lobby:updateMapConfig', 'host-only');
  }
  return writeLobbyState(runtime, {
    ...state,
    mapConfig: config,
    hostReady: false,
    guestReady: false,
  });
}

function setLobbyReady(
  runtime: ILobbyRuntime,
  peerId: string,
  ready: boolean,
): ILobbyChannelResult {
  const state = readLobbyState(runtime.options);
  if (!state)
    return rejectLobbyIntent(runtime, 'lobby:setReady', 'invalid-state');
  if (state.matchId)
    return rejectLobbyIntent(runtime, 'lobby:setReady', 'match-started');
  if (peerId !== currentPeerId(runtime)) {
    return rejectLobbyIntent(runtime, 'lobby:setReady', 'unauthorized-slot');
  }

  const side = getLobbySideForPeer(state, peerId);
  if (!side)
    return rejectLobbyIntent(runtime, 'lobby:setReady', 'unknown-peer');
  if (ready && getLobbyReadyBlockReason(state, side) !== null) {
    return rejectLobbyIntent(runtime, 'lobby:setReady', 'invalid-loadout');
  }

  return writeLobbyState(runtime, {
    ...state,
    hostReady: side === 'host' ? ready : state.hostReady,
    guestReady: side === 'guest' ? ready : state.guestReady,
  });
}

function setLobbyHostSide(
  runtime: ILobbyRuntime,
  hostSide: LobbyHostSide,
): ILobbyChannelResult {
  const state = readLobbyState(runtime.options);
  if (!state)
    return rejectLobbyIntent(runtime, 'lobby:setHostSide', 'invalid-state');
  if (state.matchId)
    return rejectLobbyIntent(runtime, 'lobby:setHostSide', 'match-started');
  if (state.hostPeerId !== currentPeerId(runtime)) {
    return rejectLobbyIntent(runtime, 'lobby:setHostSide', 'host-only');
  }
  return writeLobbyState(runtime, {
    ...state,
    hostSide,
    hostReady: false,
    guestReady: false,
  });
}

function launchLobby(
  runtime: ILobbyRuntime,
  matchId?: string,
): ILobbyChannelResult {
  const state = readLobbyState(runtime.options);
  if (!state)
    return rejectLobbyIntent(runtime, 'lobby:launch', 'invalid-state');
  if (state.matchId) return { ok: true, state };
  if (state.hostPeerId !== currentPeerId(runtime)) {
    return rejectLobbyIntent(runtime, 'lobby:launch', 'host-only');
  }
  if (!canLaunchLobby(state)) {
    return rejectLobbyIntent(runtime, 'lobby:launch', 'not-ready');
  }
  return writeLobbyState(runtime, {
    ...state,
    matchId: matchId ?? runtime.options.matchIdFactory?.() ?? createMatchId(),
  });
}

function handleLobbyPeerDisconnect(
  runtime: ILobbyRuntime,
  peerId: string,
): ILobbyChannelResult {
  const state = readLobbyState(runtime.options);
  if (!state) {
    return rejectLobbyIntent(
      runtime,
      'lobby:handlePeerDisconnect',
      'invalid-state',
    );
  }
  if (state.matchId) return { ok: true, state };

  const isHost = state.hostPeerId === peerId;
  const isGuest = state.guestPeerId === peerId;
  if (!isHost && !isGuest) return { ok: true, state };

  return isHost
    ? writeLobbyState(runtime, {
        ...state,
        closed: true,
        hostReady: false,
        guestReady: false,
      })
    : writeLobbyState(runtime, {
        ...state,
        guestPeerId: null,
        guestLoadout: state.guestLoadout,
        hostReady: false,
        guestReady: false,
      });
}

export function readLobbyState(
  options: Pick<ILobbyChannelOptions, 'lobbyMap' | 'getLobbyMap'> = {},
): ILobbyState | null {
  const state = requireLobbyMap(options).get(LOBBY_STATE_KEY);
  return parseLobbyState(state);
}

function requireLobbyMap(
  options: Pick<ILobbyChannelOptions, 'lobbyMap' | 'getLobbyMap'>,
): Y.Map<unknown> {
  const lobbyMap =
    options.lobbyMap ??
    options.getLobbyMap?.() ??
    getYMap<unknown>(LOBBY_MAP_NAME);

  if (!lobbyMap) {
    throw new Error('No active lobby Y.Map');
  }
  return lobbyMap;
}

function requireLocalPeerId(options: ILobbyChannelOptions): string {
  const peerId = options.localPeerId ?? getLocalPeerId();
  if (!peerId) {
    throw new Error('No local peer id available');
  }
  return peerId;
}

function createMatchId(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }
  return `match-${Date.now().toString(36)}`;
}
