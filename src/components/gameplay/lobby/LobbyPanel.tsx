import { useMemo, useState } from 'react';

import type {
  ILobbyState,
  ILoadout,
  IMapConfig,
  ISelectedUnit,
  LobbyHostSide,
} from '@/types/gameplay/GameLobbyInterfaces';
import type { IPilot } from '@/types/pilot';

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
  const [copied, setCopied] = useState(false);
  const localSide = getLobbySideForPeer(lobbyState, localPeerId);
  const isHost = localSide === 'host';
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
    <div className="mx-auto max-w-6xl px-4 py-8 text-slate-100">
      <header className="mb-6 flex flex-col gap-4 border-b border-slate-800 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-cyan-300">
            Networked 1v1 Lobby
          </p>
          <h1 className="mt-1 text-3xl font-semibold">Room {roomCode}</h1>
          <p className="mt-2 text-sm text-slate-400">
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
          editable={localSide === 'host'}
          availableUnits={availableUnits}
          pilots={pilots}
          assignedPilotIds={assignedPilotIds}
          onChange={onLoadoutChange}
        />

        <section className="rounded-lg border border-slate-800 bg-slate-950 p-4">
          <h2 className="text-lg font-semibold text-slate-100">Map</h2>
          <div className="mt-4 space-y-3">
            <label className="block text-sm">
              <span className="text-slate-300">Radius</span>
              <input
                aria-label="Map radius"
                type="number"
                min={4}
                max={30}
                value={lobbyState.mapConfig.radius}
                disabled={!isHost}
                onChange={(event) =>
                  onMapConfigChange({
                    ...lobbyState.mapConfig,
                    radius: Number(event.target.value),
                  })
                }
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 disabled:opacity-60"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-300">Terrain</span>
              <select
                aria-label="Terrain preset"
                value={lobbyState.mapConfig.terrainPreset}
                disabled={!isHost}
                onChange={(event) =>
                  onMapConfigChange({
                    ...lobbyState.mapConfig,
                    terrainPreset: event.target.value,
                  })
                }
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 disabled:opacity-60"
              >
                <option value="clear">Clear</option>
                <option value="rolling">Rolling Hills</option>
                <option value="woods">Light Woods</option>
                <option value="urban">Urban</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-slate-300">Turn limit</span>
              <input
                aria-label="Turn limit"
                type="number"
                min={0}
                max={200}
                value={lobbyState.mapConfig.turnLimit}
                disabled={!isHost}
                onChange={(event) =>
                  onMapConfigChange({
                    ...lobbyState.mapConfig,
                    turnLimit: Number(event.target.value),
                  })
                }
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 disabled:opacity-60"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-300">Host plays as</span>
              <select
                aria-label="Host side"
                value={hostSide}
                disabled={!isHost || !onHostSideChange}
                onChange={(event) =>
                  onHostSideChange?.(
                    event.target.value === 'opponent' ? 'opponent' : 'player',
                  )
                }
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 disabled:opacity-60"
              >
                <option value="player">Player (blue)</option>
                <option value="opponent">Opponent (red)</option>
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Guest will play as{' '}
                {hostSide === 'player' ? 'Opponent (red)' : 'Player (blue)'}.
              </p>
            </label>
          </div>

          <div className="mt-5 rounded-md border border-slate-800 bg-slate-900 p-3">
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

          {localSide && (
            <button
              type="button"
              disabled={readyBlockReason !== null}
              onClick={() => onReadyChange(!localReady)}
              className="mt-4 w-full rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-700"
            >
              {localReady ? 'Not Ready' : 'Ready'}
            </button>
          )}

          {isHost && (
            <button
              type="button"
              disabled={!launchReady}
              onClick={onLaunch}
              className="mt-2 w-full rounded-md bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-slate-700"
            >
              Launch Match
            </button>
          )}

          {!isHost && launchReady && (
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
          editable={localSide === 'guest'}
          availableUnits={availableUnits}
          pilots={pilots}
          assignedPilotIds={assignedPilotIds}
          onChange={onLoadoutChange}
        />
      </div>
    </div>
  );
}
