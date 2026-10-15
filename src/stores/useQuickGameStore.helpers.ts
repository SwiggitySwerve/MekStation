import type { IAdaptedUnit } from '@/engine/types';
import type {
  IQuickGameInstance,
  IQuickGameUnit,
} from '@/types/quickgame/QuickGameInterfaces';

import { adaptUnit } from '@/engine/adapters/CompendiumAdapter';
import {
  GameEventType,
  GameSide,
  GameStatus,
  type IGameSession,
} from '@/types/gameplay';
import { QuickGameStep } from '@/types/quickgame/QuickGameInterfaces';
import { getGameEndedPayload } from '@/utils/gameplay/eventPayloads';

export function getQuickGameCompletion(
  game: IQuickGameInstance | null,
  expectedGameId: string,
  session: IGameSession | null,
): {
  winner: 'player' | 'opponent' | 'draw';
  reason: string;
  endedAt: string;
} | null {
  if (
    !game ||
    game.id !== expectedGameId ||
    game.status !== GameStatus.Active ||
    game.step !== QuickGameStep.Playing ||
    !session ||
    game.activeTacticalSession?.id !== (session.matchId ?? session.id) ||
    session.currentState.status !== GameStatus.Completed ||
    !session.currentState.result
  )
    return null;

  const ended = session.events.find(
    (event) => event.type === GameEventType.GameEnded,
  );
  const result = ended && getGameEndedPayload(ended);
  if (
    !ended ||
    ended.gameId !== session.id ||
    !result ||
    result.winner !== session.currentState.result.winner ||
    result.reason !== session.currentState.result.reason
  )
    return null;

  return {
    winner: quickGameWinner(result.winner),
    reason: result.reason,
    endedAt: ended.timestamp,
  };
}

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
