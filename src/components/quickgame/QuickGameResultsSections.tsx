/**
 * Quick Game Results Sub-Components
 * Extracted sections: ResultBanner, BattleSummary, UnitStatusRow, TimelineEventRow.
 */

import type React from 'react';

import type { ICombatStats, IGameOutcome } from '@/services/game-resolution';
import type { IDamageAssessment } from '@/services/game-resolution/DamageCalculator';
import type { IQuickGameUnit } from '@/types/quickgame/QuickGameInterfaces';
import type { IKeyMoment } from '@/types/simulation-viewer/IKeyMoment';

import { Card } from '@/components/ui';
import { useQuickGameSelector } from '@/stores/useQuickGameStore';
import { GamePhase } from '@/types/gameplay';
import { projectUnitPerformance } from '@/utils/gameplay/combatStatistics';

import { KeyMomentsCard } from './QuickGameKeyMoments';
import {
  buildKeyMomentFallback,
  buildResultExplanation,
  ResultExplanationCard,
} from './QuickGameResultExplanation';
import { EVENT_LABELS, PHASE_LABELS } from './quickGameResults.helpers';

// =============================================================================
// Result Banner
// =============================================================================

interface ResultBannerProps {
  winner: 'player' | 'opponent' | 'draw';
  reason: string | null;
  outcome?: Pick<IGameOutcome, 'description' | 'reason' | 'turnsPlayed'> | null;
  turnLimit?: number | null;
}

export function ResultBanner({
  winner,
  reason,
  outcome,
  turnLimit,
}: ResultBannerProps): React.ReactElement {
  const config = {
    player: {
      title: 'Victory!',
      color: 'from-emerald-600 to-emerald-800',
      textColor: 'text-emerald-100',
      icon: (
        <svg
          className="h-12 w-12"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
          />
        </svg>
      ),
    },
    opponent: {
      title: 'Defeat',
      color: 'from-red-600 to-red-800',
      textColor: 'text-red-100',
      icon: (
        <svg
          className="h-12 w-12"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    draw: {
      title: 'Draw',
      color: 'from-amber-600 to-amber-800',
      textColor: 'text-amber-100',
      icon: (
        <svg
          className="h-12 w-12"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
  };

  const { title, color, textColor, icon } = config[winner];
  const reasonLabel = formatResultReason({ outcome, reason, turnLimit });

  return (
    <div className={`bg-gradient-to-r ${color} rounded-xl p-8 text-center`}>
      <div className={`${textColor} mb-4 flex justify-center`}>{icon}</div>
      <h2 className={`text-3xl font-bold ${textColor} mb-2`}>{title}</h2>
      {reasonLabel && (
        <p className={`${textColor} opacity-80`}>{reasonLabel}</p>
      )}
    </div>
  );
}

function formatResultReason({
  outcome,
  reason,
  turnLimit,
}: {
  readonly outcome:
    | Pick<IGameOutcome, 'description' | 'reason' | 'turnsPlayed'>
    | null
    | undefined;
  readonly reason: string | null;
  readonly turnLimit: number | null | undefined;
}): string | null {
  const effectiveReason = outcome?.reason ?? reason;
  if (!effectiveReason) return null;

  if (effectiveReason === 'turn_limit') {
    const turnsPlayed = outcome?.turnsPlayed;
    if (typeof turnsPlayed === 'number' && turnLimit && turnLimit > 0) {
      return `Turn limit reached (${turnsPlayed}/${turnLimit})`;
    }
    if (typeof turnsPlayed === 'number') {
      return `Turn limit reached (${turnsPlayed})`;
    }
    return 'Turn limit reached';
  }

  if (outcome) {
    return outcome.description;
  }

  return effectiveReason.replace(/_/g, ' ');
}

// =============================================================================
// Battle Summary
// =============================================================================

interface BattleSummaryProps {
  outcome: IGameOutcome | null;
  combatStats: ICombatStats | null;
  keyMoments: readonly IKeyMoment[];
}

export function BattleSummary({
  outcome,
  combatStats,
  keyMoments,
}: BattleSummaryProps): React.ReactElement {
  const game = useQuickGameSelector((state) => state.game);

  if (!game) return <></>;

  const resultExplanation = buildResultExplanation(game, outcome);
  const keyMomentFallback = buildKeyMomentFallback(game, outcome);

  return (
    <div className="space-y-4">
      <ResultExplanationCard explanation={resultExplanation} />

      <Card>
        <div className="border-b border-gray-700 p-4">
          <h3 className="font-medium text-white">Battle Statistics</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="mb-1 text-xs tracking-wide text-gray-500 uppercase">
                Your Losses
              </p>
              <p className="text-white">
                {outcome?.playerUnitsDestroyed ?? 0} destroyed
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs tracking-wide text-gray-500 uppercase">
                Enemy Losses
              </p>
              <p className="text-white">
                {outcome?.opponentUnitsDestroyed ?? 0} destroyed
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs tracking-wide text-gray-500 uppercase">
                Turns Played
              </p>
              <p className="text-white">{outcome?.turnsPlayed ?? game.turn}</p>
            </div>
            <div>
              <p className="mb-1 text-xs tracking-wide text-gray-500 uppercase">
                Duration
              </p>
              <p className="text-white">
                {outcome
                  ? `${Math.floor(outcome.durationMs / 60000)} min`
                  : '—'}
              </p>
            </div>
            {combatStats && (
              <>
                <div>
                  <p className="mb-1 text-xs tracking-wide text-gray-500 uppercase">
                    Damage Dealt
                  </p>
                  <p className="text-cyan-400">
                    {combatStats.playerDamageDealt}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs tracking-wide text-gray-500 uppercase">
                    Damage Taken
                  </p>
                  <p className="text-red-400">
                    {combatStats.opponentDamageDealt}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs tracking-wide text-gray-500 uppercase">
                    Critical Hits
                  </p>
                  <p className="text-amber-400">{combatStats.criticalHits}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      <KeyMomentsCard
        keyMoments={keyMoments}
        emptyStateDetail={keyMomentFallback}
      />
    </div>
  );
}

// =============================================================================
// Unit Status Row
// =============================================================================

export function UnitStatusRow({
  unit,
  forceType,
  events,
  damageAssessment,
}: {
  unit: IQuickGameUnit;
  forceType: 'player' | 'opponent';
  events: readonly { type: string; turn: number; phase: GamePhase }[];
  damageAssessment?: IDamageAssessment;
}): React.ReactElement {
  const performance = projectUnitPerformance(
    events as Parameters<typeof projectUnitPerformance>[0],
    unit.instanceId,
  );

  const statusText = damageAssessment
    ? damageAssessment.status.replace(/_/g, ' ')
    : unit.isDestroyed
      ? 'Destroyed'
      : unit.isWithdrawn
        ? 'Withdrawn'
        : 'Survived';

  const statusColor =
    damageAssessment?.status === 'destroyed' || unit.isDestroyed
      ? 'text-red-400'
      : damageAssessment?.status === 'crippled' ||
          damageAssessment?.status === 'critical'
        ? 'text-amber-400'
        : unit.isWithdrawn
          ? 'text-amber-400'
          : 'text-emerald-400';

  return (
    <div className="border-b border-gray-700/50 px-4 py-3 transition-colors last:border-b-0 hover:bg-gray-800/30">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-white">{unit.name}</p>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            {unit.pilotName && (
              <span className="truncate">{unit.pilotName}</span>
            )}
            <span
              className={
                forceType === 'player' ? 'text-cyan-400' : 'text-red-400'
              }
            >
              {forceType === 'player' ? 'Player' : 'OpFor'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right text-xs text-gray-400">
            <p>{performance.damageDealt} dmg dealt</p>
            <p>{performance.kills} kills</p>
          </div>
          <span className={`text-sm font-medium capitalize ${statusColor}`}>
            {statusText}
          </span>
        </div>
      </div>

      {damageAssessment && !unit.isDestroyed && (
        <div className="mt-2 flex gap-4">
          <div className="flex-1">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-gray-500">Armor</span>
              <span className="text-gray-400">
                {Math.round(100 - damageAssessment.armorDamagePercent)}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-gray-700">
              <div
                className="h-full rounded-full bg-cyan-500 transition-all"
                style={{
                  width: `${100 - damageAssessment.armorDamagePercent}%`,
                }}
              />
            </div>
          </div>
          <div className="flex-1">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-gray-500">Structure</span>
              <span className="text-gray-400">
                {Math.round(100 - damageAssessment.structureDamagePercent)}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-gray-700">
              <div
                className="h-full rounded-full bg-amber-500 transition-all"
                style={{
                  width: `${100 - damageAssessment.structureDamagePercent}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Timeline Event Row
// =============================================================================

export function TimelineEventRow({
  event,
  index,
}: {
  event: {
    type: string;
    turn: number;
    phase: GamePhase;
    timestamp: string;
    actorId?: string;
  };
  index: number;
}): React.ReactElement {
  const label =
    EVENT_LABELS[event.type as keyof typeof EVENT_LABELS] ?? event.type;
  const phaseLabel = PHASE_LABELS[event.phase];

  return (
    <div className="flex items-start gap-3 px-3 py-2 text-sm">
      <span className="w-8 flex-shrink-0 font-mono text-gray-500">
        #{index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <span className="text-white">{label}</span>
        {event.actorId && (
          <span className="ml-2 truncate text-cyan-400">({event.actorId})</span>
        )}
      </div>
      <div className="flex-shrink-0 text-right text-xs text-gray-400">
        <p>Turn {event.turn}</p>
        <p>{phaseLabel}</p>
      </div>
    </div>
  );
}
