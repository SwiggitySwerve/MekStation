/**
 * Build a game session from peer-sourced lobby loadouts.
 *
 * @spec openspec/changes/add-game-session-invite-and-lobby-1v1/specs/game-session-management/spec.md
 */

import {
  GameSide,
  type IGameConfig,
  type IGameSession,
  type IGameUnit,
} from '@/types/gameplay';
import {
  canLaunchLobby,
  getLobbyHostSide,
  getLoadoutForSide,
  type ILobbyState,
  type ILoadout,
  type ISelectedPilot,
  type ISelectedUnit,
  type LobbySide,
} from '@/types/gameplay/GameLobbyInterfaces';

import { createGameSession, startGame } from './gameSessionCore';

export function buildGameSessionFromLobbyState(
  lobby: ILobbyState,
  matchId: string,
): IGameSession {
  if (!canLaunchLobby({ ...lobby, matchId })) {
    throw new Error('Lobby is not ready to launch');
  }
  if (!lobby.guestPeerId) {
    throw new Error('Guest peer is not assigned');
  }

  // Per `add-p2p-game-session-sync` § 6.2: host picks which game-side
  // they own. `'player'` (default) → host=Player, guest=Opponent;
  // `'opponent'` flips the mapping. The lobby-side → game-side
  // assignment must propagate into both `IGameUnit.side` AND the
  // `sideOwners` lookup so UI gating reads them consistently.
  const hostSide = getLobbyHostSide(lobby);
  const hostGameSide =
    hostSide === 'player' ? GameSide.Player : GameSide.Opponent;
  const guestGameSide =
    hostSide === 'player' ? GameSide.Opponent : GameSide.Player;

  const hostUnits = toGameUnits(
    getLoadoutForSide(lobby, 'host'),
    'host',
    hostGameSide,
  );
  const guestUnits = toGameUnits(
    getLoadoutForSide(lobby, 'guest'),
    'guest',
    guestGameSide,
  );

  const config: IGameConfig = {
    mapRadius: lobby.mapConfig.radius,
    turnLimit: lobby.mapConfig.turnLimit,
    victoryConditions: ['destroy_all'],
    optionalRules: [`terrain:${lobby.mapConfig.terrainPreset}`],
  };

  // TS can't infer "two computed enum-keyed assignments cover the full
  // GameSide record" — list both keys explicitly so the resulting shape
  // type-checks against Record<GameSide, string>.
  const sideOwners: Readonly<Record<GameSide, string>> = {
    [GameSide.Player]:
      hostGameSide === GameSide.Player ? lobby.hostPeerId : lobby.guestPeerId,
    [GameSide.Opponent]:
      hostGameSide === GameSide.Opponent ? lobby.hostPeerId : lobby.guestPeerId,
  };

  const session = createGameSession(config, [...hostUnits, ...guestUnits], {
    id: matchId,
    hostPeerId: lobby.hostPeerId,
    guestPeerId: lobby.guestPeerId,
    sideOwners,
  });

  return startGame(session, GameSide.Player);
}

function toGameUnits(
  loadout: ILoadout,
  lobbySide: LobbySide,
  gameSide: GameSide,
): IGameUnit[] {
  return loadout.units.map((unit, index) =>
    toGameUnit(
      unit,
      findPilot(loadout, unit, index),
      lobbySide,
      gameSide,
      index,
    ),
  );
}

function findPilot(
  loadout: ILoadout,
  unit: ISelectedUnit,
  index: number,
): ISelectedPilot {
  const pilot = loadout.pilots.find((candidate) => {
    return candidate.unitId === unit.unitId;
  });
  const fallback = loadout.pilots[index];
  if (!fallback) {
    throw new Error(`Pilot required for unit ${unit.designation}`);
  }
  return pilot ?? fallback;
}

function toGameUnit(
  unit: ISelectedUnit,
  pilot: ISelectedPilot,
  lobbySide: LobbySide,
  side: GameSide,
  index: number,
): IGameUnit {
  return {
    id: `${side}-${index}-${unit.unitId}`,
    name: unit.designation,
    side,
    unitRef: unit.unitId,
    pilotRef: pilot.pilotId,
    gunnery: pilot.gunnery,
    piloting: pilot.piloting,
  };
}
