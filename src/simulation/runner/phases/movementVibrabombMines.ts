import type { D6Roller } from '@/utils/gameplay/hitLocation';

import {
  GamePhase,
  type IGameEvent,
  type IGameState,
  type IHexCoordinate,
  type IRepresentedMinefieldState,
} from '@/types/gameplay';
import { hexDistance, hexEquals, keyToCoord } from '@/utils/gameplay/hexMath';

import {
  applyVibrabombDamageToBattleMech,
  isBattleMechLikeUnitType,
} from './movementMineDamage';
import { applyRepresentedMinefieldPostDetonation } from './movementMinefieldState';

export function applyRepresentedVibrabombMovementEffects(options: {
  currentState: IGameState;
  events: IGameEvent[];
  gameId: string;
  unitId: string;
  to: IHexCoordinate;
  phase: GamePhase;
  d6Roller: D6Roller;
  triggeredVibrabombCoords: Set<string>;
}): IGameState {
  const {
    d6Roller,
    events,
    gameId,
    phase,
    to,
    triggeredVibrabombCoords,
    unitId,
  } = options;
  let currentState = options.currentState;
  const unit = currentState.units[unitId];
  if (!unit || !isBattleMechLikeUnitType(unit.unitType)) return currentState;

  const unitTonnage = Math.trunc(unit.tonnage ?? Number.NaN);
  if (!Number.isFinite(unitTonnage)) return currentState;

  for (const [coordKey, minefield] of Object.entries(
    currentState.minefields ?? {},
  )) {
    if (
      triggeredVibrabombCoords.has(coordKey) ||
      !isRepresentedVibrabombMinefield(minefield)
    ) {
      continue;
    }

    const setting = representedVibrabombSetting(minefield);
    const density = representedVibrabombDamageDensity(minefield);
    if (setting === undefined || density === undefined) continue;
    if (unitTonnage <= setting - 10) continue;

    const mineCoord = keyToCoord(coordKey);
    const effectiveDistance = Math.trunc((unitTonnage - setting) / 10);
    const actualDistance = hexDistance(to, mineCoord);
    if (actualDistance > effectiveDistance) continue;

    triggeredVibrabombCoords.add(coordKey);
    const damagedUnitIds = representedVibrabombDamageTargetUnitIds(
      currentState,
      unitId,
      mineCoord,
      actualDistance === 0,
    );
    for (const targetUnitId of damagedUnitIds) {
      currentState = applyVibrabombDamageToBattleMech({
        currentState,
        events,
        gameId,
        unitId: targetUnitId,
        damage: density,
        phase,
        d6Roller,
      });
    }

    currentState = applyRepresentedMinefieldPostDetonation({
      currentState,
      events,
      gameId,
      phase,
      unitId,
      coord: mineCoord,
      minefield,
      d6Roller,
    });
  }

  return currentState;
}

function isRepresentedVibrabombMinefield(
  minefield: IRepresentedMinefieldState,
): boolean {
  return minefield.type === 'vibrabomb' && minefield.detonated !== true;
}

function representedVibrabombSetting(
  minefield: IRepresentedMinefieldState,
): number | undefined {
  const setting = Math.trunc(minefield.setting ?? Number.NaN);
  return Number.isFinite(setting) && setting > 0 ? setting : undefined;
}

function representedVibrabombDamageDensity(
  minefield: IRepresentedMinefieldState,
): number | undefined {
  const density = Math.trunc(minefield.density ?? Number.NaN);
  return Number.isFinite(density) && density > 0 ? density : undefined;
}

function representedVibrabombDamageTargetUnitIds(
  state: IGameState,
  movingUnitId: string,
  mineCoord: IHexCoordinate,
  movingUnitInMineHex: boolean,
): readonly string[] {
  const targetIds = new Set<string>();
  if (movingUnitInMineHex) targetIds.add(movingUnitId);

  for (const [candidateId, candidate] of Object.entries(state.units)) {
    if (
      candidate.destroyed ||
      candidate.isAirborne ||
      !isBattleMechLikeUnitType(candidate.unitType) ||
      (candidateId === movingUnitId && !movingUnitInMineHex) ||
      !hexEquals(candidate.position, mineCoord)
    ) {
      continue;
    }
    targetIds.add(candidateId);
  }

  return Array.from(targetIds);
}
