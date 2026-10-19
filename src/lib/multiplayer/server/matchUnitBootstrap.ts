import type { ReadCustomCombatDefinition } from '@/engine/InteractiveSession.recovery';
import type { IAdaptedUnit } from '@/engine/types';
import type {
  IGameSession,
  IGameUnit,
} from '@/types/gameplay/GameSessionInterfaces';
import type { IHexCoordinate } from '@/types/gameplay/HexGridInterfaces';
import type { TeamLayout } from '@/types/multiplayer/Lobby';
import type { D6Roller } from '@/utils/gameplay/diceTypes';

import {
  adaptUnit,
  adaptUnitFromData,
} from '@/engine/adapters/CompendiumAdapter';
import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { InteractiveSession } from '@/engine/InteractiveSession';
import {
  deriveAdaptedUnitsFromSession,
  detachCustomCombatSnapshot,
  isCustomCombatUnitRef,
} from '@/engine/InteractiveSession.recovery';
import { getNodeCanonicalUnitService } from '@/services/units/NodeCanonicalUnitService';
import { readServerCustomCombatDefinition } from '@/services/units/serverCustomCombatDefinition';
import { SeededD6Roller, SeededRandom } from '@/simulation/core';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';
import { Facing } from '@/types/gameplay/HexGridInterfaces';
import { seatLayoutSpec } from '@/types/multiplayer/Lobby';
import { logger } from '@/utils/logger';

import type { IMatchMeta, IMatchUnitBootstrapEntry } from './IMatchStore';
import type { IMatchHostBootstrap } from './ServerMatchHostBootstrap';

const DEFAULT_PLAYER_UNIT_REF = 'atlas-as7-d';
const DEFAULT_OPPONENT_UNIT_REF = 'marauder-mad-3r';

function sideForSeatSide(sideIndex: number): GameSide {
  return sideIndex === 0 ? GameSide.Player : GameSide.Opponent;
}

function sideSlug(side: GameSide): string {
  return side === GameSide.Player ? 'player' : 'opponent';
}

function defaultUnitRef(side: GameSide): string {
  return side === GameSide.Player
    ? DEFAULT_PLAYER_UNIT_REF
    : DEFAULT_OPPONENT_UNIT_REF;
}

function startHexFor(
  side: GameSide,
  sideSeatIndex: number,
  mapRadius: number,
): IHexCoordinate {
  const qOffset = Math.max(0, Math.min(2, mapRadius - 1));
  const q = side === GameSide.Player ? -qOffset : qOffset;
  const desiredR =
    side === GameSide.Player ? sideSeatIndex - 1 : 1 - sideSeatIndex;
  const minR = Math.max(-mapRadius, -q - mapRadius);
  const maxR = Math.min(mapRadius, -q + mapRadius);
  return {
    q,
    r: Math.max(minR, Math.min(maxR, desiredR)),
  };
}

/**
 * Default units for a layout's playing seats.
 * WHAT: one bootstrap entry per layout human/AI slot, never per occupant.
 * WHY: a spectator-seated GM owns no units; the two 1v1 players still spawn.
 */
export function buildDefaultMatchUnitBootstrap(
  layout: TeamLayout | undefined,
  mapRadius: number,
): readonly IMatchUnitBootstrapEntry[] {
  const spec = seatLayoutSpec(layout ?? '1v1');
  const entries: IMatchUnitBootstrapEntry[] = [];
  const sideCounts = new Map<GameSide, number>();

  spec.sides.forEach((_seatSide, sideIndex) => {
    const gameSide = sideForSeatSide(sideIndex);
    for (let seat = 1; seat <= spec.seatsPerSide; seat += 1) {
      const sideSeatIndex = (sideCounts.get(gameSide) ?? 0) + 1;
      sideCounts.set(gameSide, sideSeatIndex);
      const unitRef = defaultUnitRef(gameSide);
      const slug = sideSlug(gameSide);
      entries.push({
        unitId: `${slug}-${sideSeatIndex}-${unitRef}`,
        unitRef,
        side: gameSide,
        pilotRef: `${slug}-${sideSeatIndex}-pilot`,
        gunnery: 4,
        piloting: 5,
        startHex: startHexFor(gameSide, sideSeatIndex, mapRadius),
      });
    }
  });

  return entries;
}

function gameSideFromBootstrap(
  side: IMatchUnitBootstrapEntry['side'],
): GameSide {
  return side === 'opponent' ? GameSide.Opponent : GameSide.Player;
}

function gameUnitFromAdapted(
  entry: IMatchUnitBootstrapEntry,
  side: GameSide,
  adapted: IAdaptedUnit,
): IGameUnit {
  return {
    id: entry.unitId,
    name: entry.name ?? adapted.id,
    side,
    unitRef: entry.unitRef,
    pilotRef: entry.pilotRef ?? `${entry.unitId}-pilot`,
    gunnery: entry.gunnery ?? 4,
    piloting: entry.piloting ?? 5,
    heatSinks: adapted.heatSinks,
    heatSinkType: adapted.heatSinkType,
    movementMode: adapted.movementMode,
    gyroType: adapted.gyroType,
    tonnage: adapted.tonnage,
    initiativeEquipment: adapted.initiativeEquipment,
    c3Equipment: adapted.c3Equipment,
    ...(adapted.customUnitDefinition
      ? {
          customUnitDefinition: detachCustomCombatSnapshot(
            adapted.customUnitDefinition,
          ),
        }
      : {}),
  };
}

export class MatchUnitReferenceError extends Error {
  constructor(readonly unitRef: string) {
    super(`Unit bootstrap failed: unknown unitRef ${unitRef}`);
    this.name = 'MatchUnitReferenceError';
  }
}

async function adaptBootstrapUnit(
  entry: IMatchUnitBootstrapEntry,
): Promise<{ readonly adapted: IAdaptedUnit; readonly gameUnit: IGameUnit }> {
  const side = gameSideFromBootstrap(entry.side);
  const adapted = await adaptUnit(
    entry.unitRef,
    {
      side,
      position: entry.startHex,
      facing: side === GameSide.Player ? Facing.North : Facing.South,
      gunnery: entry.gunnery,
      piloting: entry.piloting,
    },
    readServerCustomCombatDefinition,
  );
  if (!adapted) {
    throw new MatchUnitReferenceError(entry.unitRef);
  }
  const adaptedWithRuntimeId: IAdaptedUnit = {
    ...adapted,
    id: entry.unitId,
    side,
    position: entry.startHex ?? adapted.position,
    facing: side === GameSide.Player ? Facing.North : Facing.South,
  };
  return {
    adapted: adaptedWithRuntimeId,
    gameUnit: gameUnitFromAdapted(entry, side, adaptedWithRuntimeId),
  };
}

export async function buildMatchHostBootstrapFromMeta(
  meta: IMatchMeta,
  options: { readonly diceSeed?: number } = {},
): Promise<IMatchHostBootstrap> {
  const entries = meta.unitBootstrap ?? [];
  const adapted = await Promise.all(entries.map(adaptBootstrapUnit));
  const playerUnits = adapted
    .filter((entry) => entry.gameUnit.side === GameSide.Player)
    .map((entry) => entry.adapted);
  const opponentUnits = adapted
    .filter((entry) => entry.gameUnit.side === GameSide.Opponent)
    .map((entry) => entry.adapted);

  return {
    mapRadius: meta.config.mapRadius,
    turnLimit: meta.config.turnLimit,
    random: new SeededRandom(0xc0ffee),
    grid: createMinimalGrid(meta.config.mapRadius),
    playerUnits,
    opponentUnits,
    gameUnits: adapted.map((entry) => entry.gameUnit),
    diceSeed: options.diceSeed,
  };
}

/**
 * WHAT: a unit the engine recovers from its recorded custom snapshot or
 * authoritative custom definition, never from the canonical catalog.
 * WHY: those keep the engine path; only catalog units change source.
 */
function isEngineRecoveredUnit(gameUnit: IGameUnit): boolean {
  return (
    gameUnit.customUnitDefinition !== undefined ||
    isCustomCombatUnitRef(gameUnit.unitRef)
  );
}

/**
 * WHAT: per-unit adapted state for a recovered session, in session order,
 * with canonical units read from the bundled catalog files on disk.
 * WHY: boot recovery runs before server.js listens, so the fetch catalog
 * (HTTP to this same server) cannot answer and every unit was skipped
 * (FINDING-A1-REV-1). Same adapter and skip rule as the engine path.
 */
export async function deriveServerAdaptedUnits(
  session: IGameSession,
  readCustom: ReadCustomCombatDefinition = readServerCustomCombatDefinition,
): Promise<IAdaptedUnit[]> {
  const engineUnits = await deriveAdaptedUnitsFromSession(
    { ...session, units: session.units.filter(isEngineRecoveredUnit) },
    readCustom,
  );
  const engineById = new Map(engineUnits.map((unit) => [unit.id, unit]));
  const catalog = getNodeCanonicalUnitService();
  const adapted: IAdaptedUnit[] = [];
  for (const gameUnit of session.units) {
    if (isEngineRecoveredUnit(gameUnit)) {
      const unit = engineById.get(gameUnit.id);
      if (unit) adapted.push(unit);
      continue;
    }
    const fullUnit = catalog.getByIdSync(gameUnit.unitRef);
    if (fullUnit === null) {
      logger.warn(
        `[matchUnitBootstrap] unit '${gameUnit.id}' (unitRef '${gameUnit.unitRef}') ` +
          'not found in the server canonical catalog - skipping',
      );
      continue;
    }
    adapted.push({
      ...adaptUnitFromData(fullUnit, { side: gameUnit.side }),
      id: gameUnit.id,
    });
  }
  return adapted;
}

/**
 * WHAT: the recovered InteractiveSession for a replayed match session.
 * WHY: InteractiveSession.fromSessionAsync reads catalog units over HTTP;
 * this adopts the same session with disk-read units and the same reseed
 * rule (config.seed when finite, else the legacy 0xc0ffee stream).
 */
export async function recoverServerInteractiveSession(
  session: IGameSession,
  readCustom: ReadCustomCombatDefinition = readServerCustomCombatDefinition,
  d6Roller?: D6Roller,
): Promise<InteractiveSession> {
  const adapted = await deriveServerAdaptedUnits(session, readCustom);
  const seed = session.config.seed;
  const seeded = typeof seed === 'number' && Number.isFinite(seed);
  return InteractiveSession.fromHydratedSession(session, {
    random: new SeededRandom(seeded ? seed : 0xc0ffee),
    d6Roller:
      d6Roller ?? (seeded ? new SeededD6Roller(seed).asD6Roller() : undefined),
    playerUnits: adapted.filter((unit) => unit.side === GameSide.Player),
    opponentUnits: adapted.filter((unit) => unit.side === GameSide.Opponent),
  });
}
