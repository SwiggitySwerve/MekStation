import type { NextRouter } from 'next/router';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import type {
  ILobbyChannel,
  ILobbyChannelResult,
} from '@/lib/p2p/lobbyChannel';
import type { ISyncRoomActions } from '@/lib/p2p/types';
import type { ISyncRoom } from '@/lib/p2p/types';
import type { IUnitIndexEntry } from '@/services/common/types';
import type {
  ILobbyState,
  ISelectedUnit,
} from '@/types/gameplay/GameLobbyInterfaces';
import type { IGameSession } from '@/types/gameplay/GameSessionInterfaces';
import type { ICustomUnitIndexEntry } from '@/types/persistence/UnitPersistence';

import {
  createLobbyChannel,
  getGameSessionAwarenessStates,
  joinLocalPeerAsGuest,
  matchLogStorage,
  promoteLocalPeerToHost,
} from '@/lib/p2p';
import { getCanonicalUnitService } from '@/services/units/CanonicalUnitService';
import { customUnitApiService } from '@/services/units/CustomUnitApiService';
import { buildGameSessionFromLobbyState } from '@/utils/gameplay/gameSession';

type Toast = (options: {
  readonly message: string;
  readonly variant: 'warning';
}) => void;

export function LobbyShell({
  children,
}: {
  readonly children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 text-slate-100">
      <Link href="/gameplay/games" className="text-sm text-slate-400">
        Back to games
      </Link>
      <p className="mt-6 rounded-lg border border-slate-800 bg-slate-950 p-4">
        {children}
      </p>
    </div>
  );
}

export function useLobbyUnitOptions({
  loadPilots,
}: {
  readonly loadPilots: () => Promise<void>;
}): {
  readonly unitOptions: readonly ISelectedUnit[];
  readonly loadError: string | null;
} {
  const [unitOptions, setUnitOptions] = useState<readonly ISelectedUnit[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    void loadPilots();
  }, [loadPilots]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [canonical, custom] = await Promise.all([
          getCanonicalUnitService().getIndex(),
          customUnitApiService.list().catch(() => []),
        ]);
        if (cancelled) return;
        setUnitOptions([
          ...canonical.map(unitIndexToLobbyUnit),
          ...custom.map(customUnitToLobbyUnit),
        ]);
        setLoadError(null);
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : 'Failed to load units',
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { unitOptions, loadError };
}

export function useEnsureActiveRoom({
  activeRoom,
  createRoom,
  isHostRoute,
  joinRoom,
  routeRoomCode,
}: {
  readonly activeRoom: ISyncRoom | null;
  readonly createRoom: ISyncRoomActions['createRoom'];
  readonly isHostRoute: boolean;
  readonly joinRoom: ISyncRoomActions['joinRoom'];
  readonly routeRoomCode: string | null;
}): void {
  useEffect(() => {
    if (!routeRoomCode) return;
    if (activeRoom?.roomCode === routeRoomCode) return;

    void (async () => {
      if (isHostRoute) {
        await createRoom({ roomCode: routeRoomCode });
      } else {
        await joinRoom(routeRoomCode);
      }
    })();
  }, [activeRoom?.roomCode, createRoom, isHostRoute, joinRoom, routeRoomCode]);
}

export function useBindLobbyChannel({
  activeRoom,
  bindChannel,
  isHostRoute,
  localPeerId,
  routeRoomCode,
  unbindChannel,
}: {
  readonly activeRoom: ISyncRoom | null;
  readonly bindChannel: (
    channel: ILobbyChannel,
    options: { readonly localPeerId: string; readonly roomCode?: string },
  ) => void;
  readonly isHostRoute: boolean;
  readonly localPeerId: string | null;
  readonly routeRoomCode: string | null;
  readonly unbindChannel: () => void;
}): void {
  useEffect(() => {
    if (!activeRoom || !localPeerId || !routeRoomCode) return;
    if (activeRoom.roomCode !== routeRoomCode) return;

    const channel = createLobbyChannel({ localPeerId });
    bindChannel(channel, { localPeerId, roomCode: routeRoomCode });

    if (isHostRoute && !channel.getState()) {
      promoteLocalPeerToHost({ localPeerId });
      channel.initializeHost(localPeerId);
    }

    return () => {
      unbindChannel();
    };
  }, [
    activeRoom,
    bindChannel,
    isHostRoute,
    localPeerId,
    routeRoomCode,
    unbindChannel,
  ]);
}

export function useJoinLobbyGuest({
  isHostRoute,
  joinAsGuest,
  lobbyState,
  localPeerId,
}: {
  readonly isHostRoute: boolean;
  readonly joinAsGuest: () => ILobbyChannelResult | null;
  readonly lobbyState: ILobbyState | null;
  readonly localPeerId: string | null;
}): void {
  useEffect(() => {
    if (!lobbyState || !localPeerId || isHostRoute) return;
    if (lobbyState.hostPeerId === localPeerId) return;
    if (lobbyState.guestPeerId === localPeerId) return;
    try {
      joinLocalPeerAsGuest({ localPeerId });
    } catch {
      // Awareness can race during reconnects; channel assignment still runs.
    }
    joinAsGuest();
  }, [isHostRoute, joinAsGuest, lobbyState, localPeerId]);
}

export function useAwarenessDisconnectPolling({
  activeRoom,
  handlePeerDisconnect,
  lobbyState,
  routeRoomCode,
}: {
  readonly activeRoom: ISyncRoom | null;
  readonly handlePeerDisconnect: (peerId: string) => ILobbyChannelResult | null;
  readonly lobbyState: ILobbyState | null;
  readonly routeRoomCode: string | null;
}): void {
  const previousAwarenessPeerIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!activeRoom || !routeRoomCode || lobbyState?.matchId) {
      previousAwarenessPeerIds.current = new Set();
      return;
    }

    const sample = (): void => {
      const states = getGameSessionAwarenessStates(
        activeRoom.webrtcProvider.awareness,
      );
      const currentIds = new Set(states.map((peer) => peer.peerId));
      previousAwarenessPeerIds.current.forEach((peerId) => {
        if (!currentIds.has(peerId)) {
          handlePeerDisconnect(peerId);
        }
      });
      previousAwarenessPeerIds.current = currentIds;
    };

    sample();
    const interval = setInterval(sample, 1000);
    return () => clearInterval(interval);
  }, [activeRoom, handlePeerDisconnect, lobbyState?.matchId, routeRoomCode]);
}

export function useClosedLobbyNavigation({
  lobbyState,
  localPeerId,
  router,
  showToast,
}: {
  readonly lobbyState: ILobbyState | null;
  readonly localPeerId: string | null;
  readonly router: NextRouter;
  readonly showToast: Toast;
}): void {
  const closedNavigated = useRef(false);

  useEffect(() => {
    if (!lobbyState?.closed) {
      closedNavigated.current = false;
      return;
    }
    if (closedNavigated.current) return;
    if (lobbyState.hostPeerId === localPeerId) return;
    closedNavigated.current = true;
    showToast({
      message: 'Host left the lobby',
      variant: 'warning',
    });
    void router.push('/gameplay/games');
  }, [
    lobbyState?.closed,
    lobbyState?.hostPeerId,
    localPeerId,
    router,
    showToast,
  ]);
}

export function useLaunchedMatchNavigation({
  lobbyState,
  router,
  setSession,
}: {
  readonly lobbyState: ILobbyState | null;
  readonly router: NextRouter;
  readonly setSession: (session: IGameSession) => void;
}): void {
  useEffect(() => {
    if (!lobbyState?.matchId) return;
    void matchLogStorage
      .upsertMatchMetadata({
        matchId: lobbyState.matchId,
        hostPeerId: lobbyState.hostPeerId,
        guestPeerId: lobbyState.guestPeerId,
        status: 'active',
      })
      .catch(() => undefined);
    try {
      setSession(
        buildGameSessionFromLobbyState(lobbyState, lobbyState.matchId),
      );
    } catch {
      // Routing still lands both peers together when local adaptation fails.
    }
    void router.push(
      `/gameplay/games/${encodeURIComponent(lobbyState.matchId)}`,
    );
  }, [lobbyState, router, setSession]);
}

export function launchLobbyMatch({
  launch,
  lobbyState,
  routeRoomCode,
  setSession,
}: {
  readonly launch: (matchId?: string) => ILobbyChannelResult | null;
  readonly lobbyState: ILobbyState;
  readonly routeRoomCode: string;
  readonly setSession: (session: IGameSession) => void;
}): void {
  const matchId = lobbyState.matchId ?? `p2p-${routeRoomCode.toLowerCase()}`;
  const result = launch(matchId);
  if (result?.ok && result.state) {
    setSession(buildGameSessionFromLobbyState(result.state, matchId));
  }
}

function unitIndexToLobbyUnit(unit: IUnitIndexEntry): ISelectedUnit {
  return {
    unitId: unit.id,
    designation: `${unit.chassis} ${unit.variant}`.trim(),
    tonnage: unit.tonnage,
    bv: unit.bv ?? 0,
    source: 'canonical',
  };
}

function customUnitToLobbyUnit(unit: ICustomUnitIndexEntry): ISelectedUnit {
  return {
    unitId: unit.id,
    designation: `${unit.chassis} ${unit.variant}`.trim(),
    tonnage: unit.tonnage,
    bv: 0,
    source: 'custom',
  };
}
