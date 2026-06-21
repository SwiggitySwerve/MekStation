import type { ICombatOutcome } from '@/types/combat/CombatOutcome';

import {
  publishCombatOutcome,
  type ICombatOutcomeReadyEvent,
} from '@/engine/combatOutcomeBus';
import { deriveCombatOutcome } from '@/lib/combat/outcome/combatOutcome';
import { calculateGameOutcome } from '@/services/game-resolution/GameOutcomeCalculator';
import {
  GameSide,
  GameStatus,
  type IGameConfig,
  type IGameSession,
} from '@/types/gameplay/GameSessionInterfaces';
import { endGame } from '@/utils/gameplay/gameSession';

import type { IInteractiveSessionLinkage } from './InteractiveSession.types';

export interface IFinalizeSessionOutcomeInput {
  readonly session: IGameSession;
  readonly gameConfig: IGameConfig;
  readonly startedAt: string;
  readonly linkage: IInteractiveSessionLinkage;
}

export interface IFinalizeSessionOutcomeResult {
  readonly session: IGameSession;
  readonly published: boolean;
}

export function finalizeSessionOutcome(
  input: IFinalizeSessionOutcomeInput,
): IFinalizeSessionOutcomeResult {
  let session = input.session;

  if (session.currentState.status === GameStatus.Active) {
    const result = calculateGameOutcome({
      state: session.currentState,
      events: session.events,
      config: input.gameConfig,
      startedAt: input.startedAt,
      endedAt: new Date().toISOString(),
    });
    const reason: 'destruction' | 'concede' | 'turn_limit' | 'objective' =
      result.reason === 'concede'
        ? 'concede'
        : result.reason === 'turn_limit'
          ? 'turn_limit'
          : result.reason === 'objective'
            ? 'objective'
            : 'destruction';
    const winner: GameSide | 'draw' =
      result.winner === 'draw' ? 'draw' : (result.winner as GameSide);
    session = endGame(session, winner, reason);
  }

  if (session.currentState.status !== GameStatus.Completed) {
    return { session, published: false };
  }

  let outcome: ICombatOutcome;
  try {
    outcome = deriveCombatOutcome(session, {
      contractId: input.linkage.contractId ?? undefined,
      scenarioId: input.linkage.scenarioId ?? undefined,
    });
  } catch {
    return { session, published: false };
  }

  const event: ICombatOutcomeReadyEvent = {
    matchId: outcome.matchId,
    outcome,
  };
  return { session, published: publishCombatOutcome(event) };
}
