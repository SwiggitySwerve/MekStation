import type { IAdaptedUnit } from '@/engine/types';
import type {
  IQuickGameInstance,
  IQuickGameUnit,
} from '@/types/quickgame/QuickGameInterfaces';

import { adaptUnit } from '@/engine/adapters/CompendiumAdapter';
import { GameSide, GameStatus } from '@/types/gameplay';
import { QuickGameStep } from '@/types/quickgame/QuickGameInterfaces';

export function quickGameWinner(
  winner: GameSide | 'draw' | undefined,
): 'player' | 'opponent' | 'draw' {
  return winner === GameSide.Player
    ? 'player'
    : winner === GameSide.Opponent
      ? 'opponent'
      : 'draw';
}

export function completeQuickGame(
  game: IQuickGameInstance,
  winner: 'player' | 'opponent' | 'draw',
  reason: string,
  endedAt: string,
): IQuickGameInstance {
  return {
    ...game,
    status: GameStatus.Completed,
    step: QuickGameStep.Results,
    winner,
    victoryReason: reason,
    endedAt,
  };
}

export async function adaptUnits(
  units: readonly IQuickGameUnit[],
  side: GameSide,
): Promise<IAdaptedUnit[]> {
  const adapted: IAdaptedUnit[] = [];
  for (const unit of units) {
    const result = await adaptUnit(unit.sourceUnitId, {
      side,
      gunnery: unit.gunnery,
      piloting: unit.piloting,
    });
    if (result) {
      // Catalog identity stays in sourceUnitId/unitRef; combat identity must
      // remain per roster instance because RAT generation permits duplicates.
      adapted.push({
        ...result,
        id: unit.instanceId,
      });
    }
  }
  return adapted;
}
