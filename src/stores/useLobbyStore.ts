/**
 * Zustand mirror for the Yjs-backed networked 1v1 lobby.
 *
 * @spec openspec/changes/add-game-session-invite-and-lobby-1v1/specs/multiplayer-sync/spec.md
 */

import { create } from 'zustand';

import type { IPeerRejectedEnvelope } from '@/lib/p2p/gameSessionChannel';
import type {
  ILobbyChannel,
  ILobbyChannelResult,
  LobbyRejectionReason,
} from '@/lib/p2p/lobbyChannel';
import type {
  ILobbyState,
  ILoadout,
  IMapConfig,
  LobbyHostSide,
  LobbySide,
} from '@/types/gameplay/GameLobbyInterfaces';

interface LobbyStoreState {
  readonly channel: ILobbyChannel | null;
  readonly lobbyState: ILobbyState | null;
  readonly localPeerId: string | null;
  readonly roomCode: string | null;
  readonly lastRejection: IPeerRejectedEnvelope | null;
  readonly error: string | null;
  readonly unsubscribeState: (() => void) | null;
  readonly unsubscribeRejection: (() => void) | null;
}

interface LobbyStoreActions {
  readonly bindChannel: (
    channel: ILobbyChannel,
    options: { readonly localPeerId: string; readonly roomCode?: string },
  ) => void;
  readonly unbindChannel: () => void;
  readonly initializeHost: () => ILobbyState | null;
  readonly joinAsGuest: () => ILobbyChannelResult | null;
  readonly updateLocalLoadout: (
    loadout: ILoadout,
  ) => ILobbyChannelResult | null;
  readonly updateMapConfig: (config: IMapConfig) => ILobbyChannelResult | null;
  readonly setLocalReady: (ready: boolean) => ILobbyChannelResult | null;
  readonly setHostSide: (hostSide: LobbyHostSide) => ILobbyChannelResult | null;
  readonly launch: (matchId?: string) => ILobbyChannelResult | null;
  /**
   * Per `add-game-session-invite-and-lobby-1v1` § 9.1-9.3: forward a
   * peer disconnect event to the channel so it can reset readiness,
   * vacate the guest slot, or close the lobby (host gone). Returns
   * `null` if no channel is bound.
   */
  readonly handlePeerDisconnect: (peerId: string) => ILobbyChannelResult | null;
  readonly clearLobbyError: () => void;
  readonly resetLobby: () => void;
}

type LobbyStore = LobbyStoreState & LobbyStoreActions;

const initialState: LobbyStoreState = {
  channel: null,
  lobbyState: null,
  localPeerId: null,
  roomCode: null,
  lastRejection: null,
  error: null,
  unsubscribeState: null,
  unsubscribeRejection: null,
};

export const useLobbyStore = create<LobbyStore>((set, get) => ({
  ...initialState,

  bindChannel: (channel, options) => {
    get().unbindChannel();

    const unsubscribeState = channel.onStateChange((state) => {
      set({ lobbyState: state });
    });
    const unsubscribeRejection = channel.onPeerRejection((envelope) => {
      set({
        lastRejection: envelope,
        error: formatLobbyRejection(envelope.reason),
      });
    });

    set({
      channel,
      localPeerId: options.localPeerId,
      roomCode: options.roomCode ?? null,
      lobbyState: channel.getState(),
      lastRejection: null,
      error: null,
      unsubscribeState,
      unsubscribeRejection,
    });
  },

  unbindChannel: () => {
    get().unsubscribeState?.();
    get().unsubscribeRejection?.();
    set(initialState);
  },

  initializeHost: () => {
    const { channel, localPeerId } = get();
    if (!channel || !localPeerId) return null;
    const state = channel.initializeHost(localPeerId);
    set({ lobbyState: state, error: null });
    return state;
  },

  joinAsGuest: () => {
    const { channel, localPeerId } = get();
    if (!channel || !localPeerId) return null;
    const result = channel.joinGuest(localPeerId);
    applyChannelResult(result, set);
    return result;
  },

  updateLocalLoadout: (loadout) => {
    const state = get();
    const side = getLocalSide(state.lobbyState, state.localPeerId);
    if (!state.channel || !side) return null;
    const result = state.channel.updateLoadout(side, loadout);
    applyChannelResult(result, set);
    return result;
  },

  updateMapConfig: (config) => {
    const { channel } = get();
    if (!channel) return null;
    const result = channel.updateMapConfig(config);
    applyChannelResult(result, set);
    return result;
  },

  setLocalReady: (ready) => {
    const { channel, localPeerId } = get();
    if (!channel || !localPeerId) return null;
    const result = channel.setReady(localPeerId, ready);
    applyChannelResult(result, set);
    return result;
  },

  setHostSide: (hostSide) => {
    const { channel } = get();
    if (!channel) return null;
    const result = channel.setHostSide(hostSide);
    applyChannelResult(result, set);
    return result;
  },

  launch: (matchId) => {
    const { channel } = get();
    if (!channel) return null;
    const result = channel.launch(matchId);
    applyChannelResult(result, set);
    return result;
  },

  handlePeerDisconnect: (peerId) => {
    const { channel } = get();
    if (!channel) return null;
    const result = channel.handlePeerDisconnect(peerId);
    // Don't surface "ok" rejections via applyChannelResult — a
    // disconnect cleanup is housekeeping, not a user-actionable error.
    if (!result.ok) {
      applyChannelResult(result, set);
    } else {
      set({ lobbyState: result.state });
    }
    return result;
  },

  clearLobbyError: () => {
    set({ error: null, lastRejection: null });
  },

  resetLobby: () => {
    get().unbindChannel();
  },
}));

export function useLobbySelector<T>(selector: (state: LobbyStore) => T): T {
  return useLobbyStore(selector);
}

function getLocalSide(
  state: ILobbyState | null,
  localPeerId: string | null,
): LobbySide | null {
  if (!state || !localPeerId) return null;
  if (state.hostPeerId === localPeerId) return 'host';
  if (state.guestPeerId === localPeerId) return 'guest';
  return null;
}

function applyChannelResult(
  result: ILobbyChannelResult,
  set: (partial: Partial<LobbyStoreState>) => void,
): void {
  set({
    lobbyState: result.state,
    error: result.ok
      ? null
      : formatLobbyRejection(result.reason ?? 'invalid-state'),
  });
}

const lobbyRejectionMessages: Partial<Record<LobbyRejectionReason, string>> = {
  'unauthorized-slot': "You can only edit your own side's lobby slot",
  'host-only': 'Only the host can change that lobby setting',
  'lobby-full': 'This 1v1 lobby already has two players',
  'invalid-loadout': 'Pick valid matching loadouts before marking ready',
  'match-started': 'This lobby has already launched',
  'not-ready': 'Both players must be ready with valid loadouts before launch',
  'unknown-peer': 'This peer is not assigned to the lobby',
};

function formatLobbyRejection(reason: LobbyRejectionReason | string): string {
  return (
    lobbyRejectionMessages[reason as LobbyRejectionReason] ??
    'Lobby update was rejected'
  );
}
