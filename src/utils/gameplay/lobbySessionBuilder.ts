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

  const hostUnits = toGameUnits(
    getLoadoutForSide(lobby, 'host'),
    'host',
    GameSide.Player,
  );
  const guestUnits = toGameUnits(
    getLoadoutForSide(lobby, 'guest'),
    'guest',
    GameSide.Opponent,
  );

  const config: IGameConfig = {
    mapRadius: lobby.mapConfig.radius,
    turnLimit: lobby.mapConfig.turnLimit,
    victoryConditions: ['destroy_all'],
    optionalRules: [`terrain:${lobby.mapConfig.terrainPreset}`],
  };

  const session = createGameSession(config, [...hostUnits, ...guestUnits], {
    id: matchId,
    hostPeerId: lobby.hostPeerId,
    guestPeerId: lobby.guestPeerId,
    sideOwners: {
      [GameSide.Player]: lobby.hostPeerId,
      [GameSide.Opponent]: lobby.guestPeerId,
    },
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
