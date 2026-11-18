import { useId, useMemo, useState } from 'react';

import type {
  ILobbyState,
  ILoadout,
  IMapConfig,
  ISelectedUnit,
  LobbyHostSide,
} from '@/types/gameplay/GameLobbyInterfaces';
import type { IPilot } from '@/types/pilot';

import { ModeAvailabilityNotice } from '@/components/multiplayer/ModeAvailabilityNotice';
import { isModeLaunchDisabled } from '@/lib/multiplayer/modeAvailability';
import {
  canLaunchLobby,
  getLobbyHostSide,
  getLobbyReadyBlockReason,
  getLobbySideForPeer,
  getReadyForSide,
} from '@/types/gameplay/GameLobbyInterfaces';

import { LoadoutCard, ReadyBadge } from './LobbyLoadoutCard';

export interface GameplayLobbyPanelProps {
  readonly roomCode: string;
  readonly lobbyState: ILobbyState;
  readonly localPeerId: string;
  readonly availableUnits: readonly ISelectedUnit[];
  readonly pilots: readonly IPilot[];
  readonly error?: string | null;
  readonly onLoadoutChange: (loadout: ILoadout) => void;
  readonly onMapConfigChange: (config: IMapConfig) => void;
  readonly onReadyChange: (ready: boolean) => void;
  readonly onLaunch: () => void;
  /**
   * Per `add-p2p-game-session-sync` § 6.2: host-only callback that
   * flips which game-side the host owns. Optional — when omitted, the
   * picker is read-only.
   */
  readonly onHostSideChange?: (hostSide: LobbyHostSide) => void;
}

export function GameplayLobbyPanel({
  roomCode,
  lobbyState,
  localPeerId,
  availableUnits,
  pilots,
  error,
  onLoadoutChange,
  onMapConfigChange,
  onReadyChange,
  onLaunch,
  onHostSideChange,
}: GameplayLobbyPanelProps): React.ReactElement {
  const reasonId = useId();
  const launchDisabled = isModeLaunchDisabled('p2p');
  const [copied, setCopied] = useState(false);
  const localSide = getLobbySideForPeer(lobbyState, localPeerId);
  const isHost = localSide === 'host';
  const closed = lobbyState.closed === true;
  const mapLocked = !isHost || closed;
  const localReady = localSide ? getReadyForSide(lobbyState, localSide) : false;
  const readyBlockReason = localSide
    ? getLobbyReadyBlockReason(lobbyState, localSide)
    : 'This peer is not assigned to the lobby';
  const launchReady = canLaunchLobby(lobbyState);
  const hostSide = getLobbyHostSide(lobbyState);

  const assignedPilotIds = useMemo(() => {
    const ids = new Set<string>();
    for (const pilot of [
      ...lobbyState.hostLoadout.pilots,
      ...lobbyState.guestLoadout.pilots,
    ]) {
      ids.add(pilot.pilotId);
    }
    return ids;
  }, [lobbyState.hostLoadout.pilots, lobbyState.guestLoadout.pilots]);

  const copyRoomCode = async (): Promise<void> => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="text-text-theme-primary mx-auto max-w-6xl px-4 py-8">
      <header className="border-border-theme-subtle mb-6 flex flex-col gap-4 border-b pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-cyan-300">
            Networked 1v1 Lobby <ModeAvailabilityNotice mode="p2p" compact />
          </p>
          <h1 className="mt-1 text-3xl font-semibold">Room {roomCode}</h1>
          <p className="text-text-theme-secondary mt-2 text-sm">
            {lobbyState.guestPeerId
              ? 'Opponent connected'
              : 'Waiting for opponent...'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void copyRoomCode();
          }}
          className="w-fit rounded-md border border-cyan-700 bg-cyan-950 px-4 py-2 font-mono text-sm text-cyan-100 hover:bg-cyan-900"
        >
          {copied ? 'Copied' : `Copy ${roomCode}`}
        </button>
      </header>

      {closed && (
        <div
          role="status"
          className="mb-4 rounded-md border border-amber-800 bg-amber-950 px-4 py-3 text-sm text-amber-100"
        >
          This lobby is closed
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-rose-800 bg-rose-950 px-4 py-3 text-sm text-rose-100"
        >
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px_1fr]">
        <LoadoutCard
          side="host"
          title="Host"
          loadout={lobbyState.hostLoadout}
          ready={lobbyState.hostReady}
          editable={localSide === 'host' && !closed}
          availableUnits={availableUnits}
          pilots={pilots}
          assignedPilotIds={assignedPilotIds}
          onChange={onLoadoutChange}
        />

        <section className="border-border-theme-subtle bg-surface-deep rounded-lg border p-4">
          <h2 className="text-text-theme-primary text-lg font-semibold">Map</h2>
          <div className="mt-4 space-y-3">
            <label className="block text-sm">
              <span className="text-text-theme-secondary">Radius</span>
              <input
                aria-label="Map radius"
                type="number"
                min={4}
                max={30}
                value={lobbyState.mapConfig.radius}
                disabled={mapLocked}
                onChange={(event) =>
                  onMapConfigChange({
                    ...lobbyState.mapConfig,
                    radius: Number(event.target.value),
                  })
                }
                className="border-border-theme bg-surface-deep text-text-theme-primary mt-1 w-full rounded-md border px-3 py-2 text-sm disabled:opacity-60"
              />
            </label>
            <label className="block text-sm">
              <span className="text-text-theme-secondary">Terrain</span>
              <select
                aria-label="Terrain preset"
                value={lobbyState.mapConfig.terrainPreset}
                disabled={mapLocked}
                onChange={(event) =>
                  onMapConfigChange({
                    ...lobbyState.mapConfig,
                    terrainPreset: event.target.value,
                  })
                }
                className="border-border-theme bg-surface-deep text-text-theme-primary mt-1 w-full rounded-md border px-3 py-2 text-sm disabled:opacity-60"
              >
                <option value="clear">Clear</option>
                <option value="rolling">Rolling Hills</option>
                <option value="woods">Light Woods</option>
                <option value="urban">Urban</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-text-theme-secondary">Turn limit</span>
              <input
                aria-label="Turn limit"
                type="number"
                min={0}
                max={200}
                value={lobbyState.mapConfig.turnLimit}
                disabled={mapLocked}
                onChange={(event) =>
                  onMapConfigChange({
                    ...lobbyState.mapConfig,
                    turnLimit: Number(event.target.value),
                  })
                }
                className="border-border-theme bg-surface-deep text-text-theme-primary mt-1 w-full rounded-md border px-3 py-2 text-sm disabled:opacity-60"
              />
            </label>
            <label className="block text-sm">
              <span className="text-text-theme-secondary">Host plays as</span>
              <select
                aria-label="Host side"
                value={hostSide}
                disabled={mapLocked || !onHostSideChange}
                onChange={(event) =>
                  onHostSideChange?.(
                    event.target.value === 'opponent' ? 'opponent' : 'player',
                  )
                }
                className="border-border-theme bg-surface-deep text-text-theme-primary mt-1 w-full rounded-md border px-3 py-2 text-sm disabled:opacity-60"
              >
                <option value="player">Player (blue)</option>
                <option value="opponent">Opponent (red)</option>
              </select>
              <p className="text-text-theme-muted mt-1 text-xs">
                Guest will play as{' '}
                {hostSide === 'player' ? 'Opponent (red)' : 'Player (blue)'}.
              </p>
            </label>
          </div>

          <div className="border-border-theme-subtle bg-surface-deep mt-5 rounded-md border p-3">
            <div className="flex items-center justify-between text-sm">
              <span>Host</span>
              <ReadyBadge ready={lobbyState.hostReady} />
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span>Guest</span>
              <ReadyBadge ready={lobbyState.guestReady} />
            </div>
          </div>

          {readyBlockReason && (
            <p className="mt-3 text-sm text-amber-300">{readyBlockReason}</p>
          )}

          <ModeAvailabilityNotice mode="p2p" sentenceId={reasonId} />

          {localSide && (
            <button
              type="button"
              disabled={readyBlockReason !== null || closed}
              onClick={() => onReadyChange(!localReady)}
              className="bg-accent text-on-accent hover:bg-accent-hover disabled:bg-surface-raised mt-4 w-full rounded-md px-4 py-2 text-sm font-medium disabled:cursor-not-allowed"
            >
              {localReady ? 'Not Ready' : 'Ready'}
            </button>
          )}

          {isHost && (
            <button
              type="button"
              disabled={!launchReady || launchDisabled}
              aria-describedby={launchDisabled ? reasonId : undefined}
              onClick={() => {
                if (!isModeLaunchDisabled('p2p')) onLaunch();
              }}
              className="bg-accent text-on-accent hover:bg-accent-hover disabled:bg-surface-raised disabled:text-text-theme-secondary mt-2 w-full rounded-md px-4 py-2 text-sm font-medium disabled:cursor-not-allowed"
            >
              Launch Match
            </button>
          )}

          {!isHost && launchReady && !launchDisabled && (
            <p className="mt-3 text-center text-sm text-cyan-200">
              Waiting for host to launch...
            </p>
          )}
        </section>

        <LoadoutCard
          side="guest"
          title="Guest"
          loadout={lobbyState.guestLoadout}
          ready={lobbyState.guestReady}
          editable={localSide === 'guest' && !closed}
          availableUnits={availableUnits}
          pilots={pilots}
          assignedPilotIds={assignedPilotIds}
          onChange={onLoadoutChange}
        />
      </div>
    </div>
  );
}
