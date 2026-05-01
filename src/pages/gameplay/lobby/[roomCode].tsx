import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';

import type { IUnitIndexEntry } from '@/services/common/types';
import type { ISelectedUnit } from '@/types/gameplay/GameLobbyInterfaces';
import type { ICustomUnitIndexEntry } from '@/types/persistence/UnitPersistence';

import { GameplayLobbyPanel } from '@/components/gameplay/lobby';
import {
  createLobbyChannel,
  joinLocalPeerAsGuest,
  matchLogStorage,
  normalizeRoomCode,
  promoteLocalPeerToHost,
  useSyncRoomSelector,
} from '@/lib/p2p';
import { canonicalUnitService } from '@/services/units/CanonicalUnitService';
import { customUnitApiService } from '@/services/units/CustomUnitApiService';
import { useGameplayStore } from '@/stores/useGameplayStore';
import { useLobbySelector } from '@/stores/useLobbyStore';
import { usePilotSelector } from '@/stores/usePilotStore';
import { buildGameSessionFromLobbyState } from '@/utils/gameplay/gameSession';

export default function GameplayLobbyPage(): React.ReactElement {
  const router = useRouter();
  const routeRoomCode =
    typeof router.query.roomCode === 'string'
      ? normalizeRoomCode(router.query.roomCode)
      : null;
  const isHostRoute = router.query.host === '1';

  const activeRoom = useSyncRoomSelector((state) => state.activeRoom);
  const localPeerId = useSyncRoomSelector((state) => state.localPeerId);
  const createRoom = useSyncRoomSelector((state) => state.createRoom);
  const joinRoom = useSyncRoomSelector((state) => state.joinRoom);
  const syncError = useSyncRoomSelector((state) => state.error);

  const lobbyState = useLobbySelector((state) => state.lobbyState);
  const lobbyError = useLobbySelector((state) => state.error);
  const bindChannel = useLobbySelector((state) => state.bindChannel);
  const unbindChannel = useLobbySelector((state) => state.unbindChannel);
  const joinAsGuest = useLobbySelector((state) => state.joinAsGuest);
  const updateLocalLoadout = useLobbySelector(
    (state) => state.updateLocalLoadout,
  );
  const updateMapConfig = useLobbySelector((state) => state.updateMapConfig);
  const setLocalReady = useLobbySelector((state) => state.setLocalReady);
  const setHostSide = useLobbySelector((state) => state.setHostSide);
  const launch = useLobbySelector((state) => state.launch);
  const setSession = useGameplayStore((state) => state.setSession);

  const pilots = usePilotSelector((state) => state.pilots);
  const loadPilots = usePilotSelector((state) => state.loadPilots);
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
          canonicalUnitService.getIndex(),
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

  useEffect(() => {
    if (!lobbyState || !localPeerId || isHostRoute) return;
    if (lobbyState.hostPeerId === localPeerId) return;
    if (lobbyState.guestPeerId === localPeerId) return;
    try {
      joinLocalPeerAsGuest({ localPeerId });
    } catch {
      // The lobby channel still enforces capacity and ownership. Awareness can
      // race during tests or reconnects, so a failed role write should not
      // prevent the channel-side assignment attempt.
    }
    joinAsGuest();
  }, [isHostRoute, joinAsGuest, lobbyState, localPeerId]);

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
      const session = buildGameSessionFromLobbyState(
        lobbyState,
        lobbyState.matchId,
      );
      setSession(session);
    } catch {
      // If local catalog adaptation grows stricter later, the host remains the
      // source of truth for matchId. Routing still lands both peers together.
    }
    void router.push(
      `/gameplay/games/${encodeURIComponent(lobbyState.matchId)}`,
    );
  }, [lobbyState, router, setSession]);

  const pageError = useMemo(() => {
    return lobbyError ?? syncError ?? loadError;
  }, [loadError, lobbyError, syncError]);

  if (!routeRoomCode) {
    return <LobbyShell>Loading lobby...</LobbyShell>;
  }

  if (!localPeerId || !activeRoom || activeRoom.roomCode !== routeRoomCode) {
    return <LobbyShell>Connecting to room {routeRoomCode}...</LobbyShell>;
  }

  if (!lobbyState) {
    return (
      <LobbyShell>
        {isHostRoute
          ? 'Preparing host lobby...'
          : 'Waiting for host lobby state...'}
      </LobbyShell>
    );
  }

  return (
    <>
      <Head>
        <title>Lobby {routeRoomCode} | MekStation</title>
      </Head>
      <GameplayLobbyPanel
        roomCode={routeRoomCode}
        lobbyState={lobbyState}
        localPeerId={localPeerId}
        availableUnits={unitOptions}
        pilots={pilots}
        error={pageError}
        onLoadoutChange={(loadout) => {
          updateLocalLoadout(loadout);
        }}
        onMapConfigChange={(config) => {
          updateMapConfig(config);
        }}
        onReadyChange={(ready) => {
          setLocalReady(ready);
        }}
        onHostSideChange={(hostSide) => {
          setHostSide(hostSide);
        }}
        onLaunch={() => {
          const matchId =
            lobbyState.matchId ?? `p2p-${routeRoomCode.toLowerCase()}`;
          const result = launch(matchId);
          if (result?.ok && result.state) {
            const session = buildGameSessionFromLobbyState(
              result.state,
              matchId,
            );
            setSession(session);
          }
        }}
      />
    </>
  );
}

function LobbyShell({
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
