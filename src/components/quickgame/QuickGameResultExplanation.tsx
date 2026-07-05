import type React from 'react';

import type { IGameOutcome } from '@/services/game-resolution';
import type {
  IQuickGameInstance,
  IQuickGameUnit,
} from '@/types/quickgame/QuickGameInterfaces';

import { Card } from '@/components/ui';
import { GameEventType } from '@/types/gameplay';

interface ResultExplanation {
  readonly outcomeLabel: string;
  readonly endCondition: string;
  readonly turnsPlayed: number;
  readonly casualtiesLabel: string;
  readonly summary: string;
}

export function ResultExplanationCard({
  explanation,
}: {
  readonly explanation: ResultExplanation;
}): React.ReactElement {
  return (
    <Card>
      <div className="border-b border-gray-700 p-4">
        <h3 className="font-medium text-white">Result Explanation</h3>
      </div>
      <div className="space-y-4 p-4">
        <p className="text-sm text-gray-300">{explanation.summary}</p>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ExplanationMetric label="Outcome" value={explanation.outcomeLabel} />
          <ExplanationMetric
            label="End Condition"
            value={explanation.endCondition}
          />
          <ExplanationMetric
            label="Turns Played"
            value={String(explanation.turnsPlayed)}
          />
          <ExplanationMetric
            label="Destroyed Units"
            value={explanation.casualtiesLabel}
          />
        </dl>
      </div>
    </Card>
  );
}

function ExplanationMetric({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}): React.ReactElement {
  return (
    <div>
      <dt className="mb-1 text-xs tracking-wide text-gray-500 uppercase">
        {label}
      </dt>
      <dd className="text-white">{value}</dd>
    </div>
  );
}

export function buildResultExplanation(
  game: IQuickGameInstance,
  outcome: IGameOutcome | null,
): ResultExplanation {
  const winner = outcome?.winner ?? game.winner ?? 'draw';
  const outcomeLabel = formatWinnerLabel(winner);
  const endCondition = formatEndCondition(
    outcome?.description,
    game.victoryReason,
  );
  const turnsPlayed = outcome?.turnsPlayed ?? game.turn;
  const playerDestroyed =
    outcome?.playerUnitsDestroyed ?? countDestroyed(game.playerForce.units);
  const opponentDestroyed =
    outcome?.opponentUnitsDestroyed ??
    countDestroyed(game.opponentForce?.units ?? []);
  const casualtiesLabel = `${playerDestroyed} friendly / ${opponentDestroyed} enemy`;

  return {
    outcomeLabel,
    endCondition,
    turnsPlayed,
    casualtiesLabel,
    summary: `${outcomeLabel} after ${formatTurnCount(
      turnsPlayed,
    )}. End condition: ${endCondition}. Quick Game resolves the objective by destroyed forces, withdrawals, or the turn-limit end state.`,
  };
}

export function buildKeyMomentFallback(
  game: IQuickGameInstance,
  outcome: IGameOutcome | null,
): string {
  const terminalEvent =
    [...game.events]
      .reverse()
      .find((event) => event.type === GameEventType.GameEnded) ??
    game.events.at(-1);
  const turn = terminalEvent?.turn ?? outcome?.turnsPlayed ?? game.turn;
  const endCondition = formatEndCondition(
    outcome?.description,
    game.victoryReason,
  );

  return `Outcome recorded on turn ${turn}: ${endCondition}. No higher-priority tactical swing was detected in the event log.`;
}

function formatWinnerLabel(
  winner: IGameOutcome['winner'] | IQuickGameInstance['winner'],
): string {
  if (winner === 'player') return 'Victory';
  if (winner === 'opponent') return 'Defeat';
  return 'Draw';
}

function formatEndCondition(
  outcomeDescription: string | undefined,
  victoryReason: string | null,
): string {
  if (outcomeDescription) {
    return outcomeDescription.replace(/\.$/, '');
  }

  if (!victoryReason) {
    return 'battle ended without a recorded reason';
  }

  return victoryReason.replace(/_/g, ' ');
}

function formatTurnCount(turnsPlayed: number): string {
  return `${turnsPlayed} ${turnsPlayed === 1 ? 'turn' : 'turns'}`;
}

function countDestroyed(units: readonly IQuickGameUnit[]): number {
  return units.filter((unit) => unit.isDestroyed).length;
}
