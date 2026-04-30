import { useMemo, useState } from 'react';

import type {
  ILobbyState,
  ILoadout,
  IMapConfig,
  ISelectedPilot,
  ISelectedUnit,
  LobbySide,
} from '@/types/gameplay/GameLobbyInterfaces';
import type { IPilot } from '@/types/pilot';

import {
  canLaunchLobby,
  getLobbyReadyBlockReason,
  getLobbySideForPeer,
  getLoadoutForSide,
  getReadyForSide,
} from '@/types/gameplay/GameLobbyInterfaces';

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
}: GameplayLobbyPanelProps): React.ReactElement {
  const [copied, setCopied] = useState(false);
  const localSide = getLobbySideForPeer(lobbyState, localPeerId);
  const isHost = localSide === 'host';
  const localReady = localSide ? getReadyForSide(lobbyState, localSide) : false;
  const readyBlockReason = localSide
    ? getLobbyReadyBlockReason(lobbyState, localSide)
    : 'This peer is not assigned to the lobby';
  const launchReady = canLaunchLobby(lobbyState);

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

interface LoadoutCardProps {
  readonly side: LobbySide;
  readonly title: string;
  readonly loadout: ILoadout;
  readonly ready: boolean;
  readonly editable: boolean;
  readonly availableUnits: readonly ISelectedUnit[];
  readonly pilots: readonly IPilot[];
  readonly assignedPilotIds: ReadonlySet<string>;
  readonly onChange: (loadout: ILoadout) => void;
}

function LoadoutCard({
  side,
  title,
  loadout,
  ready,
  editable,
  availableUnits,
  pilots,
  assignedPilotIds,
  onChange,
}: LoadoutCardProps): React.ReactElement {
  const selectedUnitIds = new Set(loadout.units.map((unit) => unit.unitId));
  const remainingUnits = availableUnits.filter(
    (unit) => !selectedUnitIds.has(unit.unitId),
  );
  const canAdd = editable && loadout.units.length < 4;

  return (
    <section
      aria-label={`${title} loadout`}
      className="rounded-lg border border-slate-800 bg-slate-950 p-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
        <ReadyBadge ready={ready} />
      </div>

      {loadout.units.length === 0 ? (
        <p className="mt-4 rounded-md border border-slate-800 bg-slate-900 p-3 text-sm text-slate-400">
          No mechs selected
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {loadout.units.map((unit) => {
            const selectedPilotId =
              loadout.pilots.find((pilot) => pilot.unitId === unit.unitId)
                ?.pilotId ?? '';
            return (
              <li
                key={unit.unitId}
                className="rounded-md border border-slate-800 bg-slate-900 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-100">
                      {unit.designation}
                    </p>
                    <p className="text-xs text-slate-400">
                      {unit.tonnage}T / {unit.bv.toLocaleString()} BV
                    </p>
                  </div>
                  {editable && (
                    <button
                      type="button"
                      onClick={() => removeUnit(loadout, unit.unitId, onChange)}
                      className="rounded border border-rose-800 px-2 py-1 text-xs text-rose-200 hover:bg-rose-950"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <label className="mt-3 block text-sm">
                  <span className="text-slate-300">Pilot</span>
                  <select
                    aria-label={`${title} pilot for ${unit.designation}`}
                    value={selectedPilotId}
                    disabled={!editable}
                    onChange={(event) =>
                      assignPilot(
                        loadout,
                        unit.unitId,
                        pilots,
                        event.target.value,
                        onChange,
                      )
                    }
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 disabled:opacity-60"
                  >
                    <option value="">No pilot</option>
                    {pilots.map((pilot) => {
                      const label =
                        pilot.callsign ?? pilot.name ?? `Pilot ${pilot.id}`;
                      const assignedElsewhere =
                        assignedPilotIds.has(pilot.id) &&
                        pilot.id !== selectedPilotId;
                      return (
                        <option key={pilot.id} value={pilot.id}>
                          {label} G{pilot.skills.gunnery}/P
                          {pilot.skills.piloting}
                          {assignedElsewhere ? ' (move)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      <label className="mt-4 block text-sm">
        <span className="text-slate-300">Add mech</span>
        <select
          aria-label={`Add unit to ${title} loadout`}
          disabled={!canAdd}
          value=""
          onChange={(event) => {
            const unit = availableUnits.find(
              (candidate) => candidate.unitId === event.target.value,
            );
            if (unit) {
              onChange({
                ...loadout,
                units: [...loadout.units, unit],
              });
            }
          }}
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 disabled:opacity-60"
        >
          <option value="">
            {editable ? 'Choose a mech' : 'Remote loadout is read only'}
          </option>
          {remainingUnits.map((unit) => (
            <option key={unit.unitId} value={unit.unitId}>
              {unit.designation} ({unit.tonnage}T)
            </option>
          ))}
        </select>
      </label>

      <p className="mt-3 text-xs text-slate-500">
        {side === 'host' ? 'Player side' : 'Opponent side'}
      </p>
    </section>
  );
}

function ReadyBadge({
  ready,
}: {
  readonly ready: boolean;
}): React.ReactElement {
  return (
    <span
      className={`rounded px-2 py-1 text-xs font-medium ${
        ready
          ? 'bg-emerald-800 text-emerald-100'
          : 'bg-slate-800 text-slate-300'
      }`}
    >
      {ready ? 'Ready' : 'Not ready'}
    </span>
  );
}

function removeUnit(
  loadout: ILoadout,
  unitId: string,
  onChange: (loadout: ILoadout) => void,
): void {
  onChange({
    units: loadout.units.filter((unit) => unit.unitId !== unitId),
    pilots: loadout.pilots.filter((pilot) => pilot.unitId !== unitId),
  });
}

function assignPilot(
  loadout: ILoadout,
  unitId: string,
  pilots: readonly IPilot[],
  pilotId: string,
  onChange: (loadout: ILoadout) => void,
): void {
  const otherPilots = loadout.pilots.filter((pilot) => {
    return pilot.unitId !== unitId && pilot.pilotId !== pilotId;
  });

  if (!pilotId) {
    onChange({ ...loadout, pilots: otherPilots });
    return;
  }

  const pilot = pilots.find((candidate) => candidate.id === pilotId);
  if (!pilot) return;

  const selectedPilot: ISelectedPilot = {
    pilotId: pilot.id,
    unitId,
    callsign: pilot.callsign ?? pilot.name,
    gunnery: pilot.skills.gunnery,
    piloting: pilot.skills.piloting,
  };

  onChange({
    ...loadout,
    pilots: [...otherPilots, selectedPilot],
  });
}
