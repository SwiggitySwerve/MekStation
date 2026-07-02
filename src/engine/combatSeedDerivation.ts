/**
 * Combat-seed derivation for session producers that build bare `IGameUnit`
 * lists (catalog `unitRef` + pilot skills only) instead of holding adapted
 * units the way the `InteractiveSession` constructor does.
 *
 * Per `extend-combat-seed-to-all-session-producers` (game-session-management
 * "Combat State Seeding at Session Creation"): every production session
 * producer SHALL supply per-location armor/structure/heat-sink construction
 * inputs on the units it passes to `createGameSession`. PR #998 wired the
 * splice into `InteractiveSession` and `GameEngine.runToCompletion` only;
 * the encounter-launch, lobby, and pre-battle builders bypassed it and kept
 * producing 0-armor sessions.
 *
 * Lives in the engine (not `utils/gameplay`) because the derivation needs
 * the catalog adapter, and `utils/gameplay` importing the engine would
 * create an import cycle — the engine already imports `utils/gameplay`
 * heavily. Producers outside `utils/gameplay` (services, pages-modules,
 * hooks) import from here directly; `utils/gameplay` builders stay pure and
 * are seeded by their callers through these wrappers.
 */

import type { ILobbyState } from '@/types/gameplay/GameLobbyInterfaces';
import type {
  IGameSession,
  IGameUnit,
} from '@/types/gameplay/GameSessionInterfaces';

import { GameSide } from '@/types/gameplay/GameSessionInterfaces';
import {
  buildLobbyGameData,
  createGameSession,
  startGame,
} from '@/utils/gameplay/gameSession';

import type { IAdaptedUnit } from './types';

import { adaptUnit } from './adapters/CompendiumAdapter';
import { gameUnitsWithAdaptedCombatSeeds } from './InteractiveSession.setup';

/**
 * Adapt each unit's `unitRef` against the canonical catalog and splice the
 * resulting armor/structure/heat-sink seeds onto the game units. Adapted
 * units are re-keyed to the GAME unit id (the adapter returns catalog ids;
 * the splice matches by `unit.id`). Units whose `unitRef` is not in the
 * catalog are left unseeded with a console warning — a partially seeded
 * session beats a hard launch failure, matching the recovery path's
 * missing-unit policy.
 */
export async function deriveCombatSeededGameUnits(
  units: readonly IGameUnit[],
): Promise<readonly IGameUnit[]> {
  const adapted: IAdaptedUnit[] = [];
  for (const gameUnit of units) {
    const adaptedUnit = await adaptUnit(gameUnit.unitRef, {
      side: gameUnit.side,
    });
    if (adaptedUnit === null) {
      // eslint-disable-next-line no-console
      console.warn(
        `[deriveCombatSeededGameUnits] unit '${gameUnit.id}' ` +
          `(unitRef '${gameUnit.unitRef}') not found in the canonical ` +
          `catalog - launching without combat seeds for this unit.`,
      );
      continue;
    }
    adapted.push({ ...adaptedUnit, id: gameUnit.id });
  }
  return gameUnitsWithAdaptedCombatSeeds(units, adapted, []);
}

/**
 * Seeded replacement for `buildGameSessionFromLobbyState`: same lobby
 * validation and side/owner mapping (via the pure `buildLobbyGameData`),
 * but the units are combat-seeded before the session is created — the
 * lobby path's session is set straight into the gameplay store and played
 * over P2P, so it was the LIVE 0-armor producer.
 */
export async function buildSeededGameSessionFromLobbyState(
  lobby: ILobbyState,
  matchId: string,
): Promise<IGameSession> {
  const { config, units, options } = buildLobbyGameData(lobby, matchId);
  const seededUnits = await deriveCombatSeededGameUnits(units);
  const session = createGameSession(config, seededUnits, options);
  return startGame(session, GameSide.Player);
}
