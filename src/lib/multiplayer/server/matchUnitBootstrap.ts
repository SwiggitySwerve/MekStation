import type { IAdaptedUnit } from '@/engine/types';
import type { IGameUnit } from '@/types/gameplay/GameSessionInterfaces';
import type { IHexCoordinate } from '@/types/gameplay/HexGridInterfaces';
import type { TeamLayout } from '@/types/multiplayer/Lobby';

import { adaptUnit } from '@/engine/adapters/CompendiumAdapter';
import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';
import { Facing } from '@/types/gameplay/HexGridInterfaces';
import { seatLayoutSpec } from '@/types/multiplayer/Lobby';

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
  };
}

async function adaptBootstrapUnit(
  entry: IMatchUnitBootstrapEntry,
): Promise<{ readonly adapted: IAdaptedUnit; readonly gameUnit: IGameUnit }> {
  const side = gameSideFromBootstrap(entry.side);
  const adapted = await adaptUnit(entry.unitRef, {
    side,
    position: entry.startHex,
    facing: side === GameSide.Player ? Facing.North : Facing.South,
    gunnery: entry.gunnery,
    piloting: entry.piloting,
  });
  if (!adapted) {
    throw new Error(`Unit bootstrap failed: unknown unitRef ${entry.unitRef}`);
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
