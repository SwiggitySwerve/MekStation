import type { IDeriveCombatOutcomeOptions } from '@/lib/combat/outcome/combatOutcome';
import type { IGameOutcome } from '@/services/game-resolution/GameOutcomeCalculator';
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';
import type { IHexCoordinate } from '@/types/gameplay/HexGridInterfaces';
import type { D6Roller, DiceRoller } from '@/utils/gameplay/diceTypes';
import type { IPhysicalAttackContext } from '@/utils/gameplay/gameSession';

import { deriveCombatOutcome } from '@/lib/combat/outcome/combatOutcome';
import {
  calculateGameOutcome,
  isGameEnded,
} from '@/services/game-resolution/GameOutcomeCalculator';
import { CombatNotCompleteError } from '@/types/combat/CombatOutcome';
import {
  GameSide,
  GameStatus,
  type IGameState,
} from '@/types/gameplay/GameSessionInterfaces';
import { endGame } from '@/utils/gameplay/gameSession';

import type { IInteractiveSessionRuntimeContext } from './InteractiveSession.runtime';

import { runInteractiveSessionAITurn } from './InteractiveSession.ai';
import { finalizeSessionOutcome } from './InteractiveSession.outcome';
import { advanceInteractiveSessionPhase } from './InteractiveSession.phases';
import {
  d6RollerForResolvers,
  diceRollerForResolvers,
  environmentHeatEffectAt,
  physicalContextByUnit,
  waterDepthAt,
} from './InteractiveSession.resolvers';
import {
  appendAndPersistInteractiveSessionEvent,
  applyBattlefieldWreckTerrainForNewInteractiveSessionEvents,
} from './InteractiveSession.sessionEvents';

export function d6RollerForInteractiveSessionResolvers(
  context: IInteractiveSessionRuntimeContext,
): D6Roller | undefined {
  return d6RollerForResolvers(context.d6Roller);
}

export function diceRollerForInteractiveSessionResolvers(
  context: IInteractiveSessionRuntimeContext,
): DiceRoller | undefined {
  return diceRollerForResolvers(context.d6Roller);
}

export function physicalContextByInteractiveSessionUnit(
  context: IInteractiveSessionRuntimeContext,
): Map<string, IPhysicalAttackContext> {
  return physicalContextByUnit(
    context.getSession(),
    context.tonnageByUnit,
    context.pilotingByUnit,
    context.grid,
  );
}

export function waterDepthAtInteractiveSession(
  context: IInteractiveSessionRuntimeContext,
  position: IHexCoordinate,
): number {
  return waterDepthAt(context.grid, position);
}

export function environmentHeatEffectAtInteractiveSession(
  context: IInteractiveSessionRuntimeContext,
  position: IHexCoordinate,
): number {
  return environmentHeatEffectAt(context.grid, position);
}

export function elevationDifferenceBetweenInteractiveSessionUnits(
  context: IInteractiveSessionRuntimeContext,
  attackerId: string,
  targetId: string,
): number {
  const session = context.getSession();
  const attacker = session.currentState.units[attackerId];
  const target = session.currentState.units[targetId];
  if (!attacker || !target) return 0;
  const attackerHex = context.grid.hexes.get(
    `${attacker.position.q},${attacker.position.r}`,
  );
  const targetHex = context.grid.hexes.get(
    `${target.position.q},${target.position.r}`,
  );
  return (targetHex?.elevation ?? 0) - (attackerHex?.elevation ?? 0);
}

export function advanceInteractiveSession(
  context: IInteractiveSessionRuntimeContext,
): void {
  const sessionBeforePhase = context.getSession();
  advanceInteractiveSessionPhase({
    getSession: context.getSession,
    setSession: context.setSession,
    d6RollerForResolvers: () => d6RollerForInteractiveSessionResolvers(context),
    diceRollerForResolvers: () =>
      diceRollerForInteractiveSessionResolvers(context),
    physicalContextByUnit: () =>
      physicalContextByInteractiveSessionUnit(context),
    grid: () => context.grid,
    waterDepthAt: (position) =>
      waterDepthAtInteractiveSession(context, position),
    environmentHeatEffectAt: (position) =>
      environmentHeatEffectAtInteractiveSession(context, position),
    isGameOver: () => isInteractiveSessionGameOver(context),
  });
  applyBattlefieldWreckTerrainForNewInteractiveSessionEvents(
    context,
    sessionBeforePhase,
  );
  tryFinalizeAndPublishInteractiveSession(context);
}

export function runInteractiveSessionAI(
  context: IInteractiveSessionRuntimeContext,
  side: GameSide,
): void {
  runInteractiveSessionAITurn({
    side,
    getSession: context.getSession,
    setSession: context.setSession,
    appendAndPersistEvent: (event) =>
      appendAndPersistInteractiveSessionEvent(context, event),
    weaponsByUnit: context.weaponsByUnit,
    movementByUnit: context.movementByUnit,
    gunneryByUnit: context.gunneryByUnit,
    pilotingByUnit: context.pilotingByUnit,
    tonnageByUnit: context.tonnageByUnit,
    grid: context.grid,
    botPlayer: context.botPlayer,
  });
  tryFinalizeAndPublishInteractiveSession(context);
}

export function tryFinalizeAndPublishInteractiveSession(
  context: IInteractiveSessionRuntimeContext,
): void {
  if (context.getOutcomePublished()) return;
  if (!isInteractiveSessionGameOver(context)) return;

  const result = finalizeSessionOutcome({
    session: context.getSession(),
    gameConfig: context.gameConfig,
    startedAt: context.startedAt,
    linkage: context.linkage,
  });
  context.setSession(result.session);
  context.setOutcomePublished(result.published);
}

export function applyCorrectedInteractiveSessionState(
  context: IInteractiveSessionRuntimeContext,
  newState: IGameState,
): void {
  context.setSession({
    ...context.getSession(),
    currentState: newState,
    updatedAt: new Date().toISOString(),
  });
  tryFinalizeAndPublishInteractiveSession(context);
}

export function concedeInteractiveSession(
  context: IInteractiveSessionRuntimeContext,
  side: GameSide,
): void {
  const session = context.getSession();
  if (session.currentState.status !== GameStatus.Active) {
    throw new Error('Game is not active');
  }
  const winner = side === GameSide.Player ? GameSide.Opponent : GameSide.Player;
  context.setSession(endGame(session, winner, 'concede'));
  tryFinalizeAndPublishInteractiveSession(context);
}

export function abortInteractiveSession(
  context: IInteractiveSessionRuntimeContext,
): void {
  const session = context.getSession();
  if (session.currentState.status !== GameStatus.Active) {
    throw new Error('Game is not active');
  }
  context.setSession(endGame(session, 'draw', 'aborted'));
  tryFinalizeAndPublishInteractiveSession(context);
}

export function hasInteractiveSessionPublishedOutcome(
  context: IInteractiveSessionRuntimeContext,
): boolean {
  return context.getOutcomePublished();
}

export function isInteractiveSessionGameOver(
  context: IInteractiveSessionRuntimeContext,
): boolean {
  const state = context.getSession().currentState;
  return (
    state.status === GameStatus.Completed ||
    isGameEnded(state, context.gameConfig)
  );
}

export function getInteractiveSessionResult(
  context: IInteractiveSessionRuntimeContext,
): IGameOutcome | null {
  if (!isInteractiveSessionGameOver(context)) return null;
  const session = context.getSession();
  return calculateGameOutcome({
    state: session.currentState,
    events: session.events,
    config: context.gameConfig,
    startedAt: context.startedAt,
    endedAt: new Date().toISOString(),
  });
}

export function getInteractiveSessionOutcome(
  context: IInteractiveSessionRuntimeContext,
  options: IDeriveCombatOutcomeOptions = {},
): ICombatOutcome {
  if (!isInteractiveSessionGameOver(context)) {
    throw new CombatNotCompleteError();
  }
  tryFinalizeAndPublishInteractiveSession(context);
  const merged: IDeriveCombatOutcomeOptions = {
    contractId: options.contractId ?? context.linkage.contractId ?? undefined,
    scenarioId: options.scenarioId ?? context.linkage.scenarioId ?? undefined,
    capturedAt: options.capturedAt,
  };
  return deriveCombatOutcome(context.getSession(), merged);
}
