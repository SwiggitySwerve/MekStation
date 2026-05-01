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

    setHostSide: (hostSide: LobbyHostSide): ILobbyChannelResult => {
      const state = readLobbyState(options);
      if (!state) return reject('lobby:setHostSide', 'invalid-state');
      if (state.matchId) return reject('lobby:setHostSide', 'match-started');
      if (state.hostPeerId !== currentPeerId()) {
        return reject('lobby:setHostSide', 'host-only');
      }
      // Picking a side resets ready flags so both peers re-acknowledge
      // after the assignment changes.
      return write({
        ...state,
        hostSide,
        hostReady: false,
        guestReady: false,
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

    handlePeerDisconnect: (peerId: string): ILobbyChannelResult => {
      const state = readLobbyState(options);
      if (!state) return reject('lobby:handlePeerDisconnect', 'invalid-state');
      // Once the match has launched, in-game reconnect grace owns the
      // disconnect lifecycle. Pre-launch is the only window where this
      // helper rewrites lobby state.
      if (state.matchId) return { ok: true, state };

      const isHost = state.hostPeerId === peerId;
      const isGuest = state.guestPeerId === peerId;
      if (!isHost && !isGuest) {
        // Unknown peer (e.g., a third peer that joined the room but
        // never claimed a side) — nothing to mutate. Returning ok keeps
        // the upstream wiring idempotent so the awareness poller can
        // call this every tick without surfacing a spurious rejection.
        return { ok: true, state };
      }

      if (isHost) {
        // § 9.2: host gone → mark `closed` so the guest's lobby page
        // navigates back to the landing screen with a toast. We also
        // reset both ready flags so a residual `closed` state doesn't
        // appear "ready" if the guest sees it briefly before the route
        // change fires.
        return write({
          ...state,
          closed: true,
          hostReady: false,
          guestReady: false,
        });
      }

      // § 9.3 + § 9.1 (guest path): clear the guest assignment and
      // reset both ready flags. The host UI re-renders "Waiting for
      // opponent..." because `guestPeerId` is null again, and a future
      // joiner walks through `joinGuest()` cleanly.
      return write({
        ...state,
        guestPeerId: null,
        guestLoadout: state.guestLoadout,
        hostReady: false,
        guestReady: false,
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
