import type { IGameOutcome, ICombatStats } from '@/services/game-resolution';
import type { IDamageAssessment } from '@/services/game-resolution/DamageCalculator';
import type { IGameSession } from '@/types/gameplay';
import type {
  IQuickGameInstance,
  IQuickGameUnit,
} from '@/types/quickgame/QuickGameInterfaces';
import type { BattleState } from '@/types/simulation/BattleState';

import {
  calculateCombatStats,
  calculateGameOutcome,
  assessUnitDamage,
} from '@/services/game-resolution';
import { GameSide } from '@/types/gameplay';

export interface QuickGameUnitRow {
  readonly unit: IQuickGameUnit;
  readonly forceType: 'player' | 'opponent';
}

export interface QuickGameResultsViewModel {
  readonly outcome: IGameOutcome | null;
  readonly combatStats: ICombatStats | null;
  readonly battleState: BattleState | null;
  readonly unitDamageMap: ReadonlyMap<string, IDamageAssessment>;
  readonly allUnits: readonly QuickGameUnitRow[];
  readonly damageUnits: readonly IQuickGameUnit[];
}

export function buildReplayLibraryPayload(game: IQuickGameInstance): string {
  return JSON.stringify({
    gameId: game.id,
    events: game.events,
    winner: game.winner,
    aiVariant: game.scenarioConfig.enemyFaction ?? '',
  });
}

export function deriveQuickGameResults(
  session: IGameSession | null,
  game: IQuickGameInstance | null,
): QuickGameResultsViewModel {
  const damageUnits = listQuickGameUnits(game);

  return {
    outcome: deriveOutcome(session, game),
    combatStats: deriveCombatStats(session),
    battleState: deriveBattleState(session, game, damageUnits),
    unitDamageMap: deriveUnitDamageMap(session, game, damageUnits),
    allUnits: listUnitRows(game),
    damageUnits,
  };
}

function deriveOutcome(
  session: IGameSession | null,
  game: IQuickGameInstance | null,
): IGameOutcome | null {
  if (!session || !game) return null;

  return calculateGameOutcome({
    state: session.currentState,
    events: session.events,
    config: session.config,
    startedAt: game.startedAt,
    endedAt: game.endedAt ?? new Date().toISOString(),
  });
}

function deriveCombatStats(session: IGameSession | null): ICombatStats | null {
  if (!session) return null;

  return calculateCombatStats(session.events, session.currentState.units);
}

function deriveBattleState(
  session: IGameSession | null,
  game: IQuickGameInstance | null,
  allQuickUnits: readonly IQuickGameUnit[],
): BattleState | null {
  if (!session || !game) return null;

  const playerUnitIds = new Set(
    game.playerForce.units.map((unit) => unit.instanceId),
  );

  return {
    units: allQuickUnits.map((unit) => {
      const unitState = session.currentState.units[unit.instanceId];

      return {
        id: unitState?.id ?? unit.instanceId,
        name: unit.name,
        side: playerUnitIds.has(unit.instanceId)
          ? GameSide.Player
          : GameSide.Opponent,
        bv: unit.bv,
        weaponIds: [],
        initialArmor: unit.maxArmor,
        initialStructure: unit.maxStructure,
      };
    }),
  };
}

function deriveUnitDamageMap(
  session: IGameSession | null,
  game: IQuickGameInstance | null,
  allQuickUnits: readonly IQuickGameUnit[],
): ReadonlyMap<string, IDamageAssessment> {
  const map = new Map<string, IDamageAssessment>();
  if (!session || !game) return map;

  const sessionUnits = Object.values(session.currentState.units);

  for (const quickUnit of allQuickUnits) {
    const unitState = sessionUnits.find(
      (unit) =>
        unit.id === quickUnit.instanceId || unit.id === quickUnit.sourceUnitId,
    );

    if (unitState) {
      map.set(
        quickUnit.instanceId,
        assessUnitDamage(unitState, quickUnit.maxArmor, quickUnit.maxStructure),
      );
    }
  }

  return map;
}

function listQuickGameUnits(
  game: IQuickGameInstance | null,
): readonly IQuickGameUnit[] {
  if (!game) return [];

  return [...game.playerForce.units, ...(game.opponentForce?.units ?? [])];
}

function listUnitRows(
  game: IQuickGameInstance | null,
): readonly QuickGameUnitRow[] {
  if (!game) return [];

  return [
    ...game.playerForce.units.map((unit) => ({
      unit,
      forceType: 'player' as const,
    })),
    ...(game.opponentForce?.units.map((unit) => ({
      unit,
      forceType: 'opponent' as const,
    })) ?? []),
  ];
}
