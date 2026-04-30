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
  readonly launch: (matchId?: string) => ILobbyChannelResult;
  readonly onStateChange: (callback: LobbyStateCallback) => () => void;
  readonly onPeerRejection: (callback: LobbyRejectionCallback) => () => void;
}

export interface ILobbyChannelOptions {
  readonly localPeerId?: string;
  readonly lobbyMap?: Y.Map<unknown>;
  readonly getLobbyMap?: () => Y.Map<unknown> | null;
  readonly matchIdFactory?: () => string;
}

export function createLobbyChannel(
  options: ILobbyChannelOptions = {},
): ILobbyChannel {
  const rejectionListeners = new Set<LobbyRejectionCallback>();

  const currentPeerId = (): string => requireLocalPeerId(options);

  const reject = (
    intentId: string,
    reason: LobbyRejectionReason,
  ): ILobbyChannelResult => {
    const envelope: IPeerRejectedEnvelope = {
      kind: 'peer-rejected',
      intentId,
      reason,
    };
    rejectionListeners.forEach((listener) => listener(envelope));
    return {
      ok: false,
      state: readLobbyState(options),
      reason,
    };
  };

  const write = (state: ILobbyState): ILobbyChannelResult => {
    const parsed = parseLobbyState(state);
    if (!parsed) {
      return reject('lobby:update', 'invalid-state');
    }
    requireLobbyMap(options).set(LOBBY_STATE_KEY, parsed);
    return { ok: true, state: parsed };
  };

  return {
    getState: () => readLobbyState(options),

    initializeHost: (hostPeerId?: string): ILobbyState => {
      const state = createInitialLobbyState(hostPeerId ?? currentPeerId());
      requireLobbyMap(options).set(LOBBY_STATE_KEY, state);
      return state;
    },

    joinGuest: (guestPeerId?: string): ILobbyChannelResult => {
      const state = readLobbyState(options);
      if (!state) return reject('lobby:joinGuest', 'invalid-state');

      const peerId = guestPeerId ?? currentPeerId();
      if (state.hostPeerId === peerId) {
        return { ok: true, state };
      }
      if (state.guestPeerId && state.guestPeerId !== peerId) {
        return reject('lobby:joinGuest', 'lobby-full');
      }

      return write({
        ...state,
        guestPeerId: peerId,
        guestReady: false,
      });
    },

    updateLoadout: (
      side: LobbySide,
      loadout: ILoadout,
    ): ILobbyChannelResult => {
      const state = readLobbyState(options);
      if (!state) return reject(`lobby:updateLoadout:${side}`, 'invalid-state');
      if (state.matchId) {
        return reject(`lobby:updateLoadout:${side}`, 'match-started');
      }

      const ownerPeerId = getLobbyOwnerForSide(state, side);
      if (!ownerPeerId || ownerPeerId !== currentPeerId()) {
        return reject(`lobby:updateLoadout:${side}`, 'unauthorized-slot');
      }

      return write({
        ...state,
        hostLoadout: side === 'host' ? loadout : state.hostLoadout,
        guestLoadout: side === 'guest' ? loadout : state.guestLoadout,
        hostReady: side === 'host' ? false : state.hostReady,
        guestReady: side === 'guest' ? false : state.guestReady,
      });
    },

    updateMapConfig: (config: IMapConfig): ILobbyChannelResult => {
      const state = readLobbyState(options);
      if (!state) return reject('lobby:updateMapConfig', 'invalid-state');
      if (state.matchId) {
        return reject('lobby:updateMapConfig', 'match-started');
      }
      if (state.hostPeerId !== currentPeerId()) {
        return reject('lobby:updateMapConfig', 'host-only');
      }
      return write({
        ...state,
        mapConfig: config,
        hostReady: false,
        guestReady: false,
      });
    },

    setReady: (peerId: string, ready: boolean): ILobbyChannelResult => {
      const state = readLobbyState(options);
      if (!state) return reject('lobby:setReady', 'invalid-state');
      if (state.matchId) return reject('lobby:setReady', 'match-started');
      if (peerId !== currentPeerId()) {
        return reject('lobby:setReady', 'unauthorized-slot');
      }

      const side = getLobbySideForPeer(state, peerId);
      if (!side) return reject('lobby:setReady', 'unknown-peer');
      if (ready && getLobbyReadyBlockReason(state, side) !== null) {
        return reject('lobby:setReady', 'invalid-loadout');
      }

      return write({
        ...state,
        hostReady: side === 'host' ? ready : state.hostReady,
        guestReady: side === 'guest' ? ready : state.guestReady,
      });
    },

    launch: (matchId?: string): ILobbyChannelResult => {
      const state = readLobbyState(options);
      if (!state) return reject('lobby:launch', 'invalid-state');
      if (state.matchId) return { ok: true, state };
      if (state.hostPeerId !== currentPeerId()) {
        return reject('lobby:launch', 'host-only');
      }
      if (!canLaunchLobby(state)) {
        return reject('lobby:launch', 'not-ready');
      }
      return write({
        ...state,
        matchId: matchId ?? options.matchIdFactory?.() ?? createMatchId(),
      });
    },

    onStateChange: (callback: LobbyStateCallback): (() => void) => {
      const lobbyMap = requireLobbyMap(options);
      const observer = (): void => {
        callback(readLobbyState(options));
      };
      lobbyMap.observe(observer);
      return () => lobbyMap.unobserve(observer);
    },

    onPeerRejection: (callback: LobbyRejectionCallback): (() => void) => {
      rejectionListeners.add(callback);
      return () => {
        rejectionListeners.delete(callback);
      };
    },
  };
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
