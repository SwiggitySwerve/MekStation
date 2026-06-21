import type { InteractiveSession } from '@/engine/GameEngine';

import { hexTerrainFromGrid } from '@/engine/GameEngine.helpers';
import { useGameplayStore } from '@/stores/useGameplayStore';
import {
  GamePhase,
  GameSide,
  type IGameSession,
  type IHexTerrain,
  type IUnitToken,
} from '@/types/gameplay';

import { unitStateToToken } from './SpectatorViewPanels';

export type SpectatorSpeed = 1 | 2 | 4;

type UnitInfoLookup = Record<string, { name: string; side: GameSide }>;

function markGameOver(onGameOver: () => void): false {
  onGameOver();
  return false;
}

function advanceIfPhase(
  interactiveSession: InteractiveSession,
  phase: GamePhase,
): void {
  if (interactiveSession.getState().phase === phase) {
    interactiveSession.advancePhase();
  }
}

function runAiPhase(
  interactiveSession: InteractiveSession,
  phase: GamePhase,
): void {
  if (interactiveSession.getState().phase !== phase) return;
  interactiveSession.runAITurn(GameSide.Player);
  interactiveSession.runAITurn(GameSide.Opponent);
  interactiveSession.advancePhase();
}

export function runOneSpectatorTurn(
  interactiveSession: InteractiveSession,
  onGameOver: () => void,
): boolean {
  if (interactiveSession.isGameOver()) {
    return markGameOver(onGameOver);
  }

  advanceIfPhase(interactiveSession, GamePhase.Initiative);
  runAiPhase(interactiveSession, GamePhase.Movement);
  runAiPhase(interactiveSession, GamePhase.WeaponAttack);
  runAiPhase(interactiveSession, GamePhase.PhysicalAttack);
  advanceIfPhase(interactiveSession, GamePhase.Heat);
  advanceIfPhase(interactiveSession, GamePhase.End);

  if (interactiveSession.isGameOver()) {
    return markGameOver(onGameOver);
  }

  useGameplayStore.setState({
    session: interactiveSession.getSession(),
  });

  return true;
}

export function buildUnitInfoLookup(
  session: IGameSession | null,
): UnitInfoLookup {
  if (!session) return {};

  const lookup: UnitInfoLookup = {};
  for (const unit of session.units) {
    lookup[unit.id] = { name: unit.name, side: unit.side };
  }
  return lookup;
}

export function buildSpectatorTokens(
  session: IGameSession | null,
  unitInfoLookup: UnitInfoLookup,
): IUnitToken[] {
  if (!session) return [];

  return Object.entries(session.currentState.units).map(([unitId, state]) => {
    const unitInfo = unitInfoLookup[unitId] ?? {
      name: 'Unknown',
      side: GameSide.Player,
    };
    return unitStateToToken(unitId, state, unitInfo);
  });
}

export function terrainForInteractiveSession(
  interactiveSession: InteractiveSession | null,
): readonly IHexTerrain[] {
  return interactiveSession
    ? hexTerrainFromGrid(interactiveSession.getGrid())
    : [];
}
