import Head from 'next/head';
import { useRouter } from 'next/router';
import { useMemo } from 'react';

import { GameplayLobbyPanel } from '@/components/gameplay/lobby';
import { useToast } from '@/components/shared/Toast';
import { normalizeRoomCode, useSyncRoomSelector } from '@/lib/p2p';
import {
  launchLobbyMatch,
  LobbyShell,
  useAwarenessDisconnectPolling,
  useBindLobbyChannel,
  useClosedLobbyNavigation,
  useEnsureActiveRoom,
  useJoinLobbyGuest,
  useLaunchedMatchNavigation,
  useLobbyUnitOptions,
} from '@/pages-modules/gameplay/lobby/gameplayLobbyPage.helpers';
import { useGameplayStore } from '@/stores/useGameplayStore';
import { useLobbySelector } from '@/stores/useLobbyStore';
import { usePilotSelector } from '@/stores/usePilotStore';

export default function GameplayLobbyPage(): React.ReactElement {
  const router = useRouter();
  const routeRoomCode =
    typeof router.query.roomCode === 'string'
      ? normalizeRoomCode(router.query.roomCode)
      : null;
  const isHostRoute = router.query.host === '1';
  const { showToast } = useToast();

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
  const handlePeerDisconnect = useLobbySelector(
    (state) => state.handlePeerDisconnect,
  );
  const setSession = useGameplayStore((state) => state.setSession);

  const pilots = usePilotSelector((state) => state.pilots);
  const loadPilots = usePilotSelector((state) => state.loadPilots);
  const { unitOptions, loadError } = useLobbyUnitOptions({ loadPilots });

  useEnsureActiveRoom({
    activeRoom,
    createRoom,
    isHostRoute,
    joinRoom,
    routeRoomCode,
  });
  useBindLobbyChannel({
    activeRoom,
    bindChannel,
    isHostRoute,
    localPeerId,
    routeRoomCode,
    unbindChannel,
  });
  useJoinLobbyGuest({
    isHostRoute,
    joinAsGuest,
    lobbyState,
    localPeerId,
  });
  useAwarenessDisconnectPolling({
    activeRoom,
    handlePeerDisconnect,
    lobbyState,
    routeRoomCode,
  });
  useClosedLobbyNavigation({
    lobbyState,
    localPeerId,
    router,
    showToast,
  });
  useLaunchedMatchNavigation({
    lobbyState,
    router,
    setSession,
  });

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
        onLoadoutChange={updateLocalLoadout}
        onMapConfigChange={updateMapConfig}
        onReadyChange={setLocalReady}
        onHostSideChange={setHostSide}
        onLaunch={() => {
          launchLobbyMatch({
            launch,
            lobbyState,
            routeRoomCode,
            setSession,
          });
        }}
      />
    </>
  );
}
